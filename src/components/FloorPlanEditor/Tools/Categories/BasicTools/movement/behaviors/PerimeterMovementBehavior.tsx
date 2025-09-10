import type { MovementBehavior, MovementContext, MouseMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { Perimeter } from '@/types/model'
import type { Vec2 } from '@/types/geometry'
import { add } from '@/types/geometry'
import { arePolygonsIntersecting } from '@/types/geometry/polygon'
import { isPerimeterId } from '@/types/ids'
import { PerimeterMovementPreview } from '../previews/PerimeterMovementPreview'

export interface PerimeterMovementState {
  offset: Vec2 // Just the movement delta
}

export class PerimeterMovementBehavior implements MovementBehavior<Perimeter, PerimeterMovementState> {
  previewComponent = PerimeterMovementPreview
  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): Perimeter {
    if (!isPerimeterId(entityId)) {
      throw new Error(`Invalid entity context for wall ${entityId}`)
    }

    const wall = store.getPerimeterById(entityId)
    if (!wall) {
      throw new Error(`Could not find wall ${entityId}`)
    }

    return wall
  }

  initializeState(mouseState: MouseMovementState, _context: MovementContext<Perimeter>): PerimeterMovementState {
    return {
      offset: mouseState.delta
    }
  }

  constrainAndSnap(mouseState: MouseMovementState, _context: MovementContext<Perimeter>): PerimeterMovementState {
    // TODO: Snapping
    // TODO: Snap state should be in the movement context, so that is only filled once
    // TODO: Snapping for all points of the polygon, use the first snap found

    return { offset: mouseState.delta }
  }

  validatePosition(movementState: PerimeterMovementState, context: MovementContext<Perimeter>): boolean {
    // Check if the moved polygon would intersect with other wall polygons
    const previewBoundary = context.entity.boundary.map(point => add(point, movementState.offset))

    // Get other walls on the same floor
    const currentWall = context.entity
    const allWalls = context.store.getPerimetersByStorey(currentWall.storeyId)
    const otherWalls = allWalls.filter(wall => wall.id !== currentWall.id)

    // Check for intersections with other wall polygons
    for (const otherWall of otherWalls) {
      if (arePolygonsIntersecting({ points: previewBoundary }, { points: otherWall.boundary })) {
        return false
      }
    }

    return true
  }

  commitMovement(movementState: PerimeterMovementState, context: MovementContext<Perimeter>): boolean {
    const wallId = context.entity.id
    return context.store.movePerimeter(wallId, movementState.offset)
  }
}
