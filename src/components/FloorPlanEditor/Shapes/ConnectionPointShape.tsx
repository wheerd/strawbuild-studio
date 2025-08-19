import { Circle } from 'react-konva'
import type Konva from 'konva'
import { useCallback } from 'react'
import type { ConnectionPoint } from '../../../types/model'
import { useSelectedEntities, useEditorStore, useDragState, useActiveTool } from '../hooks/useEditorStore'

interface ConnectionPointShapeProps {
  point: ConnectionPoint
}

export function ConnectionPointShape ({ point }: ConnectionPointShapeProps): React.JSX.Element {
  // Use individual selectors to avoid object creation
  const selectedEntities = useSelectedEntities()
  const toggleEntitySelection = useEditorStore(state => state.toggleEntitySelection)
  const startDrag = useEditorStore(state => state.startDrag)
  const dragState = useDragState()
  const activeTool = useActiveTool()

  const isSelected = selectedEntities.includes(point.id)
  const isDragging = dragState.isDragging && dragState.dragEntityId === point.id && dragState.dragType === 'point'

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>): void => {
    // In wall creation mode, allow the stage to handle the click
    if (activeTool === 'wall') {
      return // Don't cancel bubbling, let the stage handle it
    }

    // Default behavior: stop propagation and toggle selection
    e.cancelBubble = true
    toggleEntitySelection(point.id)
  }, [toggleEntitySelection, point.id, activeTool])

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>): void => {
    if (e.evt.button !== 0) return // Only left click

    // In wall creation mode, let the stage handle the mouseDown
    if (activeTool === 'wall') {
      return // Don't cancel bubbling, let the stage handle it
    }

    e.cancelBubble = true

    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (pointer != null) {
      startDrag('point', pointer, point.id)
    }
  }, [startDrag, point.id, activeTool])

  return (
    <Circle
      x={point.position.x}
      y={point.position.y}
      radius={6}
      fill={isSelected ? '#007acc' : isDragging ? '#ff6b35' : '#666666'}
      stroke='#333333'
      strokeWidth={1}
      onClick={activeTool === 'wall' ? undefined : handleClick}
      onTap={activeTool === 'wall' ? undefined : handleClick}
      onMouseDown={activeTool === 'wall' ? undefined : handleMouseDown}
      listening={activeTool !== 'wall'}
      draggable={false}
    />
  )
}