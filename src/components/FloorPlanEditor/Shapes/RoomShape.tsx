import { Line, Text } from 'react-konva'
import type { Room } from '@/types/model'
import type { PointId } from '@/types/ids'
import { useSelectedEntity, useEditorStore, useActiveTool } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { usePoints } from '@/model/store'
import type { Point2D } from '@/types/geometry'

interface RoomShapeProps {
  room: Room
}

function getRoomCenter(points: number[]): { x: number; y: number } {
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

export function RoomShape({ room }: RoomShapeProps): React.JSX.Element | null {
  // Use individual selectors to avoid object creation
  const selectedEntity = useSelectedEntity()
  const selectEntity = useEditorStore(state => state.selectEntity)
  const showRoomLabels = useEditorStore(state => state.showRoomLabels)
  const activeTool = useActiveTool()
  const pointMap = usePoints()

  const isSelected = selectedEntity === room.id
  const points = room.outerBoundary.pointIds
    .map((pointId: PointId) => {
      const point = pointMap.get(pointId)
      return point?.position
    })
    .filter((pos): pos is Point2D => pos !== undefined)
    .flatMap(pos => [pos[0], pos[1]])

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
          fontFamily="Arial"
          fontStyle="bold" // Make text bold for better visibility
          fill="#333333"
          align="center"
          verticalAlign="middle"
          width={room.name.length * 50} // Approximate width for proper centering
          height={100} // Height for proper vertical centering
          offsetX={(room.name.length * 50) / 2} // Center horizontally
          offsetY={50} // Center vertically
          // Add shadow for better readability
          shadowColor="white"
          shadowBlur={10}
          shadowOpacity={0.8}
          listening={false}
        />
      )}
    </>
  )
}
