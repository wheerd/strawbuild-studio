import { useMemo } from 'react'

import type { ColinearConstraint, PerimeterCornerId, PerpendicularConstraint } from '@/building/model'
import { useConstraintsForEntity, usePerimeterCornerById, usePerimeterWallById } from '@/building/store'
import { useWallAssemblyById } from '@/construction/config/store'
import { Arrow } from '@/editor/components/Arrow'
import { ConstraintBadge } from '@/editor/components/ConstraintBadge'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useZoom } from '@/editor/hooks/useViewportStore'
import { type Vec2, direction, midpoint, perpendicular, scaleAddVec2, scaleVec2 } from '@/shared/geometry'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function PerimeterCornerShape({ cornerId }: { cornerId: PerimeterCornerId }): React.JSX.Element {
  const select = useSelectionStore()
  const isSelected = select.isCurrentSelection(cornerId)
  const zoom = useZoom()

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
  const outsideDirection = direction(corner.insidePoint, corner.outsidePoint)
  const normal = perpendicular(outsideDirection)
  const overlayHalfWidth = 80 / 2

  // Look up constraints for this corner and its adjacent walls
  const cornerConstraints = useConstraintsForEntity(cornerId)
  const prevWallConstraints = useConstraintsForEntity(corner.previousWallId)
  const nextWallConstraints = useConstraintsForEntity(corner.nextWallId)

  // Find colinear constraints where this corner is nodeB (the middle node)
  const colinearConstraints = useMemo(
    () => cornerConstraints.filter((c): c is ColinearConstraint => c.type === 'colinear' && c.nodeB === cornerId),
    [cornerConstraints, cornerId]
  )

  // Find perpendicular constraints between the two adjacent walls
  const perpendicularConstraint = useMemo(() => {
    const allWallConstraints = [...prevWallConstraints, ...nextWallConstraints]
    return allWallConstraints.find(
      (c): c is PerpendicularConstraint =>
        c.type === 'perpendicular' &&
        ((c.wallA === corner.previousWallId && c.wallB === corner.nextWallId) ||
          (c.wallA === corner.nextWallId && c.wallB === corner.previousWallId))
    )
  }, [prevWallConstraints, nextWallConstraints, corner.previousWallId, corner.nextWallId])

  return (
    <g
      data-entity-id={corner.id}
      data-entity-type="perimeter-corner"
      data-parent-ids={JSON.stringify([corner.perimeterId])}
    >
      {/* Corner polygon fill */}
      <path d={pathD} fill={cornerColor} stroke="var(--color-border-contrast)" strokeWidth={10} />

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
          stroke="var(--color-border-contrast)"
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
          stroke="var(--color-border-contrast)"
          opacity={0.5}
          strokeWidth={8}
          strokeDasharray="20 20"
        />
      )}

      {/* Corner ownership indicator - arrow when selected */}
      {isSelected && <Arrow color="var(--color-white)" strokeWidth={30} arrowStart={arrowStart} arrowEnd={arrowEnd} />}

      {/* Colinear constraint indicators */}
      {colinearConstraints.map(c => (
        <ColinearBadge key={c.id} point={corner.insidePoint} zoom={zoom} />
      ))}

      {/* H/V constraint badge on the outside of the wall */}
      {perpendicularConstraint && (
        <ConstraintBadge
          label={'\u27C2'}
          offset={50}
          startPoint={corner.outsidePoint}
          endPoint={corner.outsidePoint}
          outsideDirection={outsideDirection}
        />
      )}
    </g>
  )
}

// --- Sub-components and helpers ---

function ColinearBadge({ point, zoom }: { point: Vec2; zoom: number }): React.JSX.Element {
  const r = 4 / zoom
  return (
    <circle
      cx={point[0]}
      cy={point[1]}
      r={r}
      fill="none"
      stroke="var(--color-muted-foreground)"
      strokeWidth={1.5 / zoom}
      opacity={0.8}
      pointerEvents="none"
    />
  )
}
