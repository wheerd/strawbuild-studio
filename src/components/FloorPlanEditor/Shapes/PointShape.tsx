import { Circle } from 'react-konva'
import type Konva from 'konva'
import { useCallback, useRef } from 'react'
import type { Point } from '../../../types/model'
import { useSelectedEntity, useEditorStore, useDragState, useActiveTool } from '../hooks/useEditorStore'

interface PointShapeProps {
  point: Point
}

export function PointShape ({ point }: PointShapeProps): React.JSX.Element {
  // Use individual selectors to avoid object creation
  const selectedEntity = useSelectedEntity()
  const selectEntity = useEditorStore(state => state.selectEntity)
  const startDrag = useEditorStore(state => state.startDrag)
  const dragState = useDragState()
  const activeTool = useActiveTool()
  const hasDraggedRef = useRef(false)

  const isSelected = selectedEntity === point.id
  const isDragging = dragState.isDragging && dragState.dragEntityId === point.id && dragState.dragType === 'point'

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

    // Default behavior: stop propagation and toggle selection
    e.cancelBubble = true
    selectEntity(point.id)
  }, [selectEntity, point.id, activeTool])

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>): void => {
    if (e.evt.button !== 0) return // Only left click

    // In wall creation mode, let the stage handle the mouseDown
    if (activeTool === 'wall') {
      return // Don't cancel bubbling, let the stage handle it
    }

    e.cancelBubble = true

    // Reset drag flag
    hasDraggedRef.current = false

    // Select the point when starting to drag
    selectEntity(point.id)

    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (pointer != null) {
      startDrag('point', pointer, point.id)
      // Mark that we started a drag operation
      hasDraggedRef.current = true
    }
  }, [startDrag, selectEntity, point.id, activeTool])

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
