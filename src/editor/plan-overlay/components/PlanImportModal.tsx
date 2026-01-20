import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Label } from '@radix-ui/react-label'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { StoreyId } from '@/building/model/ids'
import { Button } from '@/components/ui/button'
import { FullScreenModal } from '@/components/ui/full-screen-modal'
import { Separator } from '@/components/ui/separator'
import { Tooltip } from '@/components/ui/tooltip'
import { PlanCalibrationCanvas } from '@/editor/plan-overlay/components/PlanCalibrationCanvas'
import { useFloorPlanActions } from '@/editor/plan-overlay/store'
import type { FloorPlanOverlay, ImagePoint } from '@/editor/plan-overlay/types'
import { calculatePixelDistance } from '@/editor/plan-overlay/utils/calibration'
import { LengthField } from '@/shared/components/LengthField'
import { useFormatters } from '@/shared/i18n/useFormatters'

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
  const { t } = useTranslation('overlay')
  const { formatLength } = useFormatters()
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
    img.onload = () => {
      setImageElement(img)
    }
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
      return t($ => $.planImport.step2.warningSmallSpan)
    }
    return null
  }, [pixelDistance, t])

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
    <FullScreenModal
      open={open}
      onOpenChange={onOpenChange}
      title={existingPlan ? t($ => $.planImport.titleExisting) : t($ => $.planImport.titleNew)}
    >
      <div className="grid h-full w-full grid-cols-[30em_1fr] gap-x-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <span className="font-medium">{t($ => $.planImport.step1.title)}</span>
            {existingPlan && !file ? (
              <span className="text-base text-gray-900">
                {t($ => $.planImport.step1.currentImage, {
                  name: existingPlan.image.name
                })}
              </span>
            ) : (
              <span className="text-base text-gray-900">{t($ => $.planImport.step1.uploadHint)}</span>
            )}
            <Button asChild>
              <Label htmlFor="fileInput">{t($ => $.planImport.step1.uploadButton)}</Label>
            </Button>
            <input id="fileInput" type="file" accept="image/*" onChange={handleFileChange} className="h-0 opacity-0" />
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <span className="font-medium">{t($ => $.planImport.step2.title)}</span>
            <div className="items-baseline justify-between">
              <span className="text-base text-gray-900">{t($ => $.planImport.step2.instructions)}</span>
              <Button
                size="sm"
                variant="soft"
                disabled={referencePoints.length === 0}
                onClick={() => {
                  setReferencePoints([])
                }}
              >
                {t($ => $.planImport.step2.clearPoints)}
              </Button>
            </div>

            <div className="flex justify-between">
              <div className="flex flex-row items-center gap-1">
                <span className="text-base font-medium">{t($ => $.planImport.step2.realDistance)}</span>
                <LengthField
                  value={realDistance}
                  onCommit={handleDistanceCommit}
                  unit="m"
                  min={1}
                  max={1000_000}
                  precision={3}
                  style={{ width: '7em' }}
                />
              </div>

              <div className="flex flex-row items-center justify-end gap-1">
                <span className="text-base font-medium">{t($ => $.planImport.step2.scale)}</span>
                <span className="text-base text-gray-900">
                  {mmPerPixel
                    ? t($ => $.planImport.step2.scaleValue, {
                        distance: formatLength(mmPerPixel)
                      })
                    : t($ => $.planImport.step2.scalePlaceholder)}
                </span>
                {pixelDistanceWarning && (
                  <Tooltip content={pixelDistanceWarning}>
                    <ExclamationTriangleIcon width={20} height={20} style={{ color: 'var(--color-orange-900)' }} />
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <span className="font-medium">{t($ => $.planImport.step3.title)}</span>
            <span className="text-base text-gray-900">{t($ => $.planImport.step3.instructions)}</span>

            <div className="flex items-center gap-3">
              <Tooltip
                content={showOriginHint ? t($ => $.planImport.step3.clickHint) : t($ => $.planImport.step3.pickHint)}
              >
                <Button
                  size="sm"
                  variant={showOriginHint ? 'default' : 'soft'}
                  onClick={handleSelectOriginClick}
                  disabled={!imageElement}
                >
                  {showOriginHint
                    ? t($ => $.planImport.step3.clickImage)
                    : originPoint
                      ? t($ => $.planImport.step3.changeOrigin)
                      : t($ => $.planImport.step3.pickOrigin)}
                </Button>
              </Tooltip>

              {originPoint && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setOriginPoint(null)
                  }}
                >
                  {t($ => $.planImport.step3.clearOrigin)}
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="soft"
                onClick={() => {
                  onOpenChange(false)
                }}
              >
                {t($ => $.planImport.footer.cancel)}
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {existingPlan ? t($ => $.planImport.footer.replacePlan) : t($ => $.planImport.footer.addPlan)}
              </Button>
            </div>
          </div>
        </div>
        <PlanCalibrationCanvas
          image={imageElement}
          referencePoints={referencePoints}
          onReferencePointsChange={setReferencePoints}
          originPoint={originPoint}
          onOriginPointChange={handleOriginPointChange}
          mode={selectionMode}
        />
      </div>
    </FullScreenModal>
  )
}
