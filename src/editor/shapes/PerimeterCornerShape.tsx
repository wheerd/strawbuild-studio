import { useCallback, useMemo } from 'react'

import type { ColinearCornerConstraint, PerimeterCornerId, PerpendicularCornerConstraint } from '@/building/model'
import {
  useConstraintsForEntity,
  useModelActions,
  usePerimeterCornerById,
  usePerimeterWallById
} from '@/building/store'
import { useWallAssemblyById } from '@/construction/config/store'
import { Arrow } from '@/editor/components/Arrow'
import { ConstraintBadge } from '@/editor/components/ConstraintBadge'
import { gcsService } from '@/editor/gcs/service'
import { useConstraintStatus } from '@/editor/gcs/store'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { direction, midpoint, perpendicular, scaleAddVec2, scaleVec2 } from '@/shared/geometry'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function PerimeterCornerShape({ cornerId }: { cornerId: PerimeterCornerId }): React.JSX.Element {
  const select = useSelectionStore()
  const isSelected = select.isCurrentSelection(cornerId)
  const modelActions = useModelActions()

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

  // Look up constraints for this corner
  const cornerConstraints = useConstraintsForEntity(cornerId)

  // Find colinear constraints for this corner
  const colinearConstraint = useMemo(
    () =>
      cornerConstraints.find(
        (c): c is ColinearCornerConstraint => c.type === 'colinearCorner' && c.corner === cornerId
      ),
    [cornerConstraints, cornerId]
  )

  // Find perpendicular constraint for this corner
  const perpendicularConstraint = useMemo(
    () =>
      cornerConstraints.find(
        (c): c is PerpendicularCornerConstraint => c.type === 'perpendicularCorner' && c.corner === cornerId
      ),
    [cornerConstraints, cornerId]
  )

  // Determine if the corner is close to 90° (for suggesting perpendicular constraint)
  /** 5-degree tolerance for perpendicular suggestion. */
  const isNearPerpendicular =
    !perpendicularConstraint && (Math.abs(corner.interiorAngle - 90) <= 5 || Math.abs(corner.exteriorAngle - 90) <= 5)

  // Get constraint status for each constraint
  const perpendicularStatus = useConstraintStatus(perpendicularConstraint?.id)
  const colinearStatus = useConstraintStatus(colinearConstraint?.id)

  const showPerpendicularBadge = perpendicularConstraint != null || (isSelected && isNearPerpendicular)
  const showColinearBadge = colinearConstraint != null || (isSelected && isNearStraight)

  const getBadgeStatus = (status: { conflicting: boolean; redundant: boolean }) => {
    if (status.conflicting) return 'conflicting'
    if (status.redundant) return 'redundant'
    return 'normal'
  }

  // --- Perpendicular constraint handlers ---
  const handleAddPerpendicular = useCallback(() => {
    modelActions.addBuildingConstraint({
      type: 'perpendicularCorner',
      corner: cornerId
    })
    gcsService.triggerSolve()
  }, [modelActions, cornerId])

  const handleRemovePerpendicular = useCallback(() => {
    if (!perpendicularConstraint) return
    modelActions.removeBuildingConstraint(perpendicularConstraint.id)
    gcsService.triggerSolve()
  }, [modelActions, perpendicularConstraint])

  // --- Colinear constraint handlers ---
  const handleAddColinear = useCallback(() => {
    modelActions.addBuildingConstraint({
      type: 'colinearCorner',
      corner: cornerId
    })
    gcsService.triggerSolve()
  }, [modelActions, cornerId])

  const handleRemoveColinear = useCallback(() => {
    if (!colinearConstraint) return
    modelActions.removeBuildingConstraint(colinearConstraint.id)
    gcsService.triggerSolve()
  }, [modelActions, colinearConstraint])

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

      {/* Perpendicular constraint badge on the outside of the corner */}
      {showColinearBadge && (
        <ConstraintBadge
          label={'\u2550'}
          offset={160}
          startPoint={corner.outsidePoint}
          endPoint={corner.outsidePoint}
          outsideDirection={outsideDirection}
          locked={colinearConstraint != null}
          onClick={isSelected ? (colinearConstraint ? handleRemoveColinear : handleAddColinear) : undefined}
          tooltipKey="colinear"
          status={getBadgeStatus(colinearStatus)}
        />
      )}

      {/* Perpendicular constraint badge on the outside of the corner */}
      {showPerpendicularBadge && (
        <ConstraintBadge
          label={'\u27C2'}
          offset={80}
          startPoint={corner.outsidePoint}
          endPoint={corner.outsidePoint}
          outsideDirection={outsideDirection}
          locked={perpendicularConstraint != null}
          onClick={
            isSelected ? (perpendicularConstraint ? handleRemovePerpendicular : handleAddPerpendicular) : undefined
          }
          tooltipKey="perpendicular"
          status={getBadgeStatus(perpendicularStatus)}
        />
      )}
    </g>
  )
}
