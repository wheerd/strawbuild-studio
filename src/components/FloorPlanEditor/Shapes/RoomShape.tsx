import { Line, Text } from 'react-konva'
import type { Room, Building } from '../../../types/model'
import { useModelStore } from '../../../model/store'
import { useEditorStore } from '../hooks/useEditorStore'

interface RoomShapeProps {
  room: Room
  building: Building
}

function getRoomPolygonPoints (room: Room, building: Building): number[] {
  const points: number[] = []

  for (const wallId of room.wallIds) {
    const wall = building.walls.get(wallId)
    if (wall == null) continue

    const startPoint = building.connectionPoints.get(wall.startPointId)
    const endPoint = building.connectionPoints.get(wall.endPointId)

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

export function RoomShape ({ room, building }: RoomShapeProps): React.JSX.Element | null {
  // Use individual selectors to avoid object creation
  const selectedEntities = useModelStore(state => state.selectedEntityIds)
  const toggleEntitySelection = useModelStore(state => state.toggleEntitySelection)
  const showRoomLabels = useEditorStore(state => state.showRoomLabels)

  const isSelected = selectedEntities.includes(room.id)
  const points = getRoomPolygonPoints(room, building)

  if (points.length < 6) {
    return null
  }

  const center = getRoomCenter(points)

  const handleClick = (): void => {
    toggleEntitySelection(room.id)
  }

  return (
    <>
      <Line
        points={points}
        fill={isSelected ? 'rgba(0, 122, 204, 0.2)' : 'rgba(200, 200, 200, 0.1)'}
        stroke={isSelected ? '#007acc' : '#cccccc'}
        strokeWidth={1}
        closed
        onClick={handleClick}
        onTap={handleClick}
      />
      {showRoomLabels && (
        <Text
          x={center.x}
          y={center.y}
          text={room.name}
          fontSize={14}
          fontFamily='Arial'
          fill='#333333'
          align='center'
          verticalAlign='middle'
          offsetX={room.name.length * 4}
          offsetY={7}
          listening={false}
        />
      )}
    </>
  )
}
