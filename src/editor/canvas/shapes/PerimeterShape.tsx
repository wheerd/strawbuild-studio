import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { Perimeter } from '@/building/model'
import { useViewMode } from '@/editor/hooks/useViewMode'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

import { PerimeterCornerShape } from './PerimeterCornerShape'
import { PerimeterWallShape } from './PerimeterWallShape'

interface PerimeterShapeProps {
  perimeter: PerimeterWithGeometry
}

export function PerimeterShape({ perimeter }: PerimeterShapeProps): React.JSX.Element {
  const mode = useViewMode()
  const theme = useCanvasTheme()
  const innerPoints = perimeter.corners.flatMap(corner => [corner.insidePoint[0], corner.insidePoint[1]])
  const outerPoints = perimeter.corners.flatMap(corner => [corner.outsidePoint[0], corner.outsidePoint[1]])

  if (mode !== 'walls') {
    return (
      <Group
        name={`perimeter-${perimeter.id}`}
        entityId={perimeter.id}
        entityType="perimeter"
        parentIds={[]}
        listening={false}
      >
        <Line points={outerPoints} closed opacity={0.3} fill={theme.secondaryLight} listening={false} />
        <Line
          points={outerPoints}
          closed
          stroke={theme.border}
          strokeWidth={40}
          dash={[120, 60]}
          opacity={0.6}
          listening={false}
        />
        <Line
          points={innerPoints}
          closed
          stroke={theme.border}
          strokeWidth={40}
          dash={[120, 60]}
          opacity={0.6}
          listening={false}
        />
      </Group>
    )
  }

  return (
    <Group name={`perimeter-${perimeter.id}`} entityId={perimeter.id} entityType="perimeter" parentIds={[]} listening>
      <Line points={innerPoints} fill="none" opacity={0} closed listening />

      {/* Render corner shapes */}
      {perimeter.corners.map((corner, cornerIndex) => {
        const prevWallIndex = (cornerIndex - 1 + perimeter.walls.length) % perimeter.walls.length
        const nextWallIndex = cornerIndex

        const previousWall = perimeter.walls[prevWallIndex]
        const nextWall = perimeter.walls[nextWallIndex]

        return (
          <PerimeterCornerShape
            key={`corner-${cornerIndex}`}
            corner={corner}
            previousWall={previousWall}
            nextWall={nextWall}
            perimeterId={perimeter.id}
          />
        )
      })}

      {/* Render each wall */}
      {perimeter.walls.map((wall, index) => {
        const nextIndex = (index + 1) % perimeter.corners.length
        const insideStartCorner = perimeter.corners[index].insidePoint
        const insideEndCorner = perimeter.corners[nextIndex].insidePoint
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
    </Group>
  )
}
