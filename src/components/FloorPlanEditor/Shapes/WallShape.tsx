import { Line, Group, Arrow, Text } from 'react-konva'
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

  // Calculate wall angle for text rotation, keeping text as horizontal as possible
  const wallAngle = wallLength > 0 ? Math.atan2(wallDy, wallDx) : 0
  let wallAngleDegrees = (wallAngle * 180) / Math.PI

  // Normalize angle to keep text readable (between -90 and +90 degrees)
  if (wallAngleDegrees > 90) {
    wallAngleDegrees -= 180
  } else if (wallAngleDegrees < -90) {
    wallAngleDegrees += 180
  }

  // Arrow positions offset from wall center - much larger for visibility
  const arrowOffset = 200 // Much larger offset
  const arrow1X = midX + normalX * arrowOffset
  const arrow1Y = midY + normalY * arrowOffset
  const arrow2X = midX - normalX * arrowOffset
  const arrow2Y = midY - normalY * arrowOffset

  return (
    <Group>
      <Line
        points={[startPoint.position.x, startPoint.position.y, endPoint.position.x, endPoint.position.y]}
        stroke={getWallColor()}
        strokeWidth={wall.thickness}
        lineCap='round'
        onClick={activeTool === 'wall' ? undefined : handleClick}
        onTap={activeTool === 'wall' ? undefined : handleClick}
        onMouseDown={activeTool === 'wall' ? undefined : handleMouseDown}
        listening={activeTool !== 'wall'}
        draggable={false}
      />

      {/* Direction arrows when selected - much larger for visibility */}
      {isSelected && wallLength > 0 && (
        <>
          <Arrow
            points={[arrow1X, arrow1Y, arrow1X + normalX * 150, arrow1Y + normalY * 150]} // Much longer arrows
            stroke='#007acc'
            fill='#007acc'
            strokeWidth={15} // Much thicker stroke
            pointerLength={60} // Much larger pointer
            pointerWidth={60} // Much wider pointer
            listening={false}
          />
          <Arrow
            points={[arrow2X, arrow2Y, arrow2X - normalX * 150, arrow2Y - normalY * 150]} // Much longer arrows
            stroke='#007acc'
            fill='#007acc'
            strokeWidth={15} // Much thicker stroke
            pointerLength={60} // Much larger pointer
            pointerWidth={60} // Much wider pointer
            listening={false}
          />
          {/* Wall length label */}
          <Text
            x={midX}
            y={midY}
            text={`${(Number(wall.length) / 1000).toFixed(2)}m`} // Use model's computed length in meters
            fontSize={60}
            fontFamily='Arial'
            fontStyle='bold'
            fill='white'
            align='center'
            verticalAlign='middle'
            width={200}
            offsetX={100} // Center horizontally
            offsetY={30} // Center vertically
            rotation={wallAngleDegrees} // Rotate text to align with wall
            shadowColor='black'
            shadowBlur={8}
            shadowOpacity={0.6}
            listening={false}
          />
        </>
      )}
    </Group>
  )
}
