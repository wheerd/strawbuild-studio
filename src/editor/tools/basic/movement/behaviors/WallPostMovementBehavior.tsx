import type { Perimeter, PerimeterWall, WallPost } from '@/building/model'
import type { SelectableId } from '@/building/model/ids'
import { isPerimeterId, isPerimeterWallId, isWallPostId } from '@/building/model/ids'
import { getWallPostPlacementBounds } from '@/building/store/slices/perimeterSlice'
import type { StoreActions } from '@/building/store/types'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/MovementBehavior'
import { WallPostMovementPreview } from '@/editor/tools/basic/movement/previews/WallPostMovementPreview'
import { type Length, type Vec2, ZERO_VEC2, dotVec2, newVec2, projectVec2, scaleAddVec2 } from '@/shared/geometry'

// Wall post movement needs access to the wall, wall, and post
export interface WallPostEntityContext {
  perimeter: Perimeter
  wall: PerimeterWall
  post: WallPost
}

// Wall post movement state tracks offset changes along the wall
export interface WallPostMovementState extends MovementState {
  newOffset: Length
  movementDelta: Vec2 // [offsetChange, 0] format for simplicity
}

export class WallPostMovementBehavior implements MovementBehavior<WallPostEntityContext, WallPostMovementState> {
  previewComponent = WallPostMovementPreview

  getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): WallPostEntityContext {
    const [perimeterId, wallId] = parentIds

    if (!isPerimeterId(perimeterId) || !isPerimeterWallId(wallId) || !isWallPostId(entityId)) {
      throw new Error(`Invalid entity context for wall post ${entityId}`)
    }

    const perimeter = store.getPerimeterById(perimeterId)
    const wall = store.getPerimeterWallById(perimeterId, wallId)
    const post = store.getPerimeterWallPostById(perimeterId, wallId, entityId)

    if (!perimeter || !wall || !post) {
      throw new Error(`Could not find required entities for wall post ${entityId}`)
    }

    return { perimeter, wall, post }
  }

  initializeState(
    _pointerState: PointerMovementState,
    context: MovementContext<WallPostEntityContext>
  ): WallPostMovementState {
    const { post } = context.entity

    return {
      newOffset: post.centerOffsetFromWallStart,
      movementDelta: ZERO_VEC2 // Store as [1D_change, 0]
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<WallPostEntityContext>
  ): WallPostMovementState {
    const { perimeter, post, wall } = context.entity

    // Constrain to wall direction only - project the pointer delta onto wall direction
    const wallDirection = wall.direction
    const projectedDistance = dotVec2(pointerState.delta, wallDirection)

    // Calculate new offset along wall (can be negative)
    const wallStart = wall.insideLine.start
    const currentPosition = scaleAddVec2(wallStart, wall.direction, post.centerOffsetFromWallStart)
    const newPosition = scaleAddVec2(currentPosition, wallDirection, projectedDistance)

    // Use proper signed distance calculation to handle negative offsets
    const signedOffset = projectVec2(wallStart, newPosition, wallDirection)

    // Try to snap to nearest valid position
    const snappedOffset = context.store.findNearestValidPerimeterWallPostPosition(
      perimeter.id,
      wall.id,
      signedOffset,
      post.width,
      post.id
    )

    const bounds = getWallPostPlacementBounds(wall, perimeter, post.width)

    // Use snapped position if available and within reasonable distance
    const maxSnapDistance = post.width * 3
    const finalOffset =
      snappedOffset !== null && Math.abs(snappedOffset - signedOffset) <= maxSnapDistance
        ? snappedOffset
        : Math.max(bounds.minOffset, Math.min(signedOffset, bounds.maxOffset)) // Clamp only if no snap

    return {
      newOffset: finalOffset,
      movementDelta: newVec2(finalOffset - post.centerOffsetFromWallStart, 0)
    }
  }

  validatePosition(movementState: WallPostMovementState, context: MovementContext<WallPostEntityContext>): boolean {
    const { perimeter, wall, post } = context.entity
    return context.store.isPerimeterWallPostPlacementValid(
      perimeter.id,
      wall.id,
      movementState.newOffset,
      post.width,
      post.id
    )
  }

  commitMovement(movementState: WallPostMovementState, context: MovementContext<WallPostEntityContext>): boolean {
    const { perimeter, wall, post } = context.entity

    // Update post position
    context.store.updatePerimeterWallPost(perimeter.id, wall.id, post.id, {
      centerOffsetFromWallStart: movementState.newOffset
    })

    return true
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<WallPostEntityContext>): boolean {
    const { perimeter, wall, post } = context.entity

    // Use deltaDifference[0] as the offset change (1D movement along wall)
    const newOffset = post.centerOffsetFromWallStart + deltaDifference[0]

    // Validate the new position
    if (!context.store.isPerimeterWallPostPlacementValid(perimeter.id, wall.id, newOffset, post.width, post.id)) {
      return false
    }

    // Apply the movement
    context.store.updatePerimeterWallPost(perimeter.id, wall.id, post.id, {
      centerOffsetFromWallStart: newOffset
    })

    return true
  }
}
