import { Box, Button, Card, Flex, Inset, Text } from '@radix-ui/themes'
import type Konva from 'konva'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva/lib/ReactKonvaCore'

import type { ImagePoint } from '@/editor/plan-overlay/types'
import { elementSizeRef } from '@/shared/hooks/useElementSize'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

export type SelectionMode = 'measure' | 'origin' | 'idle'

export interface PlanCalibrationCanvasProps {
  image: HTMLImageElement | null
  referencePoints: readonly ImagePoint[]
  onReferencePointsChange: (points: ImagePoint[]) => void
  originPoint: ImagePoint | null
  onOriginPointChange: (point: ImagePoint | null) => void
  mode: SelectionMode
}

const DEFAULT_STAGE_WIDTH = 640
const DEFAULT_STAGE_HEIGHT = 420
const MIN_STAGE_WIDTH = 360
const MIN_STAGE_HEIGHT = 260
const MAX_STAGE_HEIGHT = 520
const SCALE_STEP = 1.08
const MIN_SCALE_FACTOR = 0.5
const MAX_SCALE_FACTOR = 8

interface ViewTransform {
  scale: number
  pan: { x: number; y: number }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function clampPointToImage(point: ImagePoint, image: HTMLImageElement): ImagePoint {
  return {
    x: clamp(point.x, 0, image.naturalWidth),
    y: clamp(point.y, 0, image.naturalHeight)
  }
}

export function PlanCalibrationCanvas({
  image,
  referencePoints,
  onReferencePointsChange,
  originPoint,
  onOriginPointChange,
  mode
}: PlanCalibrationCanvasProps): React.JSX.Element {
  const { t } = useTranslation('overlay')
  const stageRef = useRef<Konva.Stage>(null)
  const [containerSize, setContainerRef] = elementSizeRef()
  const [hasInteracted, setHasInteracted] = useState(false)
  const [baseScale, setBaseScale] = useState(1)
  const [view, setView] = useState<ViewTransform>(() => ({
    scale: 1,
    pan: { x: 0, y: 0 }
  }))
  const dragOrigin = useRef<{ pointer: { x: number; y: number }; pan: { x: number; y: number } } | null>(null)
  const theme = useCanvasTheme()

  const handleContainerRef = useCallback(
    (element: HTMLDivElement | null) => {
      setContainerRef(element)
    },
    [setContainerRef]
  )

  const stageWidth = useMemo(() => {
    if (containerSize.width > 0) {
      return Math.max(MIN_STAGE_WIDTH, containerSize.width)
    }
    return DEFAULT_STAGE_WIDTH
  }, [containerSize.width])

  const stageHeight = useMemo(() => {
    if (!image) {
      return DEFAULT_STAGE_HEIGHT
    }
    const aspectRatio = image.naturalHeight / image.naturalWidth
    const targetHeight = stageWidth * aspectRatio
    return clamp(targetHeight, MIN_STAGE_HEIGHT, MAX_STAGE_HEIGHT)
  }, [image, stageWidth])

  const resetView = useCallback(
    (overrideInteraction = false) => {
      if (!image) return
      const fitScale = Math.min(stageWidth / image.naturalWidth, stageHeight / image.naturalHeight)
      const nextScale = fitScale > 0 && isFinite(fitScale) ? fitScale : 1
      const centeredPan = {
        x: (stageWidth - image.naturalWidth * nextScale) / 2,
        y: (stageHeight - image.naturalHeight * nextScale) / 2
      }
      setBaseScale(nextScale)
      setView({ scale: nextScale, pan: centeredPan })
      if (!overrideInteraction) {
        setHasInteracted(false)
      }
    },
    [image, stageHeight, stageWidth]
  )

  useEffect(() => {
    if (!image) return
    if (hasInteracted) return
    resetView(true)
  }, [hasInteracted, image, resetView])

  const pointerToImagePoint = useCallback(
    (pointer: { x: number; y: number } | null): ImagePoint | null => {
      if (!pointer || !image) return null
      const rawPoint: ImagePoint = {
        x: (pointer.x - view.pan.x) / view.scale,
        y: (pointer.y - view.pan.y) / view.scale
      }
      return clampPointToImage(rawPoint, image)
    },
    [image, view.pan.x, view.pan.y, view.scale]
  )

  const handleWheel = useCallback(
    (event: Konva.KonvaEventObject<WheelEvent>) => {
      event.evt.preventDefault()
      if (!image || !stageRef.current) return
      const pointer = stageRef.current.getPointerPosition()
      if (!pointer) return

      const direction = event.evt.deltaY > 0 ? -1 : 1
      const nextScale = clamp(
        view.scale * (direction > 0 ? SCALE_STEP : 1 / SCALE_STEP),
        baseScale * MIN_SCALE_FACTOR,
        baseScale * MAX_SCALE_FACTOR
      )

      const mousePointTo = {
        x: (pointer.x - view.pan.x) / view.scale,
        y: (pointer.y - view.pan.y) / view.scale
      }

      const newPan = {
        x: pointer.x - mousePointTo.x * nextScale,
        y: pointer.y - mousePointTo.y * nextScale
      }

      setView({ scale: nextScale, pan: newPan })
      setHasInteracted(true)
    },
    [baseScale, image, view.pan.x, view.pan.y, view.scale]
  )

  const beginPan = useCallback(
    (event: Konva.KonvaEventObject<PointerEvent>) => {
      const isPanPointer = event.evt.button === 1 || event.evt.button === 2 || event.evt.shiftKey
      if (!isPanPointer) {
        dragOrigin.current = null
        return
      }
      const pointer = event.target.getStage()?.getPointerPosition()
      if (!pointer) return
      dragOrigin.current = {
        pointer,
        pan: { ...view.pan }
      }
      setHasInteracted(true)
      event.evt.preventDefault()
    },
    [view.pan]
  )

  const updatePan = useCallback((event: Konva.KonvaEventObject<PointerEvent>) => {
    const origin = dragOrigin.current
    if (!origin) return
    const pointer = event.target.getStage()?.getPointerPosition()
    if (!pointer) return
    const deltaX = pointer.x - origin.pointer.x
    const deltaY = pointer.y - origin.pointer.y
    setView(prev => ({
      ...prev,
      pan: {
        x: origin.pan.x + deltaX,
        y: origin.pan.y + deltaY
      }
    }))
  }, [])

  const endPan = useCallback(() => {
    dragOrigin.current = null
  }, [])

  const handlePointerUp = useCallback(
    (event: Konva.KonvaEventObject<PointerEvent>) => {
      if (!image) return
      const usedForPan = event.evt.shiftKey || event.evt.button === 1 || event.evt.button === 2
      if (dragOrigin.current || usedForPan) {
        dragOrigin.current = null
        return
      }
      if (event.evt.button !== 0) return

      const pointer = event.target.getStage()?.getPointerPosition()
      const imagePoint = pointerToImagePoint(pointer ?? null)
      if (!imagePoint) return

      if (mode === 'origin') {
        onOriginPointChange(imagePoint)
        return
      }

      if (referencePoints.length >= 2) {
        onReferencePointsChange([imagePoint])
      } else {
        onReferencePointsChange([...referencePoints, imagePoint])
      }
    },
    [image, mode, onOriginPointChange, onReferencePointsChange, pointerToImagePoint, referencePoints]
  )

  const handleStageClick = useCallback((event: Konva.KonvaEventObject<MouseEvent>) => {
    if (event.evt.detail > 1) {
      // Prevent double-click zooming behaviour in browsers
      event.evt.preventDefault()
    }
  }, [])

  const renderReferenceLine = (): React.ReactNode => {
    if (referencePoints.length < 2) return null
    const [start, end] = referencePoints
    return (
      <Line
        points={[start.x, start.y, end.x, end.y]}
        stroke="var(--color-primary)"
        strokeWidth={2}
        dash={[12, 8]}
        listening={false}
      />
    )
  }

  const renderCrosshair = (point: ImagePoint, color: string): React.ReactNode => (
    <Group key={`${point.x}-${point.y}`} listening={false}>
      <Circle x={point.x} y={point.y} radius={8} stroke={color} strokeWidth={3} opacity={0.7} />
      <Line
        points={[point.x - 12, point.y - 12, point.x + 12, point.y + 12]}
        stroke="var(--gray-12)"
        strokeWidth={3}
        opacity={0.4}
      />
      <Line
        points={[point.x - 12, point.y + 12, point.x + 12, point.y - 12]}
        stroke="var(--gray-12)"
        strokeWidth={3}
        opacity={0.4}
      />
      <Line
        points={[point.x - 12, point.y - 12, point.x + 12, point.y + 12]}
        stroke="var(--gray-1)"
        strokeWidth={1.5}
      />
      <Line
        points={[point.x - 12, point.y + 12, point.x + 12, point.y - 12]}
        stroke="var(--gray-1)"
        strokeWidth={1.5}
      />
    </Group>
  )

  return (
    <Card>
      <Inset>
        <Box ref={handleContainerRef} position="relative">
          {image ? (
            <Stage
              ref={stageRef}
              width={stageWidth}
              height={stageHeight}
              scaleX={view.scale}
              scaleY={view.scale}
              x={view.pan.x}
              y={view.pan.y}
              draggable={false}
              onWheel={handleWheel}
              onPointerDown={beginPan}
              onPointerMove={updatePan}
              onPointerUp={handlePointerUp}
              onPointerLeave={endPan}
              onClick={handleStageClick}
              onContextMenu={event => {
                event.evt.preventDefault()
              }}
            >
              <Layer listening={false}>
                <Rect
                  x={-view.pan.x / view.scale}
                  y={-view.pan.y / view.scale}
                  width={stageWidth / view.scale}
                  height={stageHeight / view.scale}
                  fill="var(--color-bg-subtle)"
                  listening={false}
                />
                <KonvaImage image={image} width={image.naturalWidth} height={image.naturalHeight} listening={false} />
                {renderReferenceLine()}
                {referencePoints.map(point => renderCrosshair(point, 'var(--color-primary)'))}
                {originPoint && renderCrosshair(originPoint, theme.danger)}
              </Layer>
            </Stage>
          ) : (
            <Flex height="300px" align="center" justify="center">
              <Text color="gray">{t($ => $.canvas.uploadToBegin)}</Text>
            </Flex>
          )}
          {image && (
            <Box position="absolute" bottom="3" left="3" style={{ zIndex: 10 }}>
              <Card size="1" variant="surface" className="shadow-md">
                <Flex align="center" gap="3" m="-2" p="1">
                  <Text size="1">{t($ => $.canvas.scrollToZoom)}</Text>
                  <Text size="1">Shift + drag to pan</Text>
                  <Button
                    size="1"
                    variant="solid"
                    color="gray"
                    onClick={() => {
                      resetView()
                      setHasInteracted(false)
                    }}
                  >
                    {t($ => $.canvas.resetView)}
                  </Button>
                </Flex>
              </Card>
            </Box>
          )}
        </Box>
      </Inset>
    </Card>
  )
}
