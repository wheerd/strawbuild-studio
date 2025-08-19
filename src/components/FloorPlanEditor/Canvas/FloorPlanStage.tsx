import { useRef, useState, useCallback } from 'react'
import { Stage } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore } from '../hooks/useEditorStore'
import { GridLayer } from './GridLayer'
import { WallLayer } from './WallLayer'
import { ConnectionPointLayer } from './ConnectionPointLayer'
import { RoomLayer } from './RoomLayer'
import { SelectionLayer } from './SelectionLayer'

interface FloorPlanStageProps {
  width: number
  height: number
}

interface ViewportState {
  zoom: number
  panX: number
  panY: number
}

export function FloorPlanStage ({ width, height }: FloorPlanStageProps): React.JSX.Element {
  const stageRef = useRef<Konva.Stage>(null)
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    panX: 0,
    panY: 0
  })
  const [dragStart, setDragStart] = useState<{ pos: { x: number, y: number }, viewport: ViewportState } | null>(null)
  
  // Use individual selectors instead of useEditorActions() to avoid object creation
  const startDrag = useEditorStore(state => state.startDrag)
  const endDrag = useEditorStore(state => state.endDrag)

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()

    const stage = e.target.getStage()
    if (stage == null) return

    const pointer = stage.getPointerPosition()
    if (pointer == null) return

    const scaleBy = 1.1
    const zoomFactor = e.evt.deltaY > 0 ? 1 / scaleBy : scaleBy
    const newZoom = Math.max(0.1, Math.min(10, viewport.zoom * zoomFactor))

    const zoomRatio = newZoom / viewport.zoom
    const newPanX = pointer.x - (pointer.x - viewport.panX) * zoomRatio
    const newPanY = pointer.y - (pointer.y - viewport.panY) * zoomRatio

    setViewport({
      zoom: newZoom,
      panX: newPanX,
      panY: newPanY
    })
  }, [viewport])

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (stage == null) return

    const pointer = stage.getPointerPosition()
    if (pointer == null) return

    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.shiftKey)) {
      setDragStart({ pos: pointer, viewport: { ...viewport } })
      startDrag('pan', pointer)
      return
    }

    if (e.target === stage) {
      startDrag('selection', pointer)
    }
  }, [viewport, startDrag])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (stage == null) return

    const pointer = stage.getPointerPosition()
    if (pointer == null) return

    if (dragStart != null && ((e.evt.buttons === 4) || (e.evt.buttons === 1 && e.evt.shiftKey))) {
      const deltaX = pointer.x - dragStart.pos.x
      const deltaY = pointer.y - dragStart.pos.y
      
      setViewport({
        zoom: dragStart.viewport.zoom,
        panX: dragStart.viewport.panX + deltaX,
        panY: dragStart.viewport.panY + deltaY
      })
    }
  }, [dragStart])

  const handleMouseUp = useCallback(() => {
    setDragStart(null)
    endDrag()
  }, [endDrag])

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
      <GridLayer width={width} height={height} viewport={viewport} />
      <RoomLayer />
      <WallLayer />
      <ConnectionPointLayer />
      <SelectionLayer />
    </Stage>
  )
}
