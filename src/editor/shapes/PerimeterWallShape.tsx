import { useMemo } from 'react'

import type { Constraint, DistanceConstraint, HorizontalConstraint, VerticalConstraint } from '@/building/model'
import { type PerimeterCornerId, type PerimeterWallId } from '@/building/model/ids'
import { useConstraintsForEntity, usePerimeterCornerById, usePerimeterWallById } from '@/building/store'
import { useWallAssemblyById } from '@/construction/config/store'
import { ConstraintBadge } from '@/editor/components/ConstraintBadge'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { LengthIndicator } from '@/editor/utils/LengthIndicator'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

/**
 * Find a distance constraint that spans between two corner IDs on a given side.
 */
function findDistanceConstraint(
  constraints: readonly Constraint[],
  cornerA: PerimeterCornerId,
  cornerB: PerimeterCornerId,
  side: 'left' | 'right'
): DistanceConstraint | undefined {
  return constraints.find(
    (c): c is DistanceConstraint =>
      c.type === 'distance' &&
      c.side === side &&
      ((c.nodeA === cornerA && c.nodeB === cornerB) || (c.nodeA === cornerB && c.nodeB === cornerA))
  )
}

/**
 * Find an H/V constraint that spans between two corner IDs.
 */
function findHVConstraint(
  constraints: readonly Constraint[],
  cornerA: PerimeterCornerId,
  cornerB: PerimeterCornerId
): (HorizontalConstraint | VerticalConstraint) | undefined {
  return constraints.find(
    (c): c is HorizontalConstraint | VerticalConstraint =>
      (c.type === 'horizontal' || c.type === 'vertical') &&
      ((c.nodeA === cornerA && c.nodeB === cornerB) || (c.nodeA === cornerB && c.nodeB === cornerA))
  )
}

export function PerimeterWallShape({ wallId }: { wallId: PerimeterWallId }): React.JSX.Element {
  const { formatLength } = useFormatters()
  const select = useSelectionStore()

  const wall = usePerimeterWallById(wallId)
  const startCorner = usePerimeterCornerById(wall.startCornerId)
  const endCorner = usePerimeterCornerById(wall.endCornerId)

  const wallAssembly = useWallAssemblyById(wall.wallAssemblyId)
  const fillColor = wallAssembly?.type === 'non-strawbale' ? MATERIAL_COLORS.other : MATERIAL_COLORS.strawbale

  const isSelected = select.isCurrentSelection(wall.id)

  const wallPath = polygonToSvgPath(wall.polygon)

  // Look up constraints referencing this wall's start and end corners
  const startConstraints = useConstraintsForEntity(wall.startCornerId)
  const endConstraints = useConstraintsForEntity(wall.endCornerId)
  const allCornerConstraints = useMemo(
    () => [...startConstraints, ...endConstraints],
    [startConstraints, endConstraints]
  )

  // Find distance constraints for inside ('right') and outside ('left') sides
  const insideDistanceConstraint = useMemo(
    () => findDistanceConstraint(allCornerConstraints, wall.startCornerId, wall.endCornerId, 'right'),
    [allCornerConstraints, wall.startCornerId, wall.endCornerId]
  )
  const outsideDistanceConstraint = useMemo(
    () => findDistanceConstraint(allCornerConstraints, wall.startCornerId, wall.endCornerId, 'left'),
    [allCornerConstraints, wall.startCornerId, wall.endCornerId]
  )

  // Find H/V constraint for this wall's two corners
  const hvConstraint = useMemo(
    () => findHVConstraint(allCornerConstraints, wall.startCornerId, wall.endCornerId),
    [allCornerConstraints, wall.startCornerId, wall.endCornerId]
  )

  const showInsideIndicator = isSelected || insideDistanceConstraint != null
  const showOutsideIndicator = isSelected || outsideDistanceConstraint != null

  const insideLabel = insideDistanceConstraint
    ? `${formatLength(insideDistanceConstraint.length)} \uD83D\uDD12 `
    : formatLength(wall.insideLength)
  const outsideLabel = outsideDistanceConstraint
    ? `${formatLength(outsideDistanceConstraint.length)} \uD83D\uDD12`
    : formatLength(wall.outsideLength)

  const constraintColor = 'var(--color-primary)'
  const defaultColor = 'var(--color-foreground)'

  return (
    <g data-entity-id={wall.id} data-entity-type="perimeter-wall" data-parent-ids={JSON.stringify([wall.perimeterId])}>
      {/* Main wall body - fill the area between inside and outside lines */}
      <path d={wallPath} fill={fillColor} className="stroke-border-contrast stroke-10" />

      {/* Inside length indicator */}
      {showInsideIndicator && (
        <LengthIndicator
          startPoint={startCorner.insidePoint}
          endPoint={endCorner.insidePoint}
          label={insideLabel}
          offset={-60}
          color={insideDistanceConstraint && isSelected ? constraintColor : defaultColor}
          fontSize={60}
          strokeWidth={5}
        />
      )}

      {/* Outside length indicator */}
      {showOutsideIndicator && (
        <LengthIndicator
          startPoint={startCorner.outsidePoint}
          endPoint={endCorner.outsidePoint}
          label={outsideLabel}
          offset={60}
          color={outsideDistanceConstraint && isSelected ? constraintColor : defaultColor}
          fontSize={60}
          strokeWidth={5}
        />
      )}

      {/* H/V constraint badge on the outside of the wall */}
      {hvConstraint && (
        <ConstraintBadge
          label={hvConstraint.type === 'horizontal' ? '\u2015' : '\u007c'}
          offset={160}
          startPoint={startCorner.outsidePoint}
          endPoint={endCorner.outsidePoint}
          outsideDirection={wall.outsideDirection}
        />
      )}
    </g>
  )
}
