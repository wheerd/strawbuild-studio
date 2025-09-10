import type { MovementBehavior, MovementContext, MouseMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { OuterWallSegment, Perimeter } from '@/types/model'
import { add, dot, scale, type Vec2 } from '@/types/geometry'
import { wouldClosingPolygonSelfIntersect } from '@/types/geometry/polygon'
import { isPerimeterId, isWallSegmentId } from '@/types/ids'
import { WallSegmentMovementPreview } from '../previews/WallSegmentMovementPreview'

// Wall segment movement needs access to the wall to update the boundary
export interface WallSegmentEntityContext {
  wall: Perimeter
  segment: OuterWallSegment
  segmentIndex: number // Index of the segment in the wall
}

// Wall segment movement state - just the projected delta along perpendicular
export interface WallSegmentMovementState {
  projectedDelta: Vec2
  newBoundary: Vec2[]
}

export class WallSegmentMovementBehavior
  implements MovementBehavior<WallSegmentEntityContext, WallSegmentMovementState>
{
  previewComponent = WallSegmentMovementPreview
  getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): WallSegmentEntityContext {
    const [wallId] = parentIds

    if (!isPerimeterId(wallId) || !isWallSegmentId(entityId)) {
      throw new Error(`Invalid entity context for segment ${entityId}`)
    }

    const wall = store.getPerimeterById(wallId)
    const segment = store.getSegmentById(wallId, entityId)

    if (!wall || !segment) {
      throw new Error(`Could not find wall or segment ${entityId}`)
    }

    // Find which segment index this is
    const segmentIndex = wall.segments.findIndex(s => s.id === segment.id)
    if (segmentIndex === -1) {
      throw new Error(`Could not find segment index for ${entityId}`)
    }

    return { wall, segment, segmentIndex }
  }

  initializeState(
    mouseState: MouseMovementState,
    context: MovementContext<WallSegmentEntityContext>
  ): WallSegmentMovementState {
    const { wall, segment, segmentIndex } = context.entity
    const projectedDistance = dot(mouseState.delta, segment.outsideDirection)
    const projectedDelta = scale(segment.outsideDirection, projectedDistance)

    const newBoundary = [...wall.boundary]
    newBoundary[segmentIndex] = add(wall.boundary[segmentIndex], projectedDelta)
    newBoundary[(segmentIndex + 1) % wall.boundary.length] = add(
      wall.boundary[(segmentIndex + 1) % wall.boundary.length],
      projectedDelta
    )
    return { projectedDelta, newBoundary }
  }

  constrainAndSnap(
    mouseState: MouseMovementState,
    context: MovementContext<WallSegmentEntityContext>
  ): WallSegmentMovementState {
    const { wall, segment, segmentIndex } = context.entity
    const projectedDistance = dot(mouseState.delta, segment.outsideDirection)
    const projectedDelta = scale(segment.outsideDirection, projectedDistance)

    const newBoundary = [...wall.boundary]
    newBoundary[segmentIndex] = add(wall.boundary[segmentIndex], projectedDelta)
    newBoundary[(segmentIndex + 1) % wall.boundary.length] = add(
      wall.boundary[(segmentIndex + 1) % wall.boundary.length],
      projectedDelta
    )
    return { projectedDelta, newBoundary }
  }

  validatePosition(
    movementState: WallSegmentMovementState,
    _context: MovementContext<WallSegmentEntityContext>
  ): boolean {
    return !wouldClosingPolygonSelfIntersect(movementState.newBoundary)
  }

  commitMovement(movementState: WallSegmentMovementState, context: MovementContext<WallSegmentEntityContext>): boolean {
    return context.store.updatePerimeterBoundary(context.entity.wall.id, movementState.newBoundary)
  }
}
