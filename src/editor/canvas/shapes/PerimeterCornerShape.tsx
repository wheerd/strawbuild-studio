import type { PerimeterCornerId } from '@/building/model'
import { usePerimeterCornerById, usePerimeterWallById } from '@/building/store'
import { useWallAssemblyById } from '@/construction/config/store'
import { Arrow } from '@/editor/components/Arrow'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { direction, midpoint, perpendicular, scaleAddVec2, scaleVec2 } from '@/shared/geometry'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function PerimeterCornerShape({ cornerId }: { cornerId: PerimeterCornerId }): React.JSX.Element {
  const select = useSelectionStore()
  const isSelected = select.isCurrentSelection(cornerId)

  const corner = usePerimeterCornerById(cornerId)
  const previousWall = usePerimeterWallById(corner.previousWallId)
  const nextWall = usePerimeterWallById(corner.nextWallId)

  // Convert polygon points to SVG format
  const pathD = polygonToSvgPath(corner.polygon)

  // Calculate arrow for ownership indicator
  const arrowDir = corner.constructedByWall === 'previous' ? previousWall.direction : scaleVec2(nextWall.direction, -1)
  const arrowEnd = midpoint(corner.insidePoint, corner.outsidePoint)
  const arrowStart = scaleAddVec2(arrowEnd, arrowDir, -180)

  // Determine corner color based on wall assembly type
  const constructingWall = corner.constructedByWall === 'previous' ? previousWall : nextWall
  const wallAssembly = useWallAssemblyById(constructingWall.wallAssemblyId)
  const cornerColor = wallAssembly?.type === 'non-strawbale' ? MATERIAL_COLORS.other : MATERIAL_COLORS.strawbale

  // Check if corner is nearly straight (close to 180°)
  const interiorAngleDegrees = corner.interiorAngle
  const exteriorAngleDegrees = corner.exteriorAngle
  const isNearStraight = Math.abs(interiorAngleDegrees - 180) <= 5 || Math.abs(exteriorAngleDegrees - 180) <= 5

  // Calculate overlay rectangle for near-straight corners
  const normal = perpendicular(direction(corner.insidePoint, corner.outsidePoint))
  const overlayHalfWidth = 80 / 2

  return (
    <g
      data-entity-id={corner.id}
      data-entity-type="perimeter-corner"
      data-parent-ids={JSON.stringify([corner.perimeterId])}
    >
      {/* Corner polygon fill */}
      <path d={pathD} fill={cornerColor} stroke="var(--gray-11)" strokeWidth={10} />

      {/* Rounded rectangle overlay for near-straight corners */}
      {isNearStraight && (
        <polygon
          points={[
            `${corner.insidePoint[0] - normal[0] * overlayHalfWidth},${corner.insidePoint[1] - normal[1] * overlayHalfWidth}`,
            `${corner.insidePoint[0] + normal[0] * overlayHalfWidth},${corner.insidePoint[1] + normal[1] * overlayHalfWidth}`,
            `${corner.outsidePoint[0] + normal[0] * overlayHalfWidth},${corner.outsidePoint[1] + normal[1] * overlayHalfWidth}`,
            `${corner.outsidePoint[0] - normal[0] * overlayHalfWidth},${corner.outsidePoint[1] - normal[1] * overlayHalfWidth}`
          ].join(' ')}
          fill={cornerColor}
          stroke="var(--gray-11)"
          strokeWidth={8}
          opacity={0.5}
          strokeDasharray="20 20"
        />
      )}

      {/* Center line for non-straight corners */}
      {!isNearStraight && (
        <line
          x1={corner.insidePoint[0]}
          y1={corner.insidePoint[1]}
          x2={corner.outsidePoint[0]}
          y2={corner.outsidePoint[1]}
          stroke="var(--gray-12)"
          opacity={0.5}
          strokeWidth={8}
          strokeDasharray="20 20"
          className="pointer-events-none"
        />
      )}

      {/* Corner ownership indicator - arrow when selected */}
      {isSelected && <Arrow color="var(--gray-1)" strokeWidth={30} arrowStart={arrowStart} arrowEnd={arrowEnd} />}
    </g>
  )
}
