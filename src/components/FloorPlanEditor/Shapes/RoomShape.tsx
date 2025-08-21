import { Line, Text } from 'react-konva'
import type { Room } from '@/types/model'
import { useSelectedEntity, useEditorStore, useActiveTool } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { useWalls, usePoints } from '@/model/store'

interface RoomShapeProps {
  room: Room
}

function getRoomPolygonPoints (room: Room, walls: ReturnType<typeof useWalls>, pointMap: ReturnType<typeof usePoints>): number[] {
  const points: number[] = []

  for (const wallId of room.wallIds) {
    const wall = walls.get(wallId)
    if (wall == null) continue

    const startPoint = pointMap.get(wall.startPointId)
    const endPoint = pointMap.get(wall.endPointId)

    if (startPoint == null || endPoint == null) continue

    if (points.length === 0) {
      points.push(startPoint.position.x, startPoint.position.y)
    }
    points.push(endPoint.position.x, endPoint.position.y)
  }

  return points
}

function getRoomCenter (points: number[]): { x: number, y: number } {
  if (points.length < 6) return { x: 0, y: 0 }

  let sumX = 0
  let sumY = 0
  const numPoints = points.length / 2

  for (let i = 0; i < points.length; i += 2) {
    sumX += points[i]
    sumY += points[i + 1]
  }

  return {
    x: sumX / numPoints,
    y: sumY / numPoints
  }
}

export function RoomShape ({ room }: RoomShapeProps): React.JSX.Element | null {
  // Use individual selectors to avoid object creation
  const selectedEntity = useSelectedEntity()
  const selectEntity = useEditorStore(state => state.selectEntity)
  const showRoomLabels = useEditorStore(state => state.showRoomLabels)
  const activeTool = useActiveTool()
  const walls = useWalls()
  const pointMap = usePoints()

  const isSelected = selectedEntity === room.id
  const points = getRoomPolygonPoints(room, walls, pointMap)

  if (points.length < 6) {
    return null
  }

  const center = getRoomCenter(points)

  const handleClick = (): void => {
    // In wall creation mode, don't handle room selection
    if (activeTool === 'wall') {
      return
    }

    selectEntity(room.id)
  }

  return (
    <>
      <Line
        points={points}
        fill={isSelected ? 'rgba(0, 122, 204, 0.2)' : 'rgba(200, 200, 200, 0.1)'}
        stroke={isSelected ? '#007acc' : '#cccccc'}
        strokeWidth={8} // Thicker stroke for visibility
        closed
        onClick={activeTool === 'wall' ? undefined : handleClick}
        onTap={activeTool === 'wall' ? undefined : handleClick}
        listening={activeTool !== 'wall'}
      />
      {showRoomLabels && (
        <Text
          x={center.x}
          y={center.y}
          text={room.name}
          fontSize={80} // Much larger font for real-world scale
          fontFamily='Arial'
          fontStyle='bold' // Make text bold for better visibility
          fill='#333333'
          align='center'
          verticalAlign='middle'
          offsetX={room.name.length * 20} // Adjust offset for larger font
          offsetY={40} // Adjust vertical offset for larger font
          // Add shadow for better readability
          shadowColor='white'
          shadowBlur={10}
          shadowOpacity={0.8}
          listening={false}
        />
      )}
    </>
  )
}
