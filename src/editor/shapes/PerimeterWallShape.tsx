import { useCallback, useMemo } from 'react'

import type { Constraint, DistanceConstraint, HorizontalConstraint, VerticalConstraint } from '@/building/model'
import { type PerimeterCornerId, type PerimeterWallId } from '@/building/model/ids'
import {
  useConstraintsForEntity,
  useModelActions,
  usePerimeterCornerById,
  usePerimeterWallById
} from '@/building/store'
import { useWallAssemblyById } from '@/construction/config/store'
import { ConstraintBadge } from '@/editor/components/ConstraintBadge'
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
  const modelActions = useModelActions()
  const viewportActions = useViewportActions()

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

  // Determine if the wall is close to horizontal or vertical (for suggesting constraints)
  const suggestedHVType = useMemo<'horizontal' | 'vertical' | null>(() => {
    if (hvConstraint) return null // Already has an H/V constraint
    const dx = wall.direction[0]
    const dy = wall.direction[1]
    if (Math.abs(dy) < SUGGESTION_SIN_TOLERANCE) return 'horizontal'
    if (Math.abs(dx) < SUGGESTION_SIN_TOLERANCE) return 'vertical'
    return null
  }, [hvConstraint, wall.direction])

  const showInsideIndicator = isSelected || insideDistanceConstraint != null
  const showOutsideIndicator = isSelected || outsideDistanceConstraint != null

  const insideLabel = insideDistanceConstraint
    ? `${formatLength(insideDistanceConstraint.length)} \uD83D\uDD12`
    : formatLength(wall.insideLength)
  const outsideLabel = outsideDistanceConstraint
    ? `${formatLength(outsideDistanceConstraint.length)} \uD83D\uDD12`
    : formatLength(wall.outsideLength)

  const constraintColor = 'var(--color-primary)'
  const defaultColor = 'var(--color-foreground)'

  // --- H/V constraint handlers ---
  const handleAddHVConstraint = useCallback(() => {
    if (!suggestedHVType) return
    modelActions.addBuildingConstraint({
      type: suggestedHVType,
      nodeA: wall.startCornerId,
      nodeB: wall.endCornerId
    })
  }, [suggestedHVType, modelActions, wall.startCornerId, wall.endCornerId])

  const handleRemoveHVConstraint = useCallback(() => {
    if (!hvConstraint) return
    modelActions.removeBuildingConstraint(hvConstraint.id)
  }, [hvConstraint, modelActions])

  // --- Distance constraint handlers ---
  const handleDistanceClick = useCallback(
    (
      side: 'left' | 'right',
      existingConstraint: DistanceConstraint | undefined,
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
            type: 'distance',
            side,
            nodeA: wall.startCornerId,
            nodeB: wall.endCornerId,
            length: enteredValue
          })
        },
        onCancel: () => {
          if (existingConstraint) {
            modelActions.removeBuildingConstraint(existingConstraint.id)
          }
        }
      })
    },
    [viewportActions, modelActions, wall.startCornerId, wall.endCornerId]
  )

  // Whether to show H/V badge
  const showHVBadge = hvConstraint != null || (isSelected && suggestedHVType != null)

  // H/V badge label
  const hvLabel = hvConstraint
    ? hvConstraint.type === 'horizontal'
      ? '\u2015'
      : '\u007c'
    : suggestedHVType === 'horizontal'
      ? '\u2015'
      : '\u007c'

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
            color={insideDistanceConstraint ? constraintColor : defaultColor}
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
            color={insideDistanceConstraint ? constraintColor : defaultColor}
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
            color={outsideDistanceConstraint ? constraintColor : defaultColor}
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
            color={outsideDistanceConstraint ? constraintColor : defaultColor}
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
          tooltipKey={hvConstraint ? hvConstraint.type : (suggestedHVType ?? undefined)}
        />
      )}
    </g>
  )
}
