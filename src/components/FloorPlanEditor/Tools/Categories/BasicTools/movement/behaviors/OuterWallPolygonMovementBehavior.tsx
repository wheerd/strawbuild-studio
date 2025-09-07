import type { MovementBehavior, MovementContext, MouseMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { OuterWallPolygon } from '@/types/model'
import type { Vec2 } from '@/types/geometry'
import { add } from '@/types/geometry'
import { arePolygonsIntersecting } from '@/types/geometry/polygon'
import { isOuterWallId } from '@/types/ids'
import { OuterWallPolygonMovementPreview } from '../previews/OuterWallPolygonMovementPreview'

export interface PolygonMovementState {
  offset: Vec2 // Just the movement delta
}

export class OuterWallPolygonMovementBehavior implements MovementBehavior<OuterWallPolygon, PolygonMovementState> {
  previewComponent = OuterWallPolygonMovementPreview
  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): OuterWallPolygon {
    if (!isOuterWallId(entityId)) {
      throw new Error(`Invalid entity context for wall ${entityId}`)
    }

    const wall = store.getOuterWallById(entityId)
    if (!wall) {
      throw new Error(`Could not find wall ${entityId}`)
    }

    return wall
  }

  initializeState(mouseState: MouseMovementState, _context: MovementContext<OuterWallPolygon>): PolygonMovementState {
    return {
      offset: mouseState.delta
    }
  }

  constrainAndSnap(mouseState: MouseMovementState, _context: MovementContext<OuterWallPolygon>): PolygonMovementState {
    // TODO: Snapping
    // TODO: Snap state should be in the movement context, so that is only filled once
    // TODO: Snapping for all points of the polygon, use the first snap found

    return { offset: mouseState.delta }
  }

  validatePosition(movementState: PolygonMovementState, context: MovementContext<OuterWallPolygon>): boolean {
    // Check if the moved polygon would intersect with other wall polygons
    const previewBoundary = context.entity.boundary.map(point => add(point, movementState.offset))

    // Get other walls on the same floor
    const currentWall = context.entity
    const allWalls = context.store.getOuterWallsByFloor(currentWall.floorId)
    const otherWalls = allWalls.filter(wall => wall.id !== currentWall.id)

    // Check for intersections with other wall polygons
    for (const otherWall of otherWalls) {
      if (arePolygonsIntersecting({ points: previewBoundary }, { points: otherWall.boundary })) {
        return false
      }
    }

    return true
  }

  commitMovement(movementState: PolygonMovementState, context: MovementContext<OuterWallPolygon>): boolean {
    const wallId = context.entity.id
    return context.store.moveOuterWallPolygon(wallId, movementState.offset)
  }
}
