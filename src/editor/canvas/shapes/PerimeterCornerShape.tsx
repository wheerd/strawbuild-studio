import { Arrow, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { PerimeterCornerId } from '@/building/model'
import { usePerimeterCornerById, usePerimeterWallById } from '@/building/store'
import { useWallAssemblyById } from '@/construction/config/store'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { direction, midpoint, perpendicular, scaleAddVec2, scaleVec2 } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

interface PerimeterCornerShapeProps {
  cornerId: PerimeterCornerId
}

export function PerimeterCornerShape({ cornerId }: PerimeterCornerShapeProps): React.JSX.Element {
  const select = useSelectionStore()
  const theme = useCanvasTheme()
  const isSelected = select.isCurrentSelection(cornerId)

  const corner = usePerimeterCornerById(cornerId)
  const previousWall = usePerimeterWallById(corner.previousWallId)
  const nextWall = usePerimeterWallById(corner.nextWallId)

  const polygonArray = corner.polygon.points.flatMap(p => [p[0], p[1]])

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
  const overlayHalfWidth = 80 / 2

  return (
    <Group
      name={`perimeter-corner-${corner.id}`}
      entityId={corner.id}
      entityType="perimeter-corner"
      parentIds={[corner.perimeterId]}
      listening
    >
      {/* Corner polygon fill */}
      <Line points={polygonArray} fill={cornerColor} stroke={theme.border} strokeWidth={10} closed listening />

      {/* Rounded rectangle overlay for near-straight corners */}
      {isNearStraight && (
        <Line
          points={[
            corner.insidePoint[0] - normal[0] * overlayHalfWidth,
            corner.insidePoint[1] - normal[1] * overlayHalfWidth,
            corner.insidePoint[0] + normal[0] * overlayHalfWidth,
            corner.insidePoint[1] + normal[1] * overlayHalfWidth,
            corner.outsidePoint[0] + normal[0] * overlayHalfWidth,
            corner.outsidePoint[1] + normal[1] * overlayHalfWidth,
            corner.outsidePoint[0] - normal[0] * overlayHalfWidth,
            corner.outsidePoint[1] - normal[1] * overlayHalfWidth
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
