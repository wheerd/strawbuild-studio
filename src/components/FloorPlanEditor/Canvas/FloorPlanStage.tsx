import { useRef, useState, useCallback, useEffect } from 'react'
import { Stage } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore, useViewport } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { useToolContext, useToolManager } from '@/components/FloorPlanEditor/Tools'
import { useCanvasEventDispatcher } from '@/components/FloorPlanEditor/Tools/EventHandlers/CanvasEventDispatcher'
import { stageReference } from '@/components/FloorPlanEditor/services/StageReference'
import { GridLayer } from './GridLayer'
import { OuterWallLayer } from './OuterWallLayer'
import { ToolOverlayLayer } from './ToolOverlayLayer'

interface FloorPlanStageProps {
  width: number
  height: number
}

export function FloorPlanStage({ width, height }: FloorPlanStageProps): React.JSX.Element {
  const stageRef = useRef<Konva.Stage>(null)
  const viewport = useViewport()
  const toolManager = useToolManager()
  const toolContext = useToolContext()

  // Local state for panning (non-tool related)
  const [dragStart, setDragStart] = useState<{ pos: { x: number; y: number }; viewport: typeof viewport } | null>(null)

  // Editor store actions for viewport management
  const setViewport = useEditorStore(state => state.setViewport)
  const setStageDimensions = useEditorStore(state => state.setStageDimensions)

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

  // Tool event handler
  const handleToolEvent = useCallback(
    (canvasEvent: any) => {
      return toolManager.handleCanvasEvent(canvasEvent)
    },
    [toolManager]
  )

  // Event dispatcher for routing events to tools
  const eventDispatcher = useCanvasEventDispatcher(toolContext, handleToolEvent)

  // Handle wheel events (zoom)
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()

      const stage = e.target.getStage()
      if (stage == null) return

      const pointer = stage.getPointerPosition()
      if (pointer == null) return

      const scaleBy = 1.1
      const zoomFactor = e.evt.deltaY > 0 ? 1 / scaleBy : scaleBy
      const newZoom = Math.max(0.001, Math.min(2, viewport.zoom * zoomFactor))

      const zoomRatio = newZoom / viewport.zoom
      const newPanX = pointer.x - (pointer.x - viewport.panX) * zoomRatio
      const newPanY = pointer.y - (pointer.y - viewport.panY) * zoomRatio

      setViewport({
        zoom: newZoom,
        panX: newPanX,
        panY: newPanY
      })
    },
    [viewport, setViewport]
  )

  // Handle mouse down events
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (stage == null) return

      const pointer = stage.getPointerPosition()
      if (pointer == null) return

      // Handle panning (middle mouse or shift+left click)
      if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.shiftKey)) {
        setDragStart({ pos: pointer, viewport: { ...viewport } })
        return
      }

      // Route to tool system
      eventDispatcher.handleMouseDown(e)
    },
    [viewport, eventDispatcher]
  )

  // Handle mouse move events
  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (stage == null) return

      const pointer = stage.getPointerPosition()
      if (pointer == null) return

      // Handle panning
      if (dragStart != null && (e.evt.buttons === 4 || (e.evt.buttons === 1 && e.evt.shiftKey))) {
        const deltaX = pointer.x - dragStart.pos.x
        const deltaY = pointer.y - dragStart.pos.y

        setViewport({
          zoom: dragStart.viewport.zoom,
          panX: dragStart.viewport.panX + deltaX,
          panY: dragStart.viewport.panY + deltaY
        })
        return
      }

      // Route to tool system
      eventDispatcher.handleMouseMove(e)
    },
    [dragStart, setViewport, eventDispatcher]
  )

  // Handle mouse up events
  const handleMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // End panning
      if (dragStart != null) {
        setDragStart(null)
        return
      }

      // Route to tool system
      eventDispatcher.handleMouseUp(e)
    },
    [dragStart, eventDispatcher]
  )

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      eventDispatcher.handleKeyDown(e)
    }

    const handleKeyUp = (e: KeyboardEvent): void => {
      eventDispatcher.handleKeyUp(e)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [eventDispatcher])

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      x={viewport.panX}
      y={viewport.panY}
      scaleX={viewport.zoom}
      scaleY={viewport.zoom}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      draggable={false}
    >
      <GridLayer
        width={width}
        height={height}
        viewport={{ zoom: viewport.zoom, panX: viewport.panX, panY: viewport.panY }}
      />
      <OuterWallLayer />
      <ToolOverlayLayer />
    </Stage>
  )
}
