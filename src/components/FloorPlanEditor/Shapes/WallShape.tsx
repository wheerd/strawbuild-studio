import { Line, Group, Arrow, Text } from 'react-konva'
import type Konva from 'konva'
import { useCallback, useRef } from 'react'
import type { Wall } from '@/types/model'
import { useSelectedEntity, useEditorStore, useActiveTool } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { usePoints, useCorners, useWallLength } from '@/model/store'
import { createPoint2D } from '@/types/geometry'
import { getWallVisualization } from '@/components/FloorPlanEditor/visualization/wallVisualization'

interface WallShapeProps {
  wall: Wall
}

export function WallShape({ wall }: WallShapeProps): React.JSX.Element | null {
  // Use individual selectors to avoid object creation
  const selectedEntity = useSelectedEntity()
  const selectEntity = useEditorStore(state => state.selectEntity)
  const setSelectedEntity = useEditorStore(state => state.setSelectedEntity)
  const startDrag = useEditorStore(state => state.startDrag)
  const points = usePoints()
  const corners = useCorners()
  const activeTool = useActiveTool()
  const hasDraggedRef = useRef(false)
  const getWallLength = useWallLength()
  const startPoint = points.get(wall.startPointId)
  const endPoint = points.get(wall.endPointId)

  if (startPoint == null || endPoint == null) {
    return null
  }

  const isSelected = selectedEntity === wall.id

  // Check if this wall is a main wall of a selected corner
  const isMainWallOfSelectedCorner = Array.from(corners.values()).some(
    corner => selectedEntity === corner.pointId && (corner.wall1Id === wall.id || corner.wall2Id === wall.id)
  )

  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>): void => {
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
    },
    [selectEntity, wall.id, activeTool]
  )

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>): void => {
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
        startDrag('wall', createPoint2D(pointer.x, pointer.y), wall.id)
        // Mark that we started a drag operation
        hasDraggedRef.current = true
      }
    },
    [startDrag, setSelectedEntity, wall.id, activeTool]
  )

  // Get wall visualization using shared utility
  const wallViz = getWallVisualization(wall.type, wall.thickness, wall.outsideDirection)

  // Calculate wall perpendicular direction for arrows and plaster edges
  const wallDx = endPoint.position[0] - startPoint.position[0]
  const wallDy = endPoint.position[1] - startPoint.position[1]
  const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy)

  // Get perpendicular vector (normal to wall)
  const normalX = wallLength > 0 ? -wallDy / wallLength : 0
  const normalY = wallLength > 0 ? wallDx / wallLength : 0

  // Calculate wall midpoint
  const midX = (startPoint.position[0] + endPoint.position[0]) / 2
  const midY = (startPoint.position[1] + endPoint.position[1]) / 2

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
  const arrowOffset = wall.thickness * 0.7 // Much larger offset
  const arrow1X = midX + normalX * arrowOffset
  const arrow1Y = midY + normalY * arrowOffset
  const arrow2X = midX - normalX * arrowOffset
  const arrow2Y = midY - normalY * arrowOffset

  // Selection/state color overrides
  const finalMainColor = isSelected ? '#007acc' : isMainWallOfSelectedCorner ? '#00cc66' : wallViz.mainColor

  return (
    <Group>
      {/* Main wall body */}
      <Line
        points={[startPoint.position[0], startPoint.position[1], endPoint.position[0], endPoint.position[1]]}
        stroke={finalMainColor}
        strokeWidth={wallViz.strokeWidth}
        lineCap="butt"
        onClick={activeTool === 'wall' ? undefined : handleClick}
        onTap={activeTool === 'wall' ? undefined : handleClick}
        onMouseDown={activeTool === 'wall' ? undefined : handleMouseDown}
        listening={activeTool !== 'wall'}
        draggable={false}
      />

      {/* Wood support pattern for structural walls */}
      {wallViz.pattern && (
        <Line
          points={[startPoint.position[0], startPoint.position[1], endPoint.position[0], endPoint.position[1]]}
          stroke={wallViz.pattern.color}
          strokeWidth={wallViz.strokeWidth}
          lineCap="butt"
          dash={wallViz.pattern.dash}
          listening={false}
        />
      )}

      {/* Plaster edges */}
      {wallViz.edges.map((edge, index) => {
        // For walls going start->end: positive normal is "left", negative normal is "right"
        const normalDirection = edge.position === 'left' ? 1 : -1

        // Position edge inside the wall thickness boundary
        // Edge center is at wall boundary minus half edge width (to keep edge inside)
        const edgeOffset = (wallViz.strokeWidth / 2 - edge.width / 2) * normalDirection

        return (
          <Line
            key={`edge-${edge.position}-${index}`}
            points={[
              startPoint.position[0] + normalX * edgeOffset,
              startPoint.position[1] + normalY * edgeOffset,
              endPoint.position[0] + normalX * edgeOffset,
              endPoint.position[1] + normalY * edgeOffset
            ]}
            stroke={edge.color}
            strokeWidth={edge.width}
            lineCap="butt"
            listening={false}
          />
        )
      })}

      {/* Direction arrows when selected - much larger for visibility */}
      {isSelected && wallLength > 0 && (
        <>
          <Arrow
            points={[arrow1X, arrow1Y, arrow1X + normalX * 150, arrow1Y + normalY * 150]} // Much longer arrows
            stroke="#007acc"
            fill="#007acc"
            strokeWidth={15} // Much thicker stroke
            pointerLength={60} // Much larger pointer
            pointerWidth={60} // Much wider pointer
            listening={false}
          />
          <Arrow
            points={[arrow2X, arrow2Y, arrow2X - normalX * 150, arrow2Y - normalY * 150]} // Much longer arrows
            stroke="#007acc"
            fill="#007acc"
            strokeWidth={15} // Much thicker stroke
            pointerLength={60} // Much larger pointer
            pointerWidth={60} // Much wider pointer
            listening={false}
          />
          {/* Wall length label */}
          <Text
            x={midX}
            y={midY}
            text={`${(getWallLength(wall.id) / 1000).toFixed(2)}m`} // Use model's computed length in meters
            fontSize={60}
            fontFamily="Arial"
            fontStyle="bold"
            fill="white"
            align="center"
            verticalAlign="middle"
            width={200}
            offsetX={100} // Center horizontally
            offsetY={30} // Center vertically
            rotation={wallAngleDegrees} // Rotate text to align with wall
            shadowColor="black"
            shadowBlur={8}
            shadowOpacity={0.6}
            listening={false}
          />
        </>
      )}
    </Group>
  )
}
