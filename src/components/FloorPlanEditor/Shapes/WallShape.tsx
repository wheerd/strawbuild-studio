import { Line } from 'react-konva'
import type Konva from 'konva'
import { useCallback } from 'react'
import type { Wall } from '../../../types/model'
import { useSelectedEntities, useEditorStore, useDragState, useActiveTool } from '../hooks/useEditorStore'
import { useConnectionPoints } from '../../../model/store'

interface WallShapeProps {
  wall: Wall
}

export function WallShape ({ wall }: WallShapeProps): React.JSX.Element | null {
  // Use individual selectors to avoid object creation
  const selectedEntities = useSelectedEntities()
  const toggleEntitySelection = useEditorStore(state => state.toggleEntitySelection)
  const startDrag = useEditorStore(state => state.startDrag)
  const connectionPoints = useConnectionPoints()
  const dragState = useDragState()
  const activeTool = useActiveTool()

  const startPoint = connectionPoints.get(wall.startPointId)
  const endPoint = connectionPoints.get(wall.endPointId)

  if (startPoint == null || endPoint == null) {
    return null
  }

  const isSelected = selectedEntities.includes(wall.id)
  const isDragging = dragState.isDragging && dragState.dragEntityId === wall.id && dragState.dragType === 'wall'

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>): void => {
    // In wall creation mode, allow the stage to handle the click
    if (activeTool === 'wall') {
      return // Don't cancel bubbling, let the stage handle it
    }

    e.cancelBubble = true
    toggleEntitySelection(wall.id)
  }, [toggleEntitySelection, wall.id, activeTool])

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>): void => {
    if (e.evt.button !== 0) return // Only left click

    // In wall creation mode, allow the stage to handle the mouseDown
    if (activeTool === 'wall') {
      return // Don't cancel bubbling, let the stage handle it
    }

    e.cancelBubble = true

    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (pointer != null) {
      startDrag('wall', pointer, wall.id)
    }
  }, [startDrag, wall.id, activeTool])

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