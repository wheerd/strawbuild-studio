import { useMemo } from 'react'

import type {
  Constraint,
  HorizontalWallConstraint,
  VerticalWallConstraint,
  WallLengthConstraint
} from '@/building/model'
import type { PerimeterCornerId, PerimeterWallId } from '@/building/model/ids'
import {
  getModelActions,
  useConstraintsForEntity,
  usePerimeterCornerById,
  usePerimeterWallById
} from '@/building/store'
import { useWallAssemblyById } from '@/construction/config/store'
import { ConstraintBadge } from '@/editor/components/ConstraintBadge'
import { gcsService } from '@/editor/gcs/service'
import { useConstraintStatus } from '@/editor/gcs/store'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput } from '@/editor/services/length-input'
import { ClickableLengthIndicator } from '@/editor/utils/ClickableLengthIndicator'
import { LengthIndicator } from '@/editor/utils/LengthIndicator'
import { type Length, type Vec2, midpoint } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

const SUGGESTION_SIN_TOLERANCE = Math.sin((5 * Math.PI) / 180)

function findWallLengthConstraint(
  constraints: readonly Constraint[],
  wallId: PerimeterWallId,
  side: 'left' | 'right'
): WallLengthConstraint | undefined {
  return constraints.find(
    (c): c is WallLengthConstraint => c.type === 'wallLength' && c.wall === wallId && c.side === side
  )
}

function findHVConstraint(
  constraints: readonly Constraint[],
  wallId: PerimeterWallId
): (HorizontalWallConstraint | VerticalWallConstraint) | undefined {
  return constraints.find(
    (c): c is HorizontalWallConstraint | VerticalWallConstraint =>
      (c.type === 'horizontalWall' || c.type === 'verticalWall') && c.wall === wallId
  )
}

function handleDistanceConstraintClick(
  side: 'left' | 'right',
  existingConstraint: WallLengthConstraint | undefined,
  currentLength: Length,
  indicatorStartPoint: Vec2,
  indicatorEndPoint: Vec2,
  wallId: PerimeterWallId
) {
  const { addBuildingConstraint, removeBuildingConstraint } = getModelActions()
  const { worldToStage } = viewportActions()

  const mid = midpoint(indicatorStartPoint, indicatorEndPoint)

  const stagePos = worldToStage(mid)
  const initialValue = existingConstraint ? existingConstraint.length : currentLength

  activateLengthInput({
    showImmediately: true,
    position: { x: stagePos[0], y: stagePos[1] },
    initialValue,
    placeholder: 'Enter length...',
    onCommit: enteredValue => {
      addBuildingConstraint({
        type: 'wallLength',
        side,
        wall: wallId,
        length: enteredValue
      })
      gcsService.triggerSolve()
    },
    onCancel: () => {
      if (existingConstraint) {
        removeBuildingConstraint(existingConstraint.id)
        gcsService.triggerSolve()
      }
    }
  })
}

function handleHVConstraintToggle(
  wallId: PerimeterWallId,
  hvConstraint: (HorizontalWallConstraint | VerticalWallConstraint) | undefined,
  suggestedHVType: 'horizontalWall' | 'verticalWall' | null
) {
  const { addBuildingConstraint, removeBuildingConstraint } = getModelActions()

  if (hvConstraint) {
    removeBuildingConstraint(hvConstraint.id)
    gcsService.triggerSolve()
  } else if (suggestedHVType) {
    addBuildingConstraint({
      type: suggestedHVType,
      wall: wallId
    })
    gcsService.triggerSolve()
  }
}

function WallLengthIndicator({
  wallId,
  side,
  startPoint,
  endPoint,
  offset,
  isSelected,
  currentLength,
  constraint
}: {
  wallId: PerimeterWallId
  side: 'left' | 'right'
  startPoint: Vec2
  endPoint: Vec2
  offset: number
  isSelected: boolean
  currentLength: Length
  constraint?: WallLengthConstraint
}) {
  const { formatLength } = useFormatters()

  const constraintStatus = useConstraintStatus(constraint?.id)

  const color = useMemo(() => {
    if (constraintStatus.conflicting) return 'var(--color-red-600)'
    if (constraintStatus.redundant) return 'var(--color-amber-500)'
    return isSelected ? 'var(--color-foreground)' : 'var(--color-muted-foreground)'
  }, [constraintStatus, isSelected])

  const label = constraint ? `${formatLength(constraint.length)} \uD83D\uDD12` : formatLength(currentLength)

  return isSelected ? (
    <ClickableLengthIndicator
      startPoint={startPoint}
      endPoint={endPoint}
      label={label}
      offset={offset}
      color={color}
      fontSize={60}
      strokeWidth={5}
      onClick={() => {
        handleDistanceConstraintClick(side, constraint, currentLength, startPoint, endPoint, wallId)
      }}
    />
  ) : (
    <LengthIndicator
      startPoint={startPoint}
      endPoint={endPoint}
      label={label}
      offset={offset}
      color={color}
      fontSize={60}
      strokeWidth={5}
    />
  )
}

function HVConstraintBadge({
  wall,
  startCornerId,
  endCornerId,
  hvConstraint,
  suggestedHVType,
  subEntitySelected,
  onClick
}: {
  wall: { outsideDirection: Vec2 }
  startCornerId: PerimeterCornerId
  endCornerId: PerimeterCornerId
  hvConstraint: (HorizontalWallConstraint | VerticalWallConstraint) | undefined
  suggestedHVType: 'horizontalWall' | 'verticalWall' | null
  subEntitySelected: boolean
  onClick: (() => void) | undefined
}) {
  const startCorner = usePerimeterCornerById(startCornerId)
  const endCorner = usePerimeterCornerById(endCornerId)
  const hvStatus = useConstraintStatus(hvConstraint?.id)

  const label = hvConstraint
    ? hvConstraint.type === 'horizontalWall'
      ? '—'
      : '\u2223'
    : suggestedHVType === 'horizontalWall'
      ? '—'
      : '\u2223'

  const tooltipKey = hvConstraint
    ? hvConstraint.type === 'horizontalWall'
      ? ('horizontal' as const)
      : ('vertical' as const)
    : suggestedHVType === 'horizontalWall'
      ? ('horizontal' as const)
      : suggestedHVType === 'verticalWall'
        ? ('vertical' as const)
        : undefined

  const getBadgeStatus = (status: { conflicting: boolean; redundant: boolean }) => {
    if (status.conflicting) return 'conflicting'
    if (status.redundant) return 'redundant'
    return 'normal'
  }

  return (
    <ConstraintBadge
      label={label}
      offset={subEntitySelected ? 280 : 220}
      startPoint={startCorner.outsidePoint}
      endPoint={endCorner.outsidePoint}
      outsideDirection={wall.outsideDirection}
      locked={hvConstraint != null}
      onClick={onClick}
      tooltipKey={tooltipKey}
      status={getBadgeStatus(hvStatus)}
    />
  )
}

export function PerimeterWallShape({ wallId }: { wallId: PerimeterWallId }): React.JSX.Element {
  const { isCurrentSelection, isSelected } = useSelectionStore()

  const wall = usePerimeterWallById(wallId)
  const startCorner = usePerimeterCornerById(wall.startCornerId)
  const endCorner = usePerimeterCornerById(wall.endCornerId)

  const wallAssembly = useWallAssemblyById(wall.wallAssemblyId)
  const fillColor = wallAssembly?.type === 'non-strawbale' ? MATERIAL_COLORS.other : MATERIAL_COLORS.strawbale

  const selected = isCurrentSelection(wall.id)
  const subEntitySelected = isSelected(wall.id) && !selected

  const wallPath = polygonToSvgPath(wall.polygon)

  const wallConstraints = useConstraintsForEntity(wallId)
  const insideDistanceConstraint = useMemo(
    () => findWallLengthConstraint(wallConstraints, wallId, 'right'),
    [wallConstraints, wallId]
  )
  const outsideDistanceConstraint = useMemo(
    () => findWallLengthConstraint(wallConstraints, wallId, 'left'),
    [wallConstraints, wallId]
  )
  const hvConstraint = useMemo(() => findHVConstraint(wallConstraints, wallId), [wallConstraints, wallId])

  const suggestedHVType = useMemo<'horizontalWall' | 'verticalWall' | null>(() => {
    if (hvConstraint) return null
    const dx = wall.direction[0]
    const dy = wall.direction[1]
    if (Math.abs(dy) < SUGGESTION_SIN_TOLERANCE) return 'horizontalWall'
    if (Math.abs(dx) < SUGGESTION_SIN_TOLERANCE) return 'verticalWall'
    return null
  }, [hvConstraint, wall.direction])

  return (
    <g data-entity-id={wall.id} data-entity-type="perimeter-wall" data-parent-ids={JSON.stringify([wall.perimeterId])}>
      <path d={wallPath} fill={fillColor} className="stroke-border-contrast stroke-10" />

      {(selected || insideDistanceConstraint != null) && (
        <WallLengthIndicator
          wallId={wallId}
          side="right"
          startPoint={startCorner.insidePoint}
          endPoint={endCorner.insidePoint}
          offset={subEntitySelected ? -180 : -120}
          isSelected={selected}
          currentLength={wall.insideLength}
          constraint={insideDistanceConstraint}
        />
      )}

      {(selected || outsideDistanceConstraint != null) && (
        <WallLengthIndicator
          wallId={wallId}
          side="left"
          startPoint={startCorner.outsidePoint}
          endPoint={endCorner.outsidePoint}
          offset={subEntitySelected ? 180 : 120}
          isSelected={selected}
          currentLength={wall.outsideLength}
          constraint={outsideDistanceConstraint}
        />
      )}

      {(hvConstraint != null || (selected && suggestedHVType != null)) && (
        <HVConstraintBadge
          wall={wall}
          startCornerId={wall.startCornerId}
          endCornerId={wall.endCornerId}
          hvConstraint={hvConstraint}
          suggestedHVType={suggestedHVType}
          subEntitySelected={subEntitySelected}
          onClick={
            selected
              ? () => {
                  handleHVConstraintToggle(wallId, hvConstraint, suggestedHVType)
                }
              : undefined
          }
        />
      )}
    </g>
  )
}
