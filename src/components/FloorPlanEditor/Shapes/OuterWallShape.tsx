import { Group, Line } from 'react-konva'
import type { OuterWallPolygon } from '@/types/model'
import { useSelectionStore } from '../hooks/useSelectionStore'
import { OuterWallSegmentShape } from './OuterWallSegmentShape'
import { OuterCornerShape } from './OuterCornerShape'
import { COLORS } from '@/theme/colors'

interface OuterWallShapeProps {
  outerWall: OuterWallPolygon
}

export function OuterWallShape({ outerWall }: OuterWallShapeProps): React.JSX.Element {
  const select = useSelectionStore()
  const isSelected = select.isCurrentSelection(outerWall.id)

  const outerPolygon = outerWall.corners.map(c => c.outsidePoint)
  const innerPoints = outerWall.boundary.flatMap(point => [point[0], point[1]])
  const outerPoints = outerPolygon.flatMap(point => [point[0], point[1]])

  return (
    <Group name={`outer-wall-${outerWall.id}`} entityId={outerWall.id} entityType="outer-wall" parentIds={[]} listening>
      <Line points={innerPoints} fill={COLORS.canvas.buildingBackground} closed listening />

      {/* Render each segment */}
      {outerWall.segments.map((segment, index) => {
        const nextIndex = (index + 1) % outerWall.boundary.length
        const insideStartCorner = outerWall.boundary[index]
        const insideEndCorner = outerWall.boundary[nextIndex]
        const outsideStartCorner = outerWall.corners[index].outsidePoint
        const outsideEndCorner = outerWall.corners[nextIndex].outsidePoint
        return (
          <OuterWallSegmentShape
            key={`segment-${index}`}
            segment={segment}
            outerWallId={outerWall.id}
            insideStartCorner={insideStartCorner}
            insideEndCorner={insideEndCorner}
            outsideStartCorner={outsideStartCorner}
            outsideEndCorner={outsideEndCorner}
          />
        )
      })}

      {/* Render corner shapes */}
      {outerWall.corners.map((corner, cornerIndex) => {
        const prevSegmentIndex = (cornerIndex - 1 + outerWall.segments.length) % outerWall.segments.length
        const nextSegmentIndex = cornerIndex

        const previousSegment = outerWall.segments[prevSegmentIndex]
        const nextSegment = outerWall.segments[nextSegmentIndex]
        const boundaryPoint = outerWall.boundary[cornerIndex]

        return (
          <OuterCornerShape
            key={`corner-${cornerIndex}`}
            corner={corner}
            boundaryPoint={boundaryPoint}
            previousSegment={previousSegment}
            nextSegment={nextSegment}
            outerWallId={outerWall.id}
          />
        )
      })}

      {isSelected && (
        <>
          {/* Wall boundary outline */}
          <Line
            points={innerPoints}
            stroke={COLORS.selection.outline}
            strokeWidth={30}
            dash={[50, 50]}
            lineCap="round"
            opacity={0.5}
            closed
            listening={false}
          />

          {/* Wall boundary outline */}
          <Line
            points={outerPoints}
            stroke={COLORS.selection.outline}
            strokeWidth={30}
            dash={[50, 50]}
            lineCap="round"
            opacity={0.5}
            closed
            listening={false}
          />
        </>
      )}
    </Group>
  )
}
