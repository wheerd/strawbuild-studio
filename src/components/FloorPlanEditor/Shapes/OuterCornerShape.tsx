import { Group, Line, Circle, Arrow } from 'react-konva'
import type { OuterCorner, OuterWallSegment } from '@/types/model'
import { add, midpoint, scale, type Vec2 } from '@/types/geometry'
import { WALL_COLORS } from '../visualization/wallVisualization'
import { useSelectionStore } from '../hooks/useSelectionStore'

interface OuterCornerShapeProps {
  corner: OuterCorner
  boundaryPoint: Vec2
  previousSegment: OuterWallSegment
  nextSegment: OuterWallSegment
  outerWallId: string
}

export function OuterCornerShape({
  corner,
  boundaryPoint,
  previousSegment,
  nextSegment,
  outerWallId
}: OuterCornerShapeProps): React.JSX.Element {
  const select = useSelectionStore()
  const isSelected = select.isCurrentSelection(corner.id)

  const cornerPolygon = [
    boundaryPoint,
    previousSegment.insideLine.end,
    previousSegment.outsideLine.end,
    corner.outsidePoint,
    nextSegment.outsideLine.start,
    nextSegment.insideLine.start
  ]
  const polygonArray = cornerPolygon.flatMap(point => [point[0], point[1]])

  const arrowDir = corner.belongsTo === 'previous' ? previousSegment.direction : scale(nextSegment.direction, -1)
  const arrowCenter =
    corner.belongsTo === 'previous'
      ? midpoint(previousSegment.insideLine.end, previousSegment.outsideLine.end)
      : midpoint(nextSegment.insideLine.start, nextSegment.outsideLine.start)
  const arrowStart = add(arrowCenter, scale(arrowDir, -40))
  const arrowEnd = add(arrowCenter, scale(arrowDir, 60))

  const belongsToSegment = corner.belongsTo === 'previous' ? previousSegment : nextSegment
  const cornerColor = belongsToSegment.constructionType === 'non-strawbale' ? WALL_COLORS.other : WALL_COLORS.strawbale
  const finalColor = isSelected ? '#007acc' : cornerColor

  return (
    <Group
      name={`outer-corner-${corner.id}`}
      entityId={corner.id}
      entityType="outer-corner"
      parentIds={[outerWallId]}
      listening
    >
      {/* Corner polygon fill */}
      <Line points={polygonArray} fill={finalColor} stroke="black" strokeWidth={10} closed listening />

      <Line
        points={[boundaryPoint[0], boundaryPoint[1], corner.outsidePoint[0], corner.outsidePoint[1]]}
        stroke="#8B4513"
        strokeWidth={8}
        dash={[20, 20]}
        listening={false}
      />

      {/* Selection indicator */}
      {isSelected && (
        <>
          <Circle
            x={boundaryPoint[0]}
            y={boundaryPoint[1]}
            radius={30}
            fill="#cc0014"
            opacity={0.8}
            listening={false}
          />
        </>
      )}

      {/* Corner ownership indicator - small arrow */}
      {isSelected && (
        <Arrow
          points={[arrowStart[0], arrowStart[1], arrowEnd[0], arrowEnd[1]]}
          stroke="white"
          fill="white"
          strokeWidth={15}
          pointerLength={40}
          pointerWidth={40}
          listening={false}
        />
      )}
    </Group>
  )
}
