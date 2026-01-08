import { Arrow, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { PerimeterCornerWithGeometry, PerimeterWallWithGeometry } from '@/building/model'
import { useWallAssemblyById } from '@/construction/config/store'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { direction, midpoint, perpendicular, scaleAddVec2, scaleVec2 } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

interface PerimeterCornerShapeProps {
  corner: PerimeterCornerWithGeometry
  previousWall: PerimeterWallWithGeometry
  nextWall: PerimeterWallWithGeometry
  perimeterId: string
}

export function PerimeterCornerShape({
  corner,
  previousWall,
  nextWall,
  perimeterId
}: PerimeterCornerShapeProps): React.JSX.Element {
  const select = useSelectionStore()
  const theme = useCanvasTheme()
  const isSelected = select.isCurrentSelection(corner.id)

  const cornerPolygon = [
    corner.insidePoint,
    previousWall.insideLine.end,
    previousWall.outsideLine.end,
    corner.outsidePoint,
    nextWall.outsideLine.start,
    nextWall.insideLine.start
  ]
  const polygonArray = cornerPolygon.flatMap(point => [point[0], point[1]])

  const arrowDir = corner.constructedByWall === 'previous' ? previousWall.direction : scaleVec2(nextWall.direction, -1)
  const arrowEnd = midpoint(corner.insidePoint, corner.outsidePoint)
  const arrowStart = scaleAddVec2(arrowEnd, arrowDir, -180)

  const constructingWall = corner.constructedByWall === 'previous' ? previousWall : nextWall
  const wallAssembly = useWallAssemblyById(constructingWall.wallAssemblyId)
  const cornerColor = wallAssembly?.type === 'non-strawbale' ? MATERIAL_COLORS.other : MATERIAL_COLORS.strawbale

  // Check if corner is nearly straight (close to 180°)
  const interiorAngleDegrees = corner.interiorAngle
  const exteriorAngleDegrees = corner.exteriorAngle
  const isNearStraight = Math.abs(interiorAngleDegrees - 180) <= 5 || Math.abs(exteriorAngleDegrees - 180) <= 5

  const normal = perpendicular(direction(corner.insidePoint, corner.outsidePoint))
  const overlayWidth = 80

  return (
    <Group
      name={`perimeter-corner-${corner.id}`}
      entityId={corner.id}
      entityType="perimeter-corner"
      parentIds={[perimeterId]}
      listening
    >
      {/* Corner polygon fill */}
      <Line points={polygonArray} fill={cornerColor} stroke={theme.border} strokeWidth={10} closed listening />

      {/* Rounded rectangle overlay for near-straight corners */}
      {isNearStraight && (
        <Line
          points={[
            corner.insidePoint[0] - normal[0] * (overlayWidth / 2),
            corner.insidePoint[1] - (normal[1] * overlayWidth) / 2,
            corner.insidePoint[0] + (normal[0] * overlayWidth) / 2,
            corner.insidePoint[1] + (normal[1] * overlayWidth) / 2,
            corner.outsidePoint[0] + (normal[0] * overlayWidth) / 2,
            corner.outsidePoint[1] + (normal[1] * overlayWidth) / 2,
            corner.outsidePoint[0] - (normal[0] * overlayWidth) / 2,
            corner.outsidePoint[1] - (normal[1] * overlayWidth) / 2
          ]}
          fill={cornerColor}
          stroke={theme.border}
          strokeWidth={8}
          opacity={0.5}
          dash={[20, 20]}
          closed
          listening
        />
      )}

      {!isNearStraight && (
        <Line
          points={[corner.insidePoint[0], corner.insidePoint[1], corner.outsidePoint[0], corner.outsidePoint[1]]}
          stroke={theme.black}
          opacity={0.5}
          strokeWidth={8}
          dash={[20, 20]}
          listening={false}
        />
      )}

      {/* Corner ownership indicator - small arrow */}
      {isSelected && (
        <Arrow
          points={[arrowStart[0], arrowStart[1], arrowEnd[0], arrowEnd[1]]}
          stroke={theme.white}
          fill={theme.white}
          strokeWidth={20}
          pointerLength={50}
          pointerWidth={50}
          listening={false}
        />
      )}
    </Group>
  )
}
