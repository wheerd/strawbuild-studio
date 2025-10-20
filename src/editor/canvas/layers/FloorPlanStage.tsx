import type Konva from 'konva'
import 'konva/lib/shapes/Arrow'
import 'konva/lib/shapes/Circle'
import 'konva/lib/shapes/Line'
import 'konva/lib/shapes/Rect'
import 'konva/lib/shapes/Text'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Stage } from 'react-konva/lib/ReactKonvaCore'

import { stageReference } from '@/editor/canvas/services/StageReference'
import { usePointerPositionActions } from '@/editor/hooks/usePointerPosition'
import { usePanX, usePanY, useViewportActions, useZoom } from '@/editor/hooks/useViewportStore'
import { useToolCursor } from '@/editor/tools/system'
import { useCanvasEventDispatcher } from '@/editor/tools/system/events/CanvasEventDispatcher'
import { handleCanvasEvent } from '@/editor/tools/system/store'
import type { CanvasEvent } from '@/editor/tools/system/types'

import { FloorLayer } from './FloorLayer'
import { GridLayer } from './GridLayer'
import { PerimeterLayer } from './PerimeterLayer'
import { ToolOverlayLayer } from './ToolOverlayLayer'

interface FloorPlanStageProps {
  width: number
  height: number
}

const ZOOM_SCALE = 1.1

export function FloorPlanStage({ width, height }: FloorPlanStageProps): React.JSX.Element {
  const stageRef = useRef<Konva.Stage>(null)
  const zoom = useZoom()
  const panX = usePanX()
  const panY = usePanY()
  const { setStageDimensions, zoomBy, panBy, setPan, stageToWorld } = useViewportActions()
  const pointerActions = usePointerPositionActions()
  const cursor = useToolCursor()

  // Local state for panning (non-tool related)
  const [dragStart, setDragStart] = useState<{ pos: { x: number; y: number } } | null>(null)

  // Touch state for mobile gestures
  const [touches, setTouches] = useState<Touch[]>([])

  // Update stage dimensions in the store when they change
  useEffect(() => {
    setStageDimensions(width, height)
  }, [width, height, setStageDimensions])

  // Set global stage reference when stage is ready
  useEffect(() => {
    if (stageRef.current) {
      stageReference.setStage(stageRef.current)
    }

    return () => {
      // Clean up stage reference on unmount
      stageReference.clearStage()
    }
  }, [])

  // Apply cursor style to stage container
  useEffect(() => {
    if (stageRef.current) {
      const container = stageRef.current.container()
      container.style.cursor = cursor
    }
  }, [cursor])

  // Tool event handler
  const handleToolEvent = useCallback((canvasEvent: CanvasEvent) => {
    return handleCanvasEvent(canvasEvent)
  }, [])

  // Event dispatcher for routing events to tools
  const eventDispatcher = useCanvasEventDispatcher(handleToolEvent)

  // Handle wheel events (zoom)
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()

      const stage = e.target.getStage()
      if (stage == null) return

      const pointer = stage.getPointerPosition()
      if (pointer == null) return

      const newZoom = zoomBy(e.evt.deltaY > 0 ? 1 / ZOOM_SCALE : ZOOM_SCALE)

      const zoomRatio = newZoom / zoom

      const newPanX = pointer.x - (pointer.x - panX) * zoomRatio
      const newPanY = pointer.y - (pointer.y - panY) * zoomRatio

      setPan(newPanX, newPanY)
    },
    [zoom, panX, panY, zoomBy, panBy]
  )

  // Handle pointer down events
  const handlePointerDown = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const stage = e.target.getStage()
      if (stage == null) return

      const pointer = stage.getPointerPosition()
      if (pointer == null) return

      pointerActions.setPosition(pointer, stageToWorld(pointer))

      // Handle panning (middle pointer or shift+left click)
      if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.shiftKey)) {
        setDragStart({ pos: pointer })
        return
      }

      // Route to tool system
      eventDispatcher.handlePointerDown(e)
    },
    [setDragStart, eventDispatcher, pointerActions, stageToWorld]
  )

  // Handle pointer move events
  const handlePointerMove = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const stage = e.target.getStage()
      if (stage == null) return

      const pointer = stage.getPointerPosition()
      if (pointer == null) return

      pointerActions.setPosition(pointer, stageToWorld(pointer))

      // Handle panning
      if (dragStart != null && (e.evt.buttons === 4 || (e.evt.buttons === 1 && e.evt.shiftKey))) {
        const deltaX = pointer.x - dragStart.pos.x
        const deltaY = pointer.y - dragStart.pos.y

        panBy(deltaX, deltaY)
        setDragStart({ pos: pointer })
        return
      }

      // Route to tool system
      eventDispatcher.handlePointerMove(e)
    },
    [dragStart, eventDispatcher, pointerActions, stageToWorld, panBy, setDragStart]
  )

  // Handle pointer up events
  const handlePointerUp = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const stage = e.target.getStage()
      const pointer = stage?.getPointerPosition()
      if (pointer) {
        pointerActions.setPosition(pointer, stageToWorld(pointer))
      }

      // End panning
      if (dragStart != null) {
        setDragStart(null)
        return
      }

      // Route to tool system
      eventDispatcher.handlePointerUp(e)
    },
    [dragStart, eventDispatcher, pointerActions, stageToWorld, setDragStart]
  )

  const handlePointerLeave = useCallback(() => {
    pointerActions.clear()
  }, [pointerActions])

  // Handle touch start events
  const handleTouchStart = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      e.evt.preventDefault()
      pointerActions.clear()
      setTouches(Array.from(e.evt.touches))
    },
    [pointerActions]
  )

  // Handle touch move events
  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      e.evt.preventDefault()
      const currentTouches = Array.from(e.evt.touches)
      const stage = e.target.getStage()
      if (!stage) return

      if (touches.length === 1 && currentTouches.length === 1) {
        // Single finger pan
        const prevTouch = touches[0]
        const currentTouch = currentTouches[0]

        const deltaX = currentTouch.clientX - prevTouch.clientX
        const deltaY = currentTouch.clientY - prevTouch.clientY

        panBy(deltaX, deltaY)
      } else if (touches.length === 2 && currentTouches.length === 2) {
        // Two finger pinch zoom
        const prevDistance = Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY
        )
        const currentDistance = Math.hypot(
          currentTouches[0].clientX - currentTouches[1].clientX,
          currentTouches[0].clientY - currentTouches[1].clientY
        )

        if (prevDistance > 0) {
          const zoomFactor = currentDistance / prevDistance
          const centerX = (currentTouches[0].clientX + currentTouches[1].clientX) / 2
          const centerY = (currentTouches[0].clientY + currentTouches[1].clientY) / 2

          // Convert screen coordinates to stage coordinates
          const stageRect = stage.container().getBoundingClientRect()
          const stageX = centerX - stageRect.left
          const stageY = centerY - stageRect.top

          const newZoom = zoomBy(zoomFactor)
          const zoomRatio = newZoom / zoom

          // Zoom toward touch center
          const newPanX = stageX - (stageX - panX) * zoomRatio
          const newPanY = stageY - (stageY - panY) * zoomRatio

          setPan(newPanX, newPanY)
        }
      }

      setTouches(currentTouches)
    },
    [touches, zoom, panX, panY, zoomBy, panBy, setPan]
  )

  // Handle touch end events
  const handleTouchEnd = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      e.evt.preventDefault()
      setTouches([])
      pointerActions.clear()
    },
    [pointerActions]
  )

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      x={panX}
      y={panY}
      scaleX={zoom}
      scaleY={-zoom}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      draggable={false}
    >
      <GridLayer width={width} height={height} viewport={{ zoom, panX, panY }} />
      <FloorLayer />
      <PerimeterLayer />
      <ToolOverlayLayer />
    </Stage>
  )
}
