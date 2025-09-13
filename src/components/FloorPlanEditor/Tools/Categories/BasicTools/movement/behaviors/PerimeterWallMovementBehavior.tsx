import type { MovementBehavior, MovementContext, PointerMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { PerimeterWall, Perimeter } from '@/types/model'
import { add, dot, scale, type Vec2 } from '@/types/geometry'
import { wouldClosingPolygonSelfIntersect } from '@/types/geometry/polygon'
import { isPerimeterId, isPerimeterWallId } from '@/types/ids'
import { PerimeterWallMovementPreview } from '../previews/PerimeterWallMovementPreview'

// Wall wall movement needs access to the wall to update the boundary
export interface PerimeterWallEntityContext {
  perimeter: Perimeter
  wall: PerimeterWall
  wallIndex: number // Index of the wall in the wall
}

// Wall wall movement state - just the projected delta along perpendicular
export interface PerimeterWallMovementState {
  projectedDelta: Vec2
  newBoundary: Vec2[]
}

export class PerimeterWallMovementBehavior
  implements MovementBehavior<PerimeterWallEntityContext, PerimeterWallMovementState>
{
  previewComponent = PerimeterWallMovementPreview
  getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): PerimeterWallEntityContext {
    const [perimeterId] = parentIds

    if (!isPerimeterId(perimeterId) || !isPerimeterWallId(entityId)) {
      throw new Error(`Invalid entity context for wall ${entityId}`)
    }

    const perimeter = store.getPerimeterById(perimeterId)
    const wall = store.getPerimeterWallById(perimeterId, entityId)

    if (!perimeter || !wall) {
      throw new Error(`Could not find wall or wall ${entityId}`)
    }

    // Find which wall index this is
    const wallIndex = perimeter.walls.findIndex(w => w.id === wall.id)
    if (wallIndex === -1) {
      throw new Error(`Could not find wall index for ${entityId}`)
    }

    return { perimeter, wall, wallIndex }
  }

  initializeState(
    pointerState: PointerMovementState,
    context: MovementContext<PerimeterWallEntityContext>
  ): PerimeterWallMovementState {
    const { perimeter, wall, wallIndex } = context.entity
    const projectedDistance = dot(pointerState.delta, wall.outsideDirection)
    const projectedDelta = scale(wall.outsideDirection, projectedDistance)

    const newBoundary = [...perimeter.boundary]
    newBoundary[wallIndex] = add(perimeter.boundary[wallIndex], projectedDelta)
    newBoundary[(wallIndex + 1) % perimeter.boundary.length] = add(
      perimeter.boundary[(wallIndex + 1) % perimeter.boundary.length],
      projectedDelta
    )
    return { projectedDelta, newBoundary }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<PerimeterWallEntityContext>
  ): PerimeterWallMovementState {
    const { perimeter, wall, wallIndex } = context.entity
    const projectedDistance = dot(pointerState.delta, wall.outsideDirection)
    const projectedDelta = scale(wall.outsideDirection, projectedDistance)

    const newBoundary = [...perimeter.boundary]
    newBoundary[wallIndex] = add(perimeter.boundary[wallIndex], projectedDelta)
    newBoundary[(wallIndex + 1) % perimeter.boundary.length] = add(
      perimeter.boundary[(wallIndex + 1) % perimeter.boundary.length],
      projectedDelta
    )
    return { projectedDelta, newBoundary }
  }

  validatePosition(
    movementState: PerimeterWallMovementState,
    _context: MovementContext<PerimeterWallEntityContext>
  ): boolean {
    return !wouldClosingPolygonSelfIntersect(movementState.newBoundary)
  }

  commitMovement(
    movementState: PerimeterWallMovementState,
    context: MovementContext<PerimeterWallEntityContext>
  ): boolean {
    return context.store.updatePerimeterBoundary(context.entity.perimeter.id, movementState.newBoundary)
  }
}
