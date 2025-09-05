import { Group, Line } from 'react-konva'
import type { OuterWallSegment } from '@/types/model'
import { COLORS } from '@/theme/colors'
import { direction, type Vec2 } from '@/types/geometry'
import { useSelectionStore } from '../hooks/useSelectionStore'
import { LengthIndicator } from '../components/LengthIndicator'
import { OpeningShape } from './OpeningShape'
import type { OuterWallId } from '@/model'

interface OuterWallSegmentShapeProps {
  segment: OuterWallSegment
  outerWallId: OuterWallId
  insideStartCorner: Vec2
  insideEndCorner: Vec2
  outsideStartCorner: Vec2
  outsideEndCorner: Vec2
}

export function OuterWallSegmentShape({
  segment,
  outerWallId,
  insideStartCorner,
  insideEndCorner,
  outsideStartCorner,
  outsideEndCorner
}: OuterWallSegmentShapeProps): React.JSX.Element {
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

  const baseColor = segment.constructionType === 'non-strawbale' ? COLORS.materials.other : COLORS.materials.strawbale
  const finalMainColor = select.isSelected(segment.id) ? COLORS.selection.primary : baseColor

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
        stroke={COLORS.ui.black}
        strokeWidth={10}
        closed
        listening
      />

      {/* Render openings in this segment */}
      {segment.openings.map(opening => (
        <OpeningShape
          key={`opening-${opening.id}`}
          opening={opening}
          segment={segment}
          outerWallId={outerWallId}
          insideStartCorner={insideStartCorner}
          insideEndCorner={insideEndCorner}
          outsideStartCorner={outsideStartCorner}
          outsideEndCorner={outsideEndCorner}
        />
      ))}

      {/* Segment length indicators when selected */}
      {select.isCurrentSelection(segment.id) && (
        <>
          <LengthIndicator
            startPoint={insideStartCorner}
            endPoint={insideEndCorner}
            label={`${(segment.insideLength / 1000).toFixed(2)}m`}
            offset={-60}
            color={COLORS.indicators.main}
            fontSize={60}
            strokeWidth={5}
          />
          <LengthIndicator
            startPoint={outsideStartCorner}
            endPoint={outsideEndCorner}
            label={`${(segment.outsideLength / 1000).toFixed(2)}m`}
            offset={60}
            color={COLORS.indicators.main}
            fontSize={60}
            strokeWidth={5}
          />
        </>
      )}
    </Group>
  )
}
