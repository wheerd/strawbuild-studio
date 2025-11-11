import type Konva from 'konva'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Group, Layer, Line, Rect, Stage } from 'react-konva/lib/ReactKonvaCore'
import { Image as KonvaImage } from 'react-konva/lib/ReactKonvaCore'

import { elementSizeRef } from '@/shared/hooks/useElementSize'

import type { ImagePoint } from '../types'

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
  const stageRef = useRef<Konva.Stage>(null)
  const [containerSize, setContainerRef] = elementSizeRef()
  const [hasInteracted, setHasInteracted] = useState(false)
  const [baseScale, setBaseScale] = useState(1)
  const [view, setView] = useState<ViewTransform>(() => ({
    scale: 1,
    pan: { x: 0, y: 0 }
  }))
  const dragOrigin = useRef<{ pointer: { x: number; y: number }; pan: { x: number; y: number } } | null>(null)

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
    if (!dragOrigin.current) return
    const pointer = event.target.getStage()?.getPointerPosition()
    if (!pointer) return
    const deltaX = pointer.x - dragOrigin.current.pointer.x
    const deltaY = pointer.y - dragOrigin.current.pointer.y
    setView(prev => ({
      ...prev,
      pan: {
        x: dragOrigin.current!.pan.x + deltaX,
        y: dragOrigin.current!.pan.y + deltaY
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

      if (mode === 'measure' || mode === 'idle') {
        if (referencePoints.length >= 2) {
          onReferencePointsChange([imagePoint])
        } else {
          onReferencePointsChange([...referencePoints, imagePoint])
        }
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
        stroke="#1E63D5"
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
        stroke="#060708"
        strokeWidth={3}
        opacity={0.4}
      />
      <Line
        points={[point.x - 12, point.y + 12, point.x + 12, point.y - 12]}
        stroke="#060708"
        strokeWidth={3}
        opacity={0.4}
      />
      <Line points={[point.x - 12, point.y - 12, point.x + 12, point.y + 12]} stroke="#ffffff" strokeWidth={1.5} />
      <Line points={[point.x - 12, point.y + 12, point.x + 12, point.y - 12]} stroke="#ffffff" strokeWidth={1.5} />
    </Group>
  )

  return (
    <div
      ref={setContainerRef}
      style={{
        width: '100%',
        minHeight: `${MIN_STAGE_HEIGHT}px`,
        position: 'relative',
        border: '1px solid var(--gray-5)',
        borderRadius: '8px',
        backgroundColor: 'var(--gray-1)',
        boxShadow: 'var(--shadow-2)'
      }}
    >
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
          onContextMenu={event => event.evt.preventDefault()}
        >
          <Layer listening={false}>
            <Rect
              x={-view.pan.x / view.scale}
              y={-view.pan.y / view.scale}
              width={stageWidth / view.scale}
              height={stageHeight / view.scale}
              fill="#f6f6f6"
              listening={false}
            />
            <KonvaImage image={image} width={image.naturalWidth} height={image.naturalHeight} listening={false} />
            {renderReferenceLine()}
            {referencePoints.map(point => renderCrosshair(point, '#0F62FE'))}
            {originPoint && renderCrosshair(originPoint, '#B42318')}
          </Layer>
        </Stage>
      ) : (
        <div
          style={{
            height: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            color: 'var(--gray-11)'
          }}
        >
          Upload an image to begin
        </div>
      )}
      {image && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            borderRadius: '6px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: '#fff',
            fontSize: '12px',
            padding: '4px 12px'
          }}
        >
          <span>Scroll to zoom</span>
          <span>Shift + drag to pan</span>
          <button
            type="button"
            onClick={() => {
              resetView()
              setHasInteracted(false)
            }}
            style={{
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '4px',
              padding: '2px 8px',
              textTransform: 'uppercase',
              fontSize: '11px',
              letterSpacing: '0.05em',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
