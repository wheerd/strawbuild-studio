import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
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

interface PreviewSource {
  url: string
  revokeOnDispose: boolean
}

export function PlanImportModal({
  floorId,
  open,
  onOpenChange,
  existingPlan
}: PlanImportModalProps): React.JSX.Element {
  const { importPlan, recalibratePlan } = useFloorPlanActions()
  const [file, setFile] = useState<File | null>(null)
  const [previewSource, setPreviewSource] = useState<PreviewSource | null>(null)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [referencePoints, setReferencePoints] = useState<ImagePoint[]>([])
  const [originPoint, setOriginPoint] = useState<ImagePoint | null>(null)
  const [realDistance, setRealDistance] = useState<number>(DEFAULT_DISTANCE_MM)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('measure')

  const clearPreview = useCallback(() => {
    setPreviewSource(prev => {
      if (prev?.revokeOnDispose) {
        URL.revokeObjectURL(prev.url)
      }
      return null
    })
    setImageElement(null)
  }, [])

  const applyPreview = useCallback((url: string, revokeOnDispose: boolean) => {
    setPreviewSource(prev => {
      if (prev?.revokeOnDispose && prev.url !== url) {
        URL.revokeObjectURL(prev.url)
      }
      return { url, revokeOnDispose }
    })
    const img = new Image()
    img.onload = () => setImageElement(img)
    img.src = url
  }, [])

  const resetState = useCallback(() => {
    setFile(null)
    clearPreview()
    setReferencePoints([])
    setOriginPoint(null)
    setRealDistance(existingPlan ? existingPlan.calibration.realDistanceMm : DEFAULT_DISTANCE_MM)
    setSelectionMode('measure')
  }, [clearPreview, existingPlan])

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open, resetState])

  useEffect(() => {
    return () => {
      clearPreview()
    }
  }, [clearPreview])

  useEffect(() => {
    if (!open || !existingPlan || file) {
      return
    }
    applyPreview(existingPlan.image.url, false)
    setReferencePoints(existingPlan.calibration.referencePoints.slice())
    setOriginPoint(existingPlan.origin.image)
    setRealDistance(existingPlan.calibration.realDistanceMm)
    setSelectionMode('measure')
  }, [open, existingPlan, file, applyPreview])

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0]
      if (!nextFile) {
        return
      }
      const objectUrl = URL.createObjectURL(nextFile)
      applyPreview(objectUrl, true)
      setFile(nextFile)
      setReferencePoints([])
      setOriginPoint(null)
      setSelectionMode('measure')
    },
    [applyPreview]
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

  const pixelDistanceWarning = useMemo(() => {
    if (pixelDistance == null || pixelDistance <= 0) {
      return null
    }
    if (pixelDistance < 100) {
      return 'Calibration span is small – consider selecting points farther apart for better accuracy.'
    }
    return null
  }, [pixelDistance])

  const mmPerPixel = useMemo(() => {
    if (!pixelDistance || realDistance <= 0) return null
    return realDistance / pixelDistance
  }, [pixelDistance, realDistance])

  const handleSubmit = useCallback(() => {
    if (!imageElement || referencePoints.length !== 2 || realDistance <= 0 || !pixelDistance || pixelDistance <= 0) {
      return
    }

    const selectedOriginPoint = originPoint ?? referencePoints[0]
    const [firstPoint, secondPoint] = referencePoints as [ImagePoint, ImagePoint]

    if (file) {
      importPlan({
        floorId,
        file,
        imageSize: { width: imageElement.naturalWidth, height: imageElement.naturalHeight },
        referencePoints: [firstPoint, secondPoint],
        realDistanceMm: realDistance,
        origin: {
          image: selectedOriginPoint,
          world: { x: 0, y: 0 }
        }
      })
    } else if (existingPlan) {
      recalibratePlan({
        floorId,
        referencePoints: [firstPoint, secondPoint],
        realDistanceMm: realDistance,
        originImagePoint: selectedOriginPoint
      })
    } else {
      return
    }

    onOpenChange(false)
    resetState()
  }, [
    existingPlan,
    file,
    floorId,
    imageElement,
    importPlan,
    onOpenChange,
    originPoint,
    realDistance,
    recalibratePlan,
    referencePoints,
    resetState
  ])

  const canSubmit =
    imageElement != null &&
    referencePoints.length === 2 &&
    realDistance > 0 &&
    pixelDistance != null &&
    pixelDistance > 0 &&
    (file != null || (existingPlan != null && previewSource != null))

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
      title={existingPlan ? 'Plan image' : 'Import plan image'}
      maxWidth="720px"
    >
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="2">
          <Text weight="medium">1. Select floor plan image</Text>
          {existingPlan && !file ? (
            <Text size="2" color="gray">
              Using current image ({existingPlan.image.name}). Upload a new file below to replace it.
            </Text>
          ) : (
            <Text size="2" color="gray">
              Upload a PNG, JPG, or SVG. The file stays local and is not saved with your project.
            </Text>
          )}
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
                Real Distance:
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

            <Flex align="center" gap="1" justify="center">
              <Text weight="medium" size="2">
                Pixel distance:
              </Text>
              <Text size="2" color="gray">
                {pixelDistance ? `${pixelDistance.toFixed(1)} px` : 'Select two points'}
              </Text>
              {pixelDistanceWarning && (
                <Tooltip content={pixelDistanceWarning}>
                  <ExclamationTriangleIcon width={20} height={20} style={{ color: 'var(--amber-9)' }} />
                </Tooltip>
              )}
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
