import { Line, Group, Arrow } from 'react-konva'
import type Konva from 'konva'
import { useCallback, useRef } from 'react'
import type { Wall } from '@/types/model'
import { useSelectedEntity, useEditorStore, useDragState, useActiveTool } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { usePoints, useCorners } from '@/model/store'
import type { Point2D } from '@/types/geometry'

interface WallShapeProps {
  wall: Wall
}

export function WallShape ({ wall }: WallShapeProps): React.JSX.Element | null {
  // Use individual selectors to avoid object creation
  const selectedEntity = useSelectedEntity()
  const selectEntity = useEditorStore(state => state.selectEntity)
  const setSelectedEntity = useEditorStore(state => state.setSelectedEntity)
  const startDrag = useEditorStore(state => state.startDrag)
  const points = usePoints()
  const corners = useCorners()
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

  // Check if this wall is a main wall of a selected corner
  const isMainWallOfSelectedCorner = Array.from(corners.values()).some(corner =>
    selectedEntity === corner.id && (corner.wall1Id === wall.id || corner.wall2Id === wall.id)
  )

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

    // Select the wall when starting to drag (use setSelectedEntity to avoid toggle)
    setSelectedEntity(wall.id)

    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (pointer != null) {
      startDrag('wall', pointer as Point2D, wall.id)
      // Mark that we started a drag operation
      hasDraggedRef.current = true
    }
  }, [startDrag, setSelectedEntity, wall.id, activeTool])

  // Determine wall color based on state
  const getWallColor = (): string => {
    if (isSelected) return '#007acc' // Blue for selected wall
    if (isDragging) return '#ff6b35' // Orange for dragging
    if (isMainWallOfSelectedCorner) return '#00cc66' // Green for main walls of selected corner
    return '#333333' // Default gray
  }

  // Determine stroke width based on state
  const getStrokeWidth = (): number => {
    const baseWidth = wall.thickness / 10
    if (isSelected || isMainWallOfSelectedCorner) return baseWidth + 2
    return baseWidth
  }

  // Calculate wall perpendicular direction for arrows
  const wallDx = endPoint.position.x - startPoint.position.x
  const wallDy = endPoint.position.y - startPoint.position.y
  const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy)
  
  // Get perpendicular vector (normal to wall)
  const normalX = wallLength > 0 ? -wallDy / wallLength : 0
  const normalY = wallLength > 0 ? wallDx / wallLength : 0
  
  // Calculate wall midpoint
  const midX = (startPoint.position.x + endPoint.position.x) / 2
  const midY = (startPoint.position.y + endPoint.position.y) / 2
  
  // Arrow positions offset from wall center
  const arrowOffset = 30
  const arrow1X = midX + normalX * arrowOffset
  const arrow1Y = midY + normalY * arrowOffset
  const arrow2X = midX - normalX * arrowOffset
  const arrow2Y = midY - normalY * arrowOffset

  return (
    <Group>
      <Line
        points={[startPoint.position.x, startPoint.position.y, endPoint.position.x, endPoint.position.y]}
        stroke={getWallColor()}
        strokeWidth={getStrokeWidth()}
        lineCap='round'
        onClick={activeTool === 'wall' ? undefined : handleClick}
        onTap={activeTool === 'wall' ? undefined : handleClick}
        onMouseDown={activeTool === 'wall' ? undefined : handleMouseDown}
        listening={activeTool !== 'wall'}
        draggable={false}
      />
      
      {/* Direction arrows when selected */}
      {isSelected && wallLength > 0 && (
        <>
          <Arrow
            points={[arrow1X, arrow1Y, arrow1X + normalX * 20, arrow1Y + normalY * 20]}
            stroke='#007acc'
            fill='#007acc'
            strokeWidth={2}
            pointerLength={8}
            pointerWidth={8}
            listening={false}
          />
          <Arrow
            points={[arrow2X, arrow2Y, arrow2X - normalX * 20, arrow2Y - normalY * 20]}
            stroke='#007acc'
            fill='#007acc'
            strokeWidth={2}
            pointerLength={8}
            pointerWidth={8}
            listening={false}
          />
        </>
      )}
    </Group>
  )
}
