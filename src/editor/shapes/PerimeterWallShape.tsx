import { useCallback, useMemo } from 'react'

import type {
  Constraint,
  HorizontalWallConstraint,
  VerticalWallConstraint,
  WallLengthConstraint
} from '@/building/model'
import { type PerimeterWallId } from '@/building/model/ids'
import {
  useConstraintsForEntity,
  useModelActions,
  usePerimeterCornerById,
  usePerimeterWallById
} from '@/building/store'
import { useWallAssemblyById } from '@/construction/config/store'
import { ConstraintBadge } from '@/editor/components/ConstraintBadge'
import { gcsService } from '@/editor/gcs/service'
import { useConstraintStatus } from '@/editor/gcs/store'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput } from '@/editor/services/length-input'
import { ClickableLengthIndicator } from '@/editor/utils/ClickableLengthIndicator'
import { LengthIndicator } from '@/editor/utils/LengthIndicator'
import { type Length, type Vec2, direction, midpoint, perpendicularCCW, scaleAddVec2 } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

/** Sine of 5 degrees — threshold for suggesting H/V constraints. */
const SUGGESTION_SIN_TOLERANCE = Math.sin((5 * Math.PI) / 180)

/**
 * Find a wallLength constraint for a given wall and side.
 */
function findWallLengthConstraint(
  constraints: readonly Constraint[],
  wallId: PerimeterWallId,
  side: 'left' | 'right'
): WallLengthConstraint | undefined {
  return constraints.find(
    (c): c is WallLengthConstraint => c.type === 'wallLength' && c.wall === wallId && c.side === side
  )
}

/**
 * Find an H/V constraint for a given wall.
 */
function findHVConstraint(
  constraints: readonly Constraint[],
  wallId: PerimeterWallId
): (HorizontalWallConstraint | VerticalWallConstraint) | undefined {
  return constraints.find(
    (c): c is HorizontalWallConstraint | VerticalWallConstraint =>
      (c.type === 'horizontalWall' || c.type === 'verticalWall') && c.wall === wallId
  )
}

export function PerimeterWallShape({ wallId }: { wallId: PerimeterWallId }): React.JSX.Element {
  const { formatLength } = useFormatters()
  const select = useSelectionStore()
  const modelActions = useModelActions()
  const viewportActions = useViewportActions()

  const wall = usePerimeterWallById(wallId)
  const startCorner = usePerimeterCornerById(wall.startCornerId)
  const endCorner = usePerimeterCornerById(wall.endCornerId)

  const wallAssembly = useWallAssemblyById(wall.wallAssemblyId)
  const fillColor = wallAssembly?.type === 'non-strawbale' ? MATERIAL_COLORS.other : MATERIAL_COLORS.strawbale

  const isSelected = select.isCurrentSelection(wall.id)

  const wallPath = polygonToSvgPath(wall.polygon)

  // Look up constraints referencing this wall
  const wallConstraints = useConstraintsForEntity(wallId)

  // Find distance constraints for inside ('right') and outside ('left') sides
  const insideDistanceConstraint = useMemo(
    () => findWallLengthConstraint(wallConstraints, wallId, 'right'),
    [wallConstraints, wallId]
  )
  const outsideDistanceConstraint = useMemo(
    () => findWallLengthConstraint(wallConstraints, wallId, 'left'),
    [wallConstraints, wallId]
  )

  // Find H/V constraint for this wall
  const hvConstraint = useMemo(() => findHVConstraint(wallConstraints, wallId), [wallConstraints, wallId])

  // Determine if the wall is close to horizontal or vertical (for suggesting constraints)
  const suggestedHVType = useMemo<'horizontalWall' | 'verticalWall' | null>(() => {
    if (hvConstraint) return null
    const dx = wall.direction[0]
    const dy = wall.direction[1]
    if (Math.abs(dy) < SUGGESTION_SIN_TOLERANCE) return 'horizontalWall'
    if (Math.abs(dx) < SUGGESTION_SIN_TOLERANCE) return 'verticalWall'
    return null
  }, [hvConstraint, wall.direction])

  // Get constraint status for each constraint
  const hvStatus = useConstraintStatus(hvConstraint?.id)
  const insideDistanceStatus = useConstraintStatus(insideDistanceConstraint?.id)
  const outsideDistanceStatus = useConstraintStatus(outsideDistanceConstraint?.id)

  const showInsideIndicator = isSelected || insideDistanceConstraint != null
  const showOutsideIndicator = isSelected || outsideDistanceConstraint != null

  const insideLabel = insideDistanceConstraint
    ? `${formatLength(insideDistanceConstraint.length)} \uD83D\uDD12`
    : formatLength(wall.insideLength)
  const outsideLabel = outsideDistanceConstraint
    ? `${formatLength(outsideDistanceConstraint.length)} \uD83D\uDD12`
    : formatLength(wall.outsideLength)

  const defaultColor = 'var(--color-foreground)'

  const getBadgeStatus = (status: { conflicting: boolean; redundant: boolean }) => {
    if (status.conflicting) return 'conflicting'
    if (status.redundant) return 'redundant'
    return 'normal'
  }

  const insideIndicatorColor = useMemo(() => {
    if (insideDistanceStatus.conflicting) return 'var(--color-red-600)'
    if (insideDistanceStatus.redundant) return 'var(--color-orange-600)'
    return 'var(--color-primary)'
  }, [insideDistanceStatus])

  const outsideIndicatorColor = useMemo(() => {
    if (outsideDistanceStatus.conflicting) return 'var(--color-red-600)'
    if (outsideDistanceStatus.redundant) return 'var(--color-orange-600)'
    return 'var(--color-primary)'
  }, [outsideDistanceStatus])

  // --- H/V constraint handlers ---
  const handleAddHVConstraint = useCallback(() => {
    if (!suggestedHVType) return
    modelActions.addBuildingConstraint({
      type: suggestedHVType,
      wall: wallId
    })
    gcsService.triggerSolve()
  }, [suggestedHVType, modelActions, wallId])

  const handleRemoveHVConstraint = useCallback(() => {
    if (!hvConstraint) return
    modelActions.removeBuildingConstraint(hvConstraint.id)
    gcsService.triggerSolve()
  }, [hvConstraint, modelActions])

  // --- Distance constraint handlers ---
  const handleDistanceClick = useCallback(
    (
      side: 'left' | 'right',
      existingConstraint: WallLengthConstraint | undefined,
      currentLength: Length,
      indicatorStartPoint: Vec2,
      indicatorEndPoint: Vec2,
      indicatorOffset: number
    ) => {
      const mid = midpoint(indicatorStartPoint, indicatorEndPoint)
      const dir = direction(indicatorStartPoint, indicatorEndPoint)
      const perp = perpendicularCCW(dir)
      const offsetMid = scaleAddVec2(mid, perp, indicatorOffset)

      const stagePos = viewportActions.worldToStage(offsetMid)
      const initialValue = existingConstraint ? existingConstraint.length : currentLength

      activateLengthInput({
        showImmediately: true,
        position: { x: stagePos[0] + 20, y: stagePos[1] - 30 },
        initialValue,
        placeholder: 'Enter length...',
        onCommit: enteredValue => {
          modelActions.addBuildingConstraint({
            type: 'wallLength',
            side,
            wall: wallId,
            length: enteredValue
          })
          gcsService.triggerSolve()
        },
        onCancel: () => {
          if (existingConstraint) {
            modelActions.removeBuildingConstraint(existingConstraint.id)
            gcsService.triggerSolve()
          }
        }
      })
    },
    [viewportActions, modelActions, wallId]
  )

  // Whether to show H/V badge
  const showHVBadge = hvConstraint != null || (isSelected && suggestedHVType != null)

  // H/V badge label
  const hvLabel = hvConstraint
    ? hvConstraint.type === 'horizontalWall'
      ? '\u2015'
      : '\u007c'
    : suggestedHVType === 'horizontalWall'
      ? '\u2015'
      : '\u007c'

  // Map constraint type to tooltip key (display concept, not type discriminant)
  const hvTooltipKey = hvConstraint
    ? hvConstraint.type === 'horizontalWall'
      ? ('horizontal' as const)
      : ('vertical' as const)
    : suggestedHVType === 'horizontalWall'
      ? ('horizontal' as const)
      : suggestedHVType === 'verticalWall'
        ? ('vertical' as const)
        : undefined

  return (
    <g data-entity-id={wall.id} data-entity-type="perimeter-wall" data-parent-ids={JSON.stringify([wall.perimeterId])}>
      {/* Main wall body - fill the area between inside and outside lines */}
      <path d={wallPath} fill={fillColor} className="stroke-border-contrast stroke-10" />

      {/* Inside length indicator */}
      {showInsideIndicator &&
        (isSelected ? (
          <ClickableLengthIndicator
            startPoint={startCorner.insidePoint}
            endPoint={endCorner.insidePoint}
            label={insideLabel}
            offset={-60}
            color={insideDistanceConstraint ? insideIndicatorColor : defaultColor}
            fontSize={60}
            strokeWidth={5}
            onClick={() => {
              handleDistanceClick(
                'right',
                insideDistanceConstraint,
                wall.insideLength,
                startCorner.insidePoint,
                endCorner.insidePoint,
                -60
              )
            }}
          />
        ) : (
          <LengthIndicator
            startPoint={startCorner.insidePoint}
            endPoint={endCorner.insidePoint}
            label={insideLabel}
            offset={-60}
            color={insideDistanceConstraint ? insideIndicatorColor : defaultColor}
            fontSize={60}
            strokeWidth={5}
          />
        ))}

      {/* Outside length indicator */}
      {showOutsideIndicator &&
        (isSelected ? (
          <ClickableLengthIndicator
            startPoint={startCorner.outsidePoint}
            endPoint={endCorner.outsidePoint}
            label={outsideLabel}
            offset={60}
            color={outsideDistanceConstraint ? outsideIndicatorColor : defaultColor}
            fontSize={60}
            strokeWidth={5}
            onClick={() => {
              handleDistanceClick(
                'left',
                outsideDistanceConstraint,
                wall.outsideLength,
                startCorner.outsidePoint,
                endCorner.outsidePoint,
                60
              )
            }}
          />
        ) : (
          <LengthIndicator
            startPoint={startCorner.outsidePoint}
            endPoint={endCorner.outsidePoint}
            label={outsideLabel}
            offset={60}
            color={outsideDistanceConstraint ? outsideIndicatorColor : defaultColor}
            fontSize={60}
            strokeWidth={5}
          />
        ))}

      {/* H/V constraint badge on the outside of the wall */}
      {showHVBadge && (
        <ConstraintBadge
          label={hvLabel}
          offset={160}
          startPoint={startCorner.outsidePoint}
          endPoint={endCorner.outsidePoint}
          outsideDirection={wall.outsideDirection}
          locked={hvConstraint != null}
          onClick={isSelected ? (hvConstraint ? handleRemoveHVConstraint : handleAddHVConstraint) : undefined}
          tooltipKey={hvTooltipKey}
          status={getBadgeStatus(hvStatus)}
        />
      )}
    </g>
  )
}
