import { Group, Line, Text } from 'react-konva'
import { useMemo } from 'react'
import type { OuterWallPolygon, OuterWallSegment } from '@/types/model'
import { getWallVisualization } from '@/components/FloorPlanEditor/visualization/wallVisualization'
import { distance, direction, midpoint } from '@/types/geometry'

interface OuterWallShapeProps {
  outerWall: OuterWallPolygon
  selectedSegmentIndex?: number
}

interface SegmentShapeProps {
  segment: OuterWallSegment
  segmentIndex: number
  isSelected: boolean
}

function OuterWallSegmentShape({ segment, segmentIndex, isSelected }: SegmentShapeProps): React.JSX.Element {
  // Get wall visualization for outer wall type based on construction type
  const wallViz = useMemo(() => {
    // Map outer wall construction types to wall types for visualization
    const visualizationType = segment.constructionType === 'non-strawbale' ? 'other' : 'outer'
    return getWallVisualization(visualizationType, segment.thickness)
  }, [segment.thickness, segment.constructionType])

  // Calculate segment properties
  const insideStart = segment.insideLine.start
  const insideEnd = segment.insideLine.end
  const outsideStart = segment.outsideLine.start
  const outsideEnd = segment.outsideLine.end

  const segmentLength = distance(insideStart, insideEnd)
  const segmentMidpoint = midpoint(insideStart, insideEnd)

  // Calculate text rotation to align with segment
  const segmentDirection = direction(insideStart, insideEnd)
  let angleDegrees = (Math.atan2(segmentDirection[1], segmentDirection[0]) * 180) / Math.PI

  // Keep text readable
  if (angleDegrees > 90) {
    angleDegrees -= 180
  } else if (angleDegrees < -90) {
    angleDegrees += 180
  }

  const finalMainColor = isSelected ? '#007acc' : wallViz.mainColor
  const opacity = segment.constructionType === 'non-strawbale' ? 0.7 : 1.0

  return (
    <Group name={`segment-${segmentIndex}`}>
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
        stroke={finalMainColor}
        strokeWidth={2}
        opacity={opacity}
        closed
        listening={false}
      />

      {/* Construction type pattern overlay */}
      {wallViz.pattern && (
        <Line
          points={[insideStart[0], insideStart[1], insideEnd[0], insideEnd[1]]}
          stroke={wallViz.pattern.color}
          strokeWidth={segment.thickness * 0.3}
          lineCap="butt"
          dash={wallViz.pattern.dash}
          opacity={opacity}
          listening={false}
        />
      )}

      {/* Plaster edges */}
      {wallViz.edges.map((edge, edgeIndex) => {
        // For outer walls: 'left' means inside face, 'right' means outside face
        // relative to the segment direction
        const isInsideEdge = edge.position === 'left'
        const baseLine = isInsideEdge ? segment.insideLine : segment.outsideLine

        return (
          <Line
            key={`edge-${edge.position}-${edgeIndex}`}
            points={[baseLine.start[0], baseLine.start[1], baseLine.end[0], baseLine.end[1]]}
            stroke={edge.color}
            strokeWidth={edge.width}
            lineCap="butt"
            opacity={opacity}
            listening={false}
          />
        )
      })}

      {/* Segment length label when selected */}
      {isSelected && segmentLength > 0 && (
        <Text
          x={segmentMidpoint[0]}
          y={segmentMidpoint[1]}
          text={`${(segmentLength / 1000).toFixed(2)}m`}
          fontSize={40}
          fontFamily="Arial"
          fontStyle="bold"
          fill="white"
          align="center"
          verticalAlign="middle"
          width={150}
          offsetX={75}
          offsetY={20}
          rotation={angleDegrees}
          shadowColor="black"
          shadowBlur={6}
          shadowOpacity={0.8}
          listening={false}
        />
      )}
    </Group>
  )
}

export function OuterWallShape({ outerWall, selectedSegmentIndex }: OuterWallShapeProps): React.JSX.Element {
  return (
    <Group name={`outer-wall-${outerWall.id}`}>
      {/* Render each segment */}
      {outerWall.segments.map((segment, index) => {
        const isSelected = selectedSegmentIndex === index

        return (
          <OuterWallSegmentShape
            key={`segment-${index}`}
            segment={segment}
            segmentIndex={index}
            isSelected={isSelected}
          />
        )
      })}

      {/* Wall boundary outline */}
      <Line
        points={outerWall.boundary.flatMap(point => [point[0], point[1]])}
        stroke="#1e40af"
        strokeWidth={3}
        dash={[15, 15]}
        closed
        listening={false}
      />
    </Group>
  )
}
