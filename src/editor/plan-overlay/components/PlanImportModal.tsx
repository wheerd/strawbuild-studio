import { Button, Flex, Grid, Separator, Text, Tooltip } from '@radix-ui/themes'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import type { StoreyId } from '@/building/model/ids'
import { PlanCalibrationCanvas } from '@/editor/plan-overlay/components/PlanCalibrationCanvas'
import { useFloorPlanActions } from '@/editor/plan-overlay/store'
import type { FloorPlanOverlay, ImagePoint } from '@/editor/plan-overlay/types'
import { calculatePixelDistance } from '@/editor/plan-overlay/utils/calibration'
import { BaseModal } from '@/shared/components/BaseModal'
import { LengthField } from '@/shared/components/LengthField'
import { formatLength } from '@/shared/utils/formatting'

interface PlanImportModalProps {
  floorId: StoreyId
  open: boolean
  onOpenChange: (open: boolean) => void
  existingPlan?: FloorPlanOverlay | null
}

type SelectionMode = 'measure' | 'origin' | 'idle'

const DEFAULT_DISTANCE_MM = 5000

export function PlanImportModal({
  floorId,
  open,
  onOpenChange,
  existingPlan
}: PlanImportModalProps): React.JSX.Element {
  const { importPlan } = useFloorPlanActions()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [referencePoints, setReferencePoints] = useState<ImagePoint[]>([])
  const [originPoint, setOriginPoint] = useState<ImagePoint | null>(null)
  const [realDistance, setRealDistance] = useState<number>(DEFAULT_DISTANCE_MM)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('measure')

  const resetState = useCallback(() => {
    setFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setImageElement(null)
    setReferencePoints([])
    setOriginPoint(null)
    setRealDistance(DEFAULT_DISTANCE_MM)
    setSelectionMode('measure')
  }, [previewUrl])

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open, resetState])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0]
      if (!nextFile) {
        return
      }
      const objectUrl = URL.createObjectURL(nextFile)
      const img = new Image()
      img.onload = () => {
        setImageElement(img)
      }
      img.src = objectUrl

      setFile(nextFile)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(objectUrl)
      setReferencePoints([])
      setOriginPoint(null)
      setSelectionMode('measure')
    },
    [previewUrl]
  )

  const handleDistanceCommit = useCallback(
    (value: number) => {
      setRealDistance(value)
    },
    [setRealDistance]
  )

  const pixelDistance = useMemo(() => {
    if (referencePoints.length < 2) return null
    return calculatePixelDistance(referencePoints[0], referencePoints[1])
  }, [referencePoints])

  const mmPerPixel = useMemo(() => {
    if (!pixelDistance || realDistance <= 0) return null
    return realDistance / pixelDistance
  }, [pixelDistance, realDistance])

  const handleSubmit = useCallback(() => {
    if (!file || !imageElement || referencePoints.length !== 2 || realDistance <= 0) {
      return
    }

    const selectedOriginPoint = originPoint ?? referencePoints[0]

    importPlan({
      floorId,
      file,
      imageSize: { width: imageElement.naturalWidth, height: imageElement.naturalHeight },
      referencePoints: [referencePoints[0], referencePoints[1]],
      realDistanceMm: realDistance,
      origin: {
        image: selectedOriginPoint,
        world: { x: 0, y: 0 }
      }
    })

    onOpenChange(false)
    resetState()
  }, [file, floorId, imageElement, importPlan, onOpenChange, originPoint, realDistance, referencePoints, resetState])

  const canSubmit = Boolean(file && imageElement && referencePoints.length === 2 && realDistance > 0)

  const handleSelectOriginClick = useCallback(() => {
    setSelectionMode(current => (current === 'origin' ? 'measure' : 'origin'))
  }, [])

  const handleOriginPointChange = useCallback(
    (point: ImagePoint | null) => {
      setOriginPoint(point)
      if (point && selectionMode === 'origin') {
        setSelectionMode('measure')
      }
    },
    [selectionMode]
  )

  const showOriginHint = selectionMode === 'origin'

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={existingPlan ? 'Replace plan image' : 'Import plan image'}
      maxWidth="720px"
    >
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="2">
          <Text weight="medium">1. Select floor plan image</Text>
          <Text size="2" color="gray">
            Upload a PNG, JPG, or SVG. The file stays local and is not saved with your project.
          </Text>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </Flex>

        <Separator />

        <Flex direction="column" gap="2">
          <Text weight="medium">2. Calibrate scale</Text>
          <Flex align="baseline" justify="between">
            <Text size="2" color="gray">
              Pick two points with a known distance directly on the image.
            </Text>
            <Flex gap="2">
              <Button
                size="1"
                variant="soft"
                disabled={referencePoints.length === 0}
                onClick={() => setReferencePoints([])}
              >
                Clear points
              </Button>
            </Flex>
          </Flex>

          <PlanCalibrationCanvas
            image={imageElement}
            referencePoints={referencePoints}
            onReferencePointsChange={setReferencePoints}
            originPoint={originPoint}
            onOriginPointChange={handleOriginPointChange}
            mode={selectionMode}
          />

          <Grid columns="1fr 1fr 1fr" align="center" gap="3">
            <Flex direction="row" gap="1" align="center">
              <Text weight="medium" size="2">
                Real Distance
              </Text>
              <LengthField
                value={realDistance}
                onCommit={handleDistanceCommit}
                unit="m"
                min={1}
                max={1000_000}
                precision={3}
                style={{ width: '7em' }}
              />
            </Flex>

            <Flex direction="row" gap="1" align="center" justify="center">
              <Text weight="medium" size="2">
                Pixel distance:
              </Text>
              <Text size="2" color="gray">
                {pixelDistance ? pixelDistance.toFixed(1) + ' px' : 'Select two points'}
              </Text>
            </Flex>

            <Flex direction="row" gap="1" align="center" justify="end">
              <Text weight="medium" size="2">
                Scale:
              </Text>
              <Text size="2" color="gray">
                {mmPerPixel ? `${formatLength(mmPerPixel)} per px` : 'Waiting for calibration'}
              </Text>
            </Flex>
          </Grid>
        </Flex>

        <Separator />

        <Flex direction="column" gap="2">
          <Text weight="medium">3. Position origin (optional)</Text>
          <Text size="2" color="gray">
            Pick a point on the image that should align with the origin in the editor. If you skip this step, the first
            reference point becomes the origin.
          </Text>

          <Flex gap="3" align="center">
            <Tooltip content={showOriginHint ? 'Click on the image to set origin' : 'Pick origin on the image'}>
              <Button
                size="1"
                variant={showOriginHint ? 'solid' : 'soft'}
                onClick={handleSelectOriginClick}
                disabled={!imageElement}
              >
                {showOriginHint ? 'Click image…' : originPoint ? 'Change origin point' : 'Pick origin on image'}
              </Button>
            </Tooltip>

            {originPoint && (
              <Button size="1" variant="ghost" onClick={() => setOriginPoint(null)}>
                Clear origin point
              </Button>
            )}
          </Flex>
        </Flex>

        <Flex justify="between" align="center">
          <Text size="1" color="gray">
            The plan image is only stored in your browser for this floor.
          </Text>
          <Flex gap="2">
            <Button variant="soft" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {existingPlan ? 'Replace plan' : 'Add plan'}
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </BaseModal>
  )
}
