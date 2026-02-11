import { useMemo } from 'react'

import type {
  Constraint,
  PerimeterCornerWithGeometry,
  WallEntity,
  WallEntityAbsoluteConstraint,
  WallEntityGeometry,
  WallEntityRelativeConstraint
} from '@/building/model'
import type { PerimeterCornerId, WallEntityId } from '@/building/model/ids'
import { isOpeningId } from '@/building/model/ids'
import {
  getModelActions,
  useConstraintsForEntity,
  useModelActions,
  usePerimeterCornerById,
  usePerimeterWallById
} from '@/building/store'
import { CenterModeToggleBadge } from '@/editor/components/CenterModeToggleBadge'
import { gcsService } from '@/editor/gcs/service'
import { useConstraintStatus } from '@/editor/gcs/store'
import { useConstraintDisplayMode } from '@/editor/hooks/useConstraintDisplayMode'
import { useCurrentSelection } from '@/editor/hooks/useSelectionStore'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput } from '@/editor/services/length-input'
import { ClickableLengthIndicator } from '@/editor/utils/ClickableLengthIndicator'
import { LengthIndicator } from '@/editor/utils/LengthIndicator'
import { type Length, type Vec2, direction, midpoint, perpendicularCCW, scaleAddVec2 } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

export function EntityMeasurementsShape({ entity }: { entity: WallEntity & WallEntityGeometry }): React.JSX.Element {
  const { formatLength } = useFormatters()
  const modelActions = useModelActions()

  const wall = usePerimeterWallById(entity.wallId)
  const startCorner = usePerimeterCornerById(wall.startCornerId)
  const endCorner = usePerimeterCornerById(wall.endCornerId)

  const isSelected = useCurrentSelection() === entity.id
  const { mode, toggleMode } = useConstraintDisplayMode()

  const constraints = useConstraintsForEntity(entity.id)

  const startCornerConstraint = useMemo(
    () => findCornerConstraintForEntity(constraints, startCorner.id, entity.id),
    [constraints, startCorner.id, entity.id]
  )
  const endCornerConstraint = useMemo(
    () => findCornerConstraintForEntity(constraints, endCorner.id, entity.id),
    [constraints, endCorner.id, entity.id]
  )

  const allObstacles = wall.entityIds
    .map(id => (isOpeningId(id) ? modelActions.getWallOpeningById(id) : modelActions.getWallPostById(id)))
    .sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)

  const currentIndex = allObstacles.findIndex(o => o.id === entity.id)
  const previousEntity = currentIndex > 0 ? allObstacles[currentIndex - 1] : null
  const nextEntity = currentIndex < allObstacles.length - 1 ? allObstacles[currentIndex + 1] : null

  const prevEntityConstraint = useMemo(
    () => (previousEntity ? findRelativeConstraint(constraints, entity.id, previousEntity.id) : undefined),
    [constraints, previousEntity]
  )
  const nextEntityConstraint = useMemo(
    () => (nextEntity ? findRelativeConstraint(constraints, entity.id, nextEntity.id) : undefined),
    [constraints, nextEntity]
  )
  const otherRelativeConstraints = useMemo(
    () =>
      constraints.filter(
        c => c.type === 'wallEntityRelative' && c.id !== prevEntityConstraint?.id && c.id !== nextEntityConstraint?.id
      ) as WallEntityRelativeConstraint[],
    [constraints, prevEntityConstraint, nextEntityConstraint]
  )

  return (
    <>
      {previousEntity && (isSelected || prevEntityConstraint) && (
        <ConstrainableEntityDistance
          entity={entity}
          other={previousEntity}
          isSelected={isSelected}
          mode="prev"
          useCenter={mode === 'center'}
          constraint={prevEntityConstraint}
          dimensionLayer={1}
        />
      )}

      {nextEntity && (isSelected || nextEntityConstraint) && (
        <ConstrainableEntityDistance
          entity={entity}
          other={nextEntity}
          isSelected={isSelected}
          mode="next"
          useCenter={mode === 'center'}
          constraint={nextEntityConstraint}
          dimensionLayer={1}
        />
      )}

      {otherRelativeConstraints.map(constraint => {
        const constraintMode = constraint.entityA === entity.id ? 'next' : 'prev'
        const otherEntityId = constraint.entityA === entity.id ? constraint.entityB : constraint.entityA
        const otherEntity = allObstacles.find(e => e.id === otherEntityId)
        return (
          otherEntity && (
            <ConstrainableEntityDistance
              key={constraint.id}
              entity={entity}
              other={otherEntity}
              isSelected={isSelected}
              mode={constraintMode}
              useCenter={mode === 'center'}
              constraint={constraint}
              dimensionLayer={5}
            />
          )
        )
      })}

      {(isSelected || startCornerConstraint?.side === 'right') && (
        <ConstrainableCornerDistance
          entity={entity}
          corner={startCorner}
          mode="prev"
          useCenter={mode === 'center'}
          inside
          isSelected={isSelected}
          constraint={startCornerConstraint ?? undefined}
          dimensionLayer={previousEntity ? 2 : 1}
        />
      )}

      {(isSelected || startCornerConstraint?.side === 'left') && (
        <ConstrainableCornerDistance
          entity={entity}
          corner={startCorner}
          mode="prev"
          useCenter={mode === 'center'}
          inside={false}
          isSelected={isSelected}
          constraint={startCornerConstraint ?? undefined}
          dimensionLayer={previousEntity ? 2 : 1}
        />
      )}

      {(isSelected || endCornerConstraint?.side === 'right') && (
        <ConstrainableCornerDistance
          entity={entity}
          corner={endCorner}
          mode="next"
          useCenter={mode === 'center'}
          inside
          isSelected={isSelected}
          constraint={endCornerConstraint ?? undefined}
          dimensionLayer={nextEntity ? 2 : 1}
        />
      )}

      {(isSelected || endCornerConstraint?.side === 'left') && (
        <ConstrainableCornerDistance
          entity={entity}
          corner={endCorner}
          mode="next"
          useCenter={mode === 'center'}
          inside={false}
          isSelected={isSelected}
          constraint={endCornerConstraint ?? undefined}
          dimensionLayer={nextEntity ? 2 : 1}
        />
      )}

      <LengthIndicator
        startPoint={entity.outsideLine.start}
        endPoint={entity.outsideLine.end}
        label={formatLength(entity.width)}
        offset={60}
        color={isSelected ? 'var(--color-foreground)' : 'var(--color-muted-foreground)'}
        fontSize={50}
        strokeWidth={4}
      />

      {isSelected && <CenterModeToggleBadge mode={mode} position={entity.center} onClick={toggleMode} />}
    </>
  )
}

function ConstrainableCornerDistance({
  inside,
  isSelected,
  mode,
  useCenter,
  constraint,
  entity,
  corner,
  dimensionLayer
}: {
  corner: PerimeterCornerWithGeometry
  entity: WallEntity & WallEntityGeometry
  mode: 'prev' | 'next'
  useCenter: boolean
  inside: boolean
  isSelected: boolean
  constraint?: WallEntityAbsoluteConstraint
  dimensionLayer: number
}) {
  const { formatLength } = useFormatters()
  const constraintStatus = useConstraintStatus(constraint?.id)
  const isConstrained = constraint?.side === (inside ? 'right' : 'left')
  useCenter = isConstrained ? constraint.entitySide === 'center' : useCenter
  const entitySide = useCenter ? 'center' : mode === 'prev' ? 'start' : 'end'

  const color = useMemo(() => {
    if (constraintStatus.conflicting) return 'var(--color-red-600)'
    if (constraintStatus.redundant) return 'var(--color-amber-500)'
    return isSelected ? 'var(--color-foreground)' : 'var(--color-muted-foreground)'
  }, [constraintStatus, isSelected])

  const cornerPoint = inside ? corner.insidePoint : corner.outsidePoint
  const entityLine = inside ? entity.insideLine : entity.outsideLine
  const entityPoint =
    entitySide === 'center'
      ? midpoint(entityLine.start, entityLine.end)
      : entitySide === 'start'
        ? entityLine.start
        : entityLine.end
  const startPoint = mode === 'prev' ? cornerPoint : entityPoint
  const endPoint = mode === 'next' ? cornerPoint : entityPoint

  const label = isConstrained ? `${formatLength(constraint.distance)} \uD83D\uDD12` : undefined
  const offset = (inside ? -dimensionLayer : dimensionLayer) * 60

  return (
    <ClickableLengthIndicator
      startPoint={startPoint}
      endPoint={endPoint}
      offset={offset}
      fontSize={50}
      strokeWidth={4}
      color={color}
      label={label}
      onClick={measurement => {
        handleCornerDistanceClick(
          entity,
          corner.id,
          entitySide,
          inside,
          isConstrained ? constraint : undefined,
          measurement,
          startPoint,
          endPoint
        )
      }}
    />
  )
}

function ConstrainableEntityDistance({
  isSelected,
  mode,
  useCenter,
  constraint,
  entity,
  other,
  dimensionLayer
}: {
  other: WallEntity & WallEntityGeometry
  entity: WallEntity & WallEntityGeometry
  mode: 'prev' | 'next'
  useCenter: boolean
  isSelected: boolean
  constraint?: WallEntityRelativeConstraint
  dimensionLayer: number
}) {
  const { formatLength } = useFormatters()
  const constraintStatus = useConstraintStatus(constraint?.id)
  useCenter = constraint != null ? constraint.entityASide === 'center' : useCenter

  const color = useMemo(() => {
    if (constraintStatus.conflicting) return 'var(--color-red-600)'
    if (constraintStatus.redundant) return 'var(--color-amber-500)'
    return isSelected ? 'var(--color-foreground)' : 'var(--color-muted-foreground)'
  }, [constraintStatus, isSelected])

  const startLine = mode === 'prev' ? other.outsideLine : entity.outsideLine
  const startPoint = useCenter ? midpoint(startLine.start, startLine.end) : startLine.end
  const endLine = mode === 'next' ? other.outsideLine : entity.outsideLine
  const endPoint = useCenter ? midpoint(endLine.start, endLine.end) : endLine.start

  const entitySide = useCenter ? 'center' : mode === 'prev' ? 'start' : 'end'
  const otherSide = useCenter ? 'center' : mode === 'next' ? 'start' : 'end'

  const label = constraint ? `${formatLength(constraint.distance)} \uD83D\uDD12` : undefined

  return (
    <ClickableLengthIndicator
      startPoint={startPoint}
      endPoint={endPoint}
      offset={dimensionLayer * 60}
      fontSize={50}
      strokeWidth={4}
      color={color}
      label={label}
      onClick={measurement => {
        handleEntityDistanceClick(entity, other, entitySide, otherSide, constraint, measurement, startPoint, endPoint)
      }}
    />
  )
}

function handleEntityDistanceClick(
  entityA: WallEntity,
  entityB: WallEntity,
  entityASide: 'start' | 'center' | 'end',
  entityBSide: 'start' | 'center' | 'end',
  existingConstraint: WallEntityRelativeConstraint | undefined,
  currentDistance: Length,
  indicatorStartPoint: Vec2,
  indicatorEndPoint: Vec2
) {
  const { addBuildingConstraint, removeBuildingConstraint } = getModelActions()
  const { worldToStage } = viewportActions()

  const mid = midpoint(indicatorStartPoint, indicatorEndPoint)
  const dir = direction(indicatorStartPoint, indicatorEndPoint)
  const perp = perpendicularCCW(dir)
  const offsetMid = scaleAddVec2(mid, perp, 90)

  const stagePos = worldToStage(offsetMid)
  const initialValue = existingConstraint ? existingConstraint.distance : currentDistance

  activateLengthInput({
    showImmediately: true,
    position: { x: stagePos[0] + 20, y: stagePos[1] - 30 },
    initialValue,
    placeholder: 'Enter distance...',
    onCommit: enteredValue => {
      addBuildingConstraint({
        type: 'wallEntityRelative',
        wall: entityA.wallId,
        entityA: entityA.id,
        entityASide,
        entityB: entityB.id,
        entityBSide,
        distance: enteredValue
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

function handleCornerDistanceClick(
  entity: WallEntity,
  cornerId: PerimeterCornerId,
  entitySide: 'start' | 'center' | 'end',
  isInside: boolean,
  existingConstraint: WallEntityAbsoluteConstraint | undefined,
  currentDistance: Length,
  indicatorStartPoint: Vec2,
  indicatorEndPoint: Vec2
) {
  const { addBuildingConstraint, removeBuildingConstraint } = getModelActions()
  const { worldToStage } = viewportActions()

  const mid = midpoint(indicatorStartPoint, indicatorEndPoint)
  const dir = direction(indicatorStartPoint, indicatorEndPoint)
  const perp = perpendicularCCW(dir)
  const offsetMid = scaleAddVec2(mid, perp, isInside ? -60 : 90)

  const stagePos = worldToStage(offsetMid)
  const initialValue = existingConstraint ? existingConstraint.distance : currentDistance

  activateLengthInput({
    showImmediately: true,
    position: { x: stagePos[0] + 20, y: stagePos[1] - 30 },
    initialValue,
    placeholder: 'Enter distance...',
    onCommit: enteredValue => {
      addBuildingConstraint({
        type: 'wallEntityAbsolute',
        wall: entity.wallId,
        entity: entity.id,
        node: cornerId,
        side: isInside ? 'right' : 'left',
        entitySide,
        distance: enteredValue
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

function findCornerConstraintForEntity(
  constraints: readonly Constraint[],
  cornerId: PerimeterCornerId,
  entityId: WallEntityId
): WallEntityAbsoluteConstraint | null {
  const constraint = constraints.find(
    (c): c is WallEntityAbsoluteConstraint =>
      c.type === 'wallEntityAbsolute' && c.entity === entityId && c.node === cornerId
  )
  return constraint ?? null
}

function findRelativeConstraint(
  constraints: readonly Constraint[],
  entityAId: WallEntityId,
  entityBId: WallEntityId
): WallEntityRelativeConstraint | undefined {
  return constraints.find(
    (c): c is WallEntityRelativeConstraint =>
      c.type === 'wallEntityRelative' &&
      ((c.entityA === entityAId && c.entityB === entityBId) || (c.entityA === entityBId && c.entityB === entityAId))
  )
}
