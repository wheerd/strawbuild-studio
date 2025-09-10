import { Group, Line } from 'react-konva'
import type { Perimeter } from '@/types/model'
import { PerimeterWallShape } from './PerimeterWallShape'
import { PerimeterCornerShape } from './PerimeterCornerShape'
import { COLORS } from '@/theme/colors'

interface PerimeterShapeProps {
  perimeter: Perimeter
}

export function PerimeterShape({ perimeter }: PerimeterShapeProps): React.JSX.Element {
  const innerPoints = perimeter.boundary.flatMap(point => [point[0], point[1]])

  return (
    <Group name={`perimeter-${perimeter.id}`} entityId={perimeter.id} entityType="perimeter" parentIds={[]} listening>
      <Line points={innerPoints} fill={COLORS.canvas.buildingBackground} closed listening />

      {/* Render each wall */}
      {perimeter.walls.map((wall, index) => {
        const nextIndex = (index + 1) % perimeter.boundary.length
        const insideStartCorner = perimeter.boundary[index]
        const insideEndCorner = perimeter.boundary[nextIndex]
        const outsideStartCorner = perimeter.corners[index].outsidePoint
        const outsideEndCorner = perimeter.corners[nextIndex].outsidePoint
        return (
          <PerimeterWallShape
            key={`wall-${index}`}
            wall={wall}
            perimeterId={perimeter.id}
            insideStartCorner={insideStartCorner}
            insideEndCorner={insideEndCorner}
            outsideStartCorner={outsideStartCorner}
            outsideEndCorner={outsideEndCorner}
          />
        )
      })}

      {/* Render corner shapes */}
      {perimeter.corners.map((corner, cornerIndex) => {
        const prevWallIndex = (cornerIndex - 1 + perimeter.walls.length) % perimeter.walls.length
        const nextWallIndex = cornerIndex

        const previousWall = perimeter.walls[prevWallIndex]
        const nextWall = perimeter.walls[nextWallIndex]
        const boundaryPoint = perimeter.boundary[cornerIndex]

        return (
          <PerimeterCornerShape
            key={`corner-${cornerIndex}`}
            corner={corner}
            boundaryPoint={boundaryPoint}
            previousWall={previousWall}
            nextWall={nextWall}
            perimeterId={perimeter.id}
          />
        )
      })}
    </Group>
  )
}
