
import type { SelectableId } from '@/building/model/ids'
import { isPerimeterId } from '@/building/model/ids'
import type { Perimeter } from '@/building/model/model'
import type { StoreActions } from '@/building/store/types'
import type { SnappingContext } from '@/editor/services/snapping/types'
import type { MovementContext } from '@/editor/tools/basic/movement/MovementBehavior'
import { type Vec2 } from '@/shared/geometry'
import { arePolygonsIntersecting } from '@/shared/geometry/polygon'

import {
  type PolygonEntityContext,
  PolygonMovementBehavior,
  type PolygonMovementState
} from './PolygonMovementBehavior'

export interface PerimeterEntityContext extends PolygonEntityContext {
  perimeter: Perimeter
}

export type PerimeterMovementState = PolygonMovementState

export class PerimeterMovementBehavior extends PolygonMovementBehavior<PerimeterEntityContext> {
  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): PerimeterEntityContext {
    if (!isPerimeterId(entityId)) {
      throw new Error(`Invalid entity context for wall ${entityId}`)
    }

    const perimeter = store.getPerimeterById(entityId)
    if (!perimeter) {
      throw new Error(`Could not find wall ${entityId}`)
    }

    const activeStorey = store.getActiveStoreyId()
    const storeys = store.getStoreysOrderedByLevel()
    const storeyIndex = storeys.findIndex(s => s.id === activeStorey)
    const lowerStorey = storeyIndex > 0 ? storeys[storeyIndex - 1] : null
    const lowerPerimeters = lowerStorey ? store.getPerimetersByStorey(lowerStorey.id) : []
    const lowerPerimeterPoints = lowerPerimeters.flatMap(p => p.referencePolygon)

    const otherPerimeters = store.getPerimetersByStorey(activeStorey).filter(p => p.id !== entityId)
    const otherPerimeterPoints = otherPerimeters.flatMap(p => p.referencePolygon)

    const snapContext: SnappingContext = {
      snapPoints: lowerPerimeterPoints,
      alignPoints: otherPerimeterPoints
    }

    return { perimeter, snapContext }
  }

  protected getPolygonPoints(context: MovementContext<PerimeterEntityContext>): readonly Vec2[] {
    return context.entity.perimeter.referencePolygon
  }

  validatePosition(movementState: PerimeterMovementState, context: MovementContext<PerimeterEntityContext>): boolean {
    return this.isDeltaValid(movementState.movementDelta, context)
  }

  commitMovement(movementState: PerimeterMovementState, context: MovementContext<PerimeterEntityContext>): boolean {
    if (!this.isDeltaValid(movementState.movementDelta, context)) {
      return false
    }
    return super.commitMovement(movementState, context)
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<PerimeterEntityContext>): boolean {
    if (!this.isDeltaValid(deltaDifference, context)) {
      return false
    }

    return super.applyRelativeMovement(deltaDifference, context)
  }

  protected applyMovementDelta(delta: Vec2, context: MovementContext<PerimeterEntityContext>): boolean {
    const wallId = context.entity.perimeter.id
    return context.store.movePerimeter(wallId, delta)
  }

  private isDeltaValid(delta: Vec2, context: MovementContext<PerimeterEntityContext>): boolean {
    const previewOutside = this.translatePoints(
      context.entity.perimeter.corners.map(corner => corner.outsidePoint),
      delta
    )

    const currentWall = context.entity.perimeter
    const allWalls = context.store.getPerimetersByStorey(currentWall.storeyId)
    const otherWalls = allWalls.filter(wall => wall.id !== currentWall.id)

    for (const otherWall of otherWalls) {
      if (
        arePolygonsIntersecting(
          { points: previewOutside },
          { points: otherWall.corners.map(corner => corner.outsidePoint) }
        )
      ) {
        return false
      }
    }

    return true
  }
}
