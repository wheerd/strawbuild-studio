import { Group, Line, Circle } from 'react-konva'
import { useMemo } from 'react'
import type { OuterCorner, OuterWallSegment } from '@/types/model'
import type { Vec2 } from '@/types/geometry'

interface OuterCornerShapeProps {
  corner: OuterCorner
  cornerIndex: number
  boundaryPoint: Vec2
  previousSegment: OuterWallSegment
  nextSegment: OuterWallSegment
  isSelected: boolean
}

export function OuterCornerShape({
  corner,
  cornerIndex,
  boundaryPoint,
  previousSegment,
  nextSegment,
  isSelected
}: OuterCornerShapeProps): React.JSX.Element {
  // Create corner polygon from boundary point, outside point, and adjacent segment endpoints
  const cornerPolygon = useMemo(() => {
    const points: Vec2[] = []

    // Add boundary point
    points.push(boundaryPoint)

    // Add segment endpoints that connect to this corner
    if (corner.belongsTo === 'previous') {
      // Corner belongs to previous segment
      points.push(previousSegment.outsideLine.end)
      points.push(corner.outsidePoint)
      points.push(nextSegment.outsideLine.start)
    } else {
      // Corner belongs to next segment
      points.push(previousSegment.outsideLine.end)
      points.push(corner.outsidePoint)
      points.push(nextSegment.outsideLine.start)
    }

    return points
  }, [corner, boundaryPoint, previousSegment, nextSegment])

  // Convert polygon points to flat array for Konva
  const polygonArray: number[] = []
  for (const point of cornerPolygon) {
    polygonArray.push(point[0], point[1])
  }

  // Determine corner color based on which segment it belongs to
  const belongsToSegment = corner.belongsTo === 'previous' ? previousSegment : nextSegment
  const cornerColor = belongsToSegment.constructionType === 'non-strawbale' ? '#6B7280' : '#DAA520'
  const finalColor = isSelected ? '#007acc' : cornerColor
  const opacity = belongsToSegment.constructionType === 'non-strawbale' ? 0.7 : 1.0

  return (
    <Group name={`outer-corner-${cornerIndex}`}>
      {/* Corner polygon fill */}
      <Line
        points={polygonArray}
        fill={finalColor}
        stroke={finalColor}
        strokeWidth={1}
        opacity={opacity}
        closed
        listening={false}
      />

      {/* Construction type indicator - different patterns for different types */}
      {belongsToSegment.constructionType === 'cells-under-tension' && (
        <Line
          points={[boundaryPoint[0], boundaryPoint[1], corner.outsidePoint[0], corner.outsidePoint[1]]}
          stroke="#8B4513"
          strokeWidth={8}
          dash={[20, 20]}
          opacity={opacity}
          listening={false}
        />
      )}

      {belongsToSegment.constructionType === 'infill' && (
        <Line
          points={[boundaryPoint[0], boundaryPoint[1], corner.outsidePoint[0], corner.outsidePoint[1]]}
          stroke="#CD853F"
          strokeWidth={6}
          dash={[10, 30, 10]}
          opacity={opacity}
          listening={false}
        />
      )}

      {belongsToSegment.constructionType === 'strawhenge' && (
        <>
          <Line
            points={[boundaryPoint[0], boundaryPoint[1], corner.outsidePoint[0], corner.outsidePoint[1]]}
            stroke="#8B4513"
            strokeWidth={12}
            opacity={opacity}
            listening={false}
          />
          <Circle
            x={(boundaryPoint[0] + corner.outsidePoint[0]) / 2}
            y={(boundaryPoint[1] + corner.outsidePoint[1]) / 2}
            radius={15}
            fill="#654321"
            opacity={opacity}
            listening={false}
          />
        </>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <>
          <Line points={polygonArray} stroke="#007acc" strokeWidth={4} dash={[15, 15]} closed listening={false} />
          <Circle
            x={corner.outsidePoint[0]}
            y={corner.outsidePoint[1]}
            radius={20}
            fill="#007acc"
            opacity={0.8}
            listening={false}
          />
        </>
      )}

      {/* Corner ownership indicator - small arrow or marker */}
      {isSelected && (
        <Line
          points={[boundaryPoint[0], boundaryPoint[1], corner.outsidePoint[0], corner.outsidePoint[1]]}
          stroke={corner.belongsTo === 'previous' ? '#FF6B6B' : '#4ECDC4'}
          strokeWidth={6}
          listening={false}
        />
      )}
    </Group>
  )
}
