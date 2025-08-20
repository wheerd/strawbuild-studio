import { Line } from 'react-konva'
import type Konva from 'konva'
import { useCallback, useRef } from 'react'
import type { Wall } from '@/types/model'
import { useSelectedEntity, useEditorStore, useDragState, useActiveTool } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { usePoints } from '@/model/store'

interface WallShapeProps {
  wall: Wall
}

export function WallShape ({ wall }: WallShapeProps): React.JSX.Element | null {
  // Use individual selectors to avoid object creation
  const selectedEntity = useSelectedEntity()
  const selectEntity = useEditorStore(state => state.selectEntity)
  const startDrag = useEditorStore(state => state.startDrag)
  const points = usePoints()
  const dragState = useDragState()
  const activeTool = useActiveTool()
  const hasDraggedRef = useRef(false)

  const startPoint = points.get(wall.startPointId)
  const endPoint = points.get(wall.endPointId)

  if (startPoint == null || endPoint == null) {
    return null
  }

  const isSelected = selectedEntity === wall.id
  const isDragging = dragState.isDragging && dragState.dragEntityId === wall.id && dragState.dragType === 'wall'

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>): void => {
    // In wall creation mode, allow the stage to handle the click
    if (activeTool === 'wall') {
      return // Don't cancel bubbling, let the stage handle it
    }

    // If we just finished dragging, don't process the click (prevents deselection)
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false
      e.cancelBubble = true
      return
    }

    e.cancelBubble = true
    selectEntity(wall.id)
  }, [selectEntity, wall.id, activeTool])

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>): void => {
    if (e.evt.button !== 0) return // Only left click

    // In wall creation mode, allow the stage to handle the mouseDown
    if (activeTool === 'wall') {
      return // Don't cancel bubbling, let the stage handle it
    }

    e.cancelBubble = true

    // Reset drag flag
    hasDraggedRef.current = false

    // Select the wall when starting to drag
    selectEntity(wall.id)

    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (pointer != null) {
      startDrag('wall', pointer, wall.id)
      // Mark that we started a drag operation
      hasDraggedRef.current = true
    }
  }, [startDrag, selectEntity, wall.id, activeTool])

  return (
    <Line
      points={[startPoint.position.x, startPoint.position.y, endPoint.position.x, endPoint.position.y]}
      stroke={isSelected ? '#007acc' : isDragging ? '#ff6b35' : '#333333'}
      strokeWidth={wall.thickness / 10}
      lineCap='round'
      onClick={activeTool === 'wall' ? undefined : handleClick}
      onTap={activeTool === 'wall' ? undefined : handleClick}
      onMouseDown={activeTool === 'wall' ? undefined : handleMouseDown}
      listening={activeTool !== 'wall'}
      draggable={false}
    />
  )
}
