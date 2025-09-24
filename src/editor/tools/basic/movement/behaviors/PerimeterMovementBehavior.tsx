import type { MovementBehavior, MovementContext, PointerMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/shared/types/ids'
import type { StoreActions } from '@/building/store/types'
import type { Perimeter } from '@/shared/types/model'
import type { Vec2 } from '@/shared/geometry'
import { add } from '@/shared/geometry'
import { arePolygonsIntersecting } from '@/shared/geometry/polygon'
import { isPerimeterId } from '@/shared/types/ids'
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

  initializeState(pointerState: PointerMovementState, _context: MovementContext<Perimeter>): PerimeterMovementState {
    return {
      offset: pointerState.delta
    }
  }

  constrainAndSnap(pointerState: PointerMovementState, _context: MovementContext<Perimeter>): PerimeterMovementState {
    // TODO: Snapping
    // TODO: Snap state should be in the movement context, so that is only filled once
    // TODO: Snapping for all points of the polygon, use the first snap found

    return { offset: pointerState.delta }
  }

  validatePosition(movementState: PerimeterMovementState, context: MovementContext<Perimeter>): boolean {
    // Check if the moved polygon would intersect with other wall polygons
    const previewBoundary = context.entity.corners.map(corner => add(corner.insidePoint, movementState.offset))

    // Get other walls on the same floor
    const currentWall = context.entity
    const allWalls = context.store.getPerimetersByStorey(currentWall.storeyId)
    const otherWalls = allWalls.filter(wall => wall.id !== currentWall.id)

    // Check for intersections with other wall polygons
    for (const otherWall of otherWalls) {
      if (arePolygonsIntersecting({ points: previewBoundary }, { points: otherWall.corners.map(c => c.insidePoint) })) {
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
