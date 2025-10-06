import type { SelectableId } from '@/building/model/ids'
import { isPerimeterId } from '@/building/model/ids'
import type { Perimeter } from '@/building/model/model'
import type { StoreActions } from '@/building/store/types'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/MovementBehavior'
import { PerimeterMovementPreview } from '@/editor/tools/basic/movement/previews/PerimeterMovementPreview'
import type { Vec2 } from '@/shared/geometry'
import { add } from '@/shared/geometry'
import { arePolygonsIntersecting } from '@/shared/geometry/polygon'

export interface PerimeterMovementState extends MovementState {
  movementDelta: Vec2 // The movement delta (renamed from offset)
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
      movementDelta: pointerState.delta
    }
  }

  constrainAndSnap(pointerState: PointerMovementState, _context: MovementContext<Perimeter>): PerimeterMovementState {
    // TODO: Snapping
    // TODO: Snap state should be in the movement context, so that is only filled once
    // TODO: Snapping for all points of the polygon, use the first snap found

    return { movementDelta: pointerState.delta }
  }

  validatePosition(movementState: PerimeterMovementState, context: MovementContext<Perimeter>): boolean {
    // Check if the moved polygon would intersect with other wall polygons
    const previewBoundary = context.entity.corners.map(corner => add(corner.insidePoint, movementState.movementDelta))

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
    return context.store.movePerimeter(wallId, movementState.movementDelta)
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<Perimeter>): boolean {
    // Validate the movement by checking intersections
    const previewBoundary = context.entity.corners.map(corner => add(corner.insidePoint, deltaDifference))

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

    // Apply the relative movement
    return context.store.movePerimeter(context.entity.id, deltaDifference)
  }
}
