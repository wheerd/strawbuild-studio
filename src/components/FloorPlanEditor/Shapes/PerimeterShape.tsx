import { Group, Line } from 'react-konva'
import type { Perimeter } from '@/types/model'
import { OuterWallSegmentShape } from './OuterWallSegmentShape'
import { OuterCornerShape } from './OuterCornerShape'
import { COLORS } from '@/theme/colors'

interface PerimeterShapeProps {
  perimeter: Perimeter
}

export function PerimeterShape({ perimeter }: PerimeterShapeProps): React.JSX.Element {
  const innerPoints = perimeter.boundary.flatMap(point => [point[0], point[1]])

  return (
    <Group name={`perimeter-${perimeter.id}`} entityId={perimeter.id} entityType="perimeter" parentIds={[]} listening>
      <Line points={innerPoints} fill={COLORS.canvas.buildingBackground} closed listening />

      {/* Render each segment */}
      {perimeter.segments.map((segment, index) => {
        const nextIndex = (index + 1) % perimeter.boundary.length
        const insideStartCorner = perimeter.boundary[index]
        const insideEndCorner = perimeter.boundary[nextIndex]
        const outsideStartCorner = perimeter.corners[index].outsidePoint
        const outsideEndCorner = perimeter.corners[nextIndex].outsidePoint
        return (
          <OuterWallSegmentShape
            key={`segment-${index}`}
            segment={segment}
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
        const prevSegmentIndex = (cornerIndex - 1 + perimeter.segments.length) % perimeter.segments.length
        const nextSegmentIndex = cornerIndex

        const previousSegment = perimeter.segments[prevSegmentIndex]
        const nextSegment = perimeter.segments[nextSegmentIndex]
        const boundaryPoint = perimeter.boundary[cornerIndex]

        return (
          <OuterCornerShape
            key={`corner-${cornerIndex}`}
            corner={corner}
            boundaryPoint={boundaryPoint}
            previousSegment={previousSegment}
            nextSegment={nextSegment}
            perimeterId={perimeter.id}
          />
        )
      })}
    </Group>
  )
}
