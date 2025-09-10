import { Group, Line, Arrow, Circle } from 'react-konva'
import type { PerimeterCorner, PerimeterWall } from '@/types/model'
import { add, midpoint, scale, type Vec2 } from '@/types/geometry'
import { COLORS } from '@/theme/colors'
import { useSelectionStore } from '@/components/FloorPlanEditor/hooks/useSelectionStore'

interface PerimeterCornerShapeProps {
  corner: PerimeterCorner
  boundaryPoint: Vec2
  previousWall: PerimeterWall
  nextWall: PerimeterWall
  perimeterId: string
}

export function PerimeterCornerShape({
  corner,
  boundaryPoint,
  previousWall,
  nextWall,
  perimeterId
}: PerimeterCornerShapeProps): React.JSX.Element {
  const select = useSelectionStore()
  const isSelected = select.isCurrentSelection(corner.id)

  const cornerPolygon = [
    boundaryPoint,
    previousWall.insideLine.end,
    previousWall.outsideLine.end,
    corner.outsidePoint,
    nextWall.outsideLine.start,
    nextWall.insideLine.start
  ]
  const polygonArray = cornerPolygon.flatMap(point => [point[0], point[1]])

  const arrowDir = corner.belongsTo === 'previous' ? previousWall.direction : scale(nextWall.direction, -1)
  const arrowCenter =
    corner.belongsTo === 'previous'
      ? midpoint(previousWall.insideLine.end, previousWall.outsideLine.end)
      : midpoint(nextWall.insideLine.start, nextWall.outsideLine.start)
  const arrowStart = add(arrowCenter, scale(arrowDir, -60))
  const arrowEnd = add(arrowCenter, scale(arrowDir, 90))

  const belongsToWall = corner.belongsTo === 'previous' ? previousWall : nextWall
  const cornerColor =
    belongsToWall.constructionType === 'non-strawbale' ? COLORS.materials.other : COLORS.materials.strawbale
  const finalColor = isSelected ? COLORS.selection.primary : cornerColor

  return (
    <Group
      name={`perimeter-corner-${corner.id}`}
      entityId={corner.id}
      entityType="perimeter-corner"
      parentIds={[perimeterId]}
      listening
    >
      {/* Corner polygon fill */}
      <Line points={polygonArray} fill={finalColor} stroke={COLORS.ui.black} strokeWidth={10} closed listening />

      <Line
        points={[boundaryPoint[0], boundaryPoint[1], corner.outsidePoint[0], corner.outsidePoint[1]]}
        stroke={COLORS.ui.black}
        opacity={0.5}
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
            fill={COLORS.selection.secondary}
            stroke={COLORS.selection.secondaryOutline}
            strokeWidth={10}
            opacity={0.8}
            listening={false}
          />
        </>
      )}

      {/* Corner ownership indicator - small arrow */}
      {isSelected && (
        <Arrow
          points={[arrowStart[0], arrowStart[1], arrowEnd[0], arrowEnd[1]]}
          stroke={COLORS.ui.white}
          fill={COLORS.ui.white}
          strokeWidth={20}
          pointerLength={50}
          pointerWidth={50}
          listening={false}
        />
      )}
    </Group>
  )
}
