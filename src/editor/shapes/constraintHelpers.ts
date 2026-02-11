import type { Constraint, WallEntityAbsoluteConstraint, WallEntityRelativeConstraint } from '@/building/model'
import type { PerimeterCornerId, WallEntityId } from '@/building/model/ids'

export function findAbsoluteConstraint(
  constraints: readonly Constraint[],
  entityId: WallEntityId,
  nodeId: PerimeterCornerId,
  side: 'left' | 'right',
  entitySide: 'start' | 'center' | 'end'
): WallEntityAbsoluteConstraint | undefined {
  return constraints.find(
    (c): c is WallEntityAbsoluteConstraint =>
      c.type === 'wallEntityAbsolute' &&
      c.entity === entityId &&
      c.node === nodeId &&
      c.side === side &&
      c.entitySide === entitySide
  )
}

export function findCornerConstraintForEntity(
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

export function findRelativeConstraint(
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

export function getEntitySide(
  constraint: WallEntityRelativeConstraint,
  entityId: WallEntityId
): 'start' | 'center' | 'end' | undefined {
  return constraint.entityA === entityId
    ? constraint.entityASide
    : constraint.entityB === entityId
      ? constraint.entityBSide
      : undefined
}
