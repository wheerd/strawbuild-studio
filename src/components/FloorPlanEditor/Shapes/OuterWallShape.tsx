import { Group, Line } from 'react-konva'
import type { OuterWallPolygon, OuterWallSegment } from '@/types/model'
import { WALL_COLORS } from '@/components/FloorPlanEditor/visualization/wallVisualization'
import { direction, midpoint, add, scale, type Vec2 } from '@/types/geometry'
import { useSelectionStore } from '../hooks/useSelectionStore'
import { LengthIndicator } from '../components/LengthIndicator'
import type { OuterWallId } from '@/model'

interface OuterWallShapeProps {
  outerWall: OuterWallPolygon
}

interface SegmentShapeProps {
  segment: OuterWallSegment
  outerWallId: OuterWallId
  insideStartCorner: Vec2
  insideEndCorner: Vec2
  outsideStartCorner: Vec2
  outsideEndCorner: Vec2
}

function OuterWallSegmentShape({
  segment,
  outerWallId,
  insideStartCorner,
  insideEndCorner,
  outsideStartCorner,
  outsideEndCorner
}: SegmentShapeProps): React.JSX.Element {
  const select = useSelectionStore()

  // Calculate segment properties
  const insideStart = segment.insideLine.start
  const insideEnd = segment.insideLine.end
  const outsideStart = segment.outsideLine.start
  const outsideEnd = segment.outsideLine.end

  // Calculate text rotation to align with segment
  const segmentDirection = direction(insideStart, insideEnd)
  let angleDegrees = (Math.atan2(segmentDirection[1], segmentDirection[0]) * 180) / Math.PI

  // Keep text readable
  if (angleDegrees > 90) {
    angleDegrees -= 180
  } else if (angleDegrees < -90) {
    angleDegrees += 180
  }

  const baseColor = segment.constructionType === 'non-strawbale' ? WALL_COLORS.other : WALL_COLORS.strawbale
  const finalMainColor = select.isSelected(segment.id) ? '#007acc' : baseColor

  return (
    <Group
      name={`segment-${segment.id}`}
      entityId={segment.id}
      entityType="wall-segment"
      parentIds={[outerWallId]}
      listening
    >
      {/* Main wall body - fill the area between inside and outside lines */}
      <Line
        points={[
          insideStart[0],
          insideStart[1],
          insideEnd[0],
          insideEnd[1],
          outsideEnd[0],
          outsideEnd[1],
          outsideStart[0],
          outsideStart[1]
        ]}
        fill={finalMainColor}
        stroke="#000"
        strokeWidth={10}
        closed
        listening
      />

      {/* Render openings in this segment */}
      {segment.openings.map((opening, openingIndex) => {
        // Calculate opening position along the segment
        const segmentVector = direction(insideStart, insideEnd)
        const offsetDistance = opening.offsetFromStart
        const centerStart = midpoint(insideStart, outsideStart)
        const offsetStart = scale(segmentVector, offsetDistance)
        const offsetEnd = add(offsetStart, scale(segmentVector, opening.width))
        const openingStart = add(centerStart, scale(segmentVector, offsetDistance))
        const openingEnd = add(openingStart, scale(segmentVector, opening.width))
        const openingPolygon = [
          add(insideStart, offsetStart),
          add(insideStart, offsetEnd),
          add(outsideStart, offsetEnd),
          add(outsideStart, offsetStart)
        ]
        const openingPolygonArray = openingPolygon.flatMap(point => [point[0], point[1]])
        const isOpeningSelected = select.isCurrentSelection(opening.id)

        return (
          <Group
            key={`opening-${openingIndex}`}
            listening
            ref={node => {
              if (node) {
                // Explicitly set entity attributes on the Konva node
                node.setAttrs({
                  entityId: opening.id,
                  entityType: 'opening',
                  parentIds: [outerWallId, segment.id]
                })
              }
            }}
          >
            {/* Opening cutout - render as a different colored line */}
            <Line
              points={openingPolygonArray}
              fill={isOpeningSelected ? '#F99' : '#999'}
              stroke={isOpeningSelected ? '#cc0014' : 'black'}
              strokeWidth={10}
              lineCap="butt"
              opacity={0.8}
              closed
              listening
            />
            {opening.type !== 'passage' && (
              <Line
                points={[openingStart[0], openingStart[1], openingEnd[0], openingEnd[1]]}
                stroke={opening.type === 'door' ? '#8B4513' : '#87CEEB'}
                strokeWidth={30}
                lineCap="butt"
                listening
              />
            )}
          </Group>
        )
      })}

      {/* Segment length indicators when selected */}
      {select.isCurrentSelection(segment.id) && (
        <>
          <LengthIndicator
            startPoint={insideStartCorner}
            endPoint={insideEndCorner}
            label={`${(segment.insideLength / 1000).toFixed(2)}m`}
            offset={-60}
            color="#333"
            fontSize={60}
            strokeWidth={5}
          />
          <LengthIndicator
            startPoint={outsideStartCorner}
            endPoint={outsideEndCorner}
            label={`${(segment.outsideLength / 1000).toFixed(2)}m`}
            offset={60}
            color="#333"
            fontSize={60}
            strokeWidth={5}
          />
        </>
      )}
    </Group>
  )
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
