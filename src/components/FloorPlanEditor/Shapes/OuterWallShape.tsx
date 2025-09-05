import { Group, Line } from 'react-konva'
import type { OuterWallPolygon } from '@/types/model'
import { useSelectionStore } from '../hooks/useSelectionStore'
import { OuterWallSegmentShape } from './OuterWallSegmentShape'

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
      <Line points={innerPoints} fill="#AAA" closed listening />

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

      {isSelected && (
        <>
          {/* Wall boundary outline */}
          <Line
            points={innerPoints}
            stroke="#1e40af"
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
            stroke="#1e40af"
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
