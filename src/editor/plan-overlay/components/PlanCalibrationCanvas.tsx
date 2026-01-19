import { Card } from '@radix-ui/themes'
import React, { type PointerEvent, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import type { ImagePoint } from '@/editor/plan-overlay/types'
import { SVGViewport, type SVGViewportRef } from '@/shared/components/SVGViewport'
import { Bounds2D, ZERO_VEC2, newVec2 } from '@/shared/geometry'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

export type SelectionMode = 'measure' | 'origin' | 'idle'

export interface PlanCalibrationCanvasProps {
  image: HTMLImageElement | null
  referencePoints: readonly ImagePoint[]
  onReferencePointsChange: (points: ImagePoint[]) => void
  originPoint: ImagePoint | null
  onOriginPointChange: (point: ImagePoint | null) => void
  mode: SelectionMode
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
  originPoint,
  mode,
  onOriginPointChange,
  onReferencePointsChange
}: PlanCalibrationCanvasProps): React.JSX.Element {
  const { t } = useTranslation('overlay')
  const viewportRef = useRef<SVGViewportRef>(null)
  const [containerSize, setContainerRef] = elementSizeRef()

  const contentBounds = useMemo(
    () => (image ? Bounds2D.fromMinMax(ZERO_VEC2, newVec2(image.naturalWidth, image.naturalHeight)) : Bounds2D.EMPTY),
    [image?.naturalWidth, image?.naturalHeight]
  )

  const pointerState = useRef({ x: 0, y: 0 })

  const handlePointerDown = useCallback(
    (event: PointerEvent<SVGImageElement>) => {
      pointerState.current = { x: event.clientX, y: event.clientY }
    },
    [pointerState]
  )

  const handlePointerUp = useCallback(
    (event: PointerEvent<SVGImageElement>) => {
      if (event.button !== 0) return
      const deltaX = Math.abs(pointerState.current.x - event.clientX)
      const deltaY = Math.abs(pointerState.current.y - event.clientY)
      if (deltaX > 5 || deltaY > 5) return

      const mousePoint = viewportRef.current?.screenToWorld(event.clientX, event.clientY)
      if (!mousePoint || !image) return
      const imagePoint = clampPointToImage(mousePoint, image)

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
    [image, mode, onOriginPointChange, onReferencePointsChange, referencePoints, pointerState]
  )

  const renderReferenceLine = (): React.ReactNode => {
    if (referencePoints.length < 2) return null
    const [start, end] = referencePoints
    return (
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="var(--accent-9)"
        strokeWidth={2}
        strokeDasharray="12 8"
        pointerEvents="none"
      />
    )
  }

  const renderCrosshair = (point: ImagePoint, color: string): React.ReactNode => (
    <g key={`${point.x}-${point.y}`} pointerEvents="none">
      <circle cx={point.x} cy={point.y} r={8} fill="none" stroke={color} strokeWidth={3} opacity={0.7} />
      <line
        x1={point.x - 12}
        y1={point.y - 12}
        x2={point.x + 12}
        y2={point.y + 12}
        stroke="var(--gray-12)"
        strokeWidth={3}
        opacity={0.4}
      />
      <line
        x1={point.x - 12}
        y1={point.y + 12}
        x2={point.x + 12}
        y2={point.y - 12}
        stroke="var(--gray-12)"
        strokeWidth={3}
        opacity={0.4}
      />
      <line
        x1={point.x - 12}
        y1={point.y - 12}
        x2={point.x + 12}
        y2={point.y + 12}
        stroke="var(--gray-1)"
        strokeWidth={1.5}
      />
      <line
        x1={point.x - 12}
        y1={point.y + 12}
        x2={point.x + 12}
        y2={point.y - 12}
        stroke="var(--gray-1)"
        strokeWidth={1.5}
      />
    </g>
  )

  return (
    <div
      ref={setContainerRef}
      style={{ borderColor: 'var(--gray-6)' }}
      className="border rounded-md relative w-full h-full flex items-center justify-center overflow-hidden p0"
    >
      {image ? (
        <SVGViewport ref={viewportRef} svgSize={containerSize} contentBounds={contentBounds}>
          <rect
            x={0}
            y={0}
            width={image.naturalWidth}
            height={image.naturalHeight}
            fill="var(--gray-2)"
            pointerEvents="none"
          />
          <image
            href={image.src}
            x={0}
            y={0}
            width={image.naturalWidth}
            height={image.naturalHeight}
            crossOrigin="anonymous"
            onPointerDown={handlePointerDown}
            onPointerEnter={handlePointerDown}
            onPointerUp={handlePointerUp}
          />
          {renderReferenceLine()}
          {referencePoints.map(point => renderCrosshair(point, 'var(--accent-9)'))}
          {originPoint && renderCrosshair(originPoint, 'var(--red-9)')}
        </SVGViewport>
      ) : (
        <span className="text-gray-900">{t($ => $.canvas.uploadToBegin)}</span>
      )}
      {image && (
        <div className="absolute bottom-3 right-3 z-10">
          <Card size="1" variant="surface" className="shadow-md">
            <div className="items-center gap-3 m--2 p-1">
              <span className="text-sm">{t($ => $.canvas.scrollToZoom)}</span>
              <span className="text-sm">Shift + drag to pan</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
