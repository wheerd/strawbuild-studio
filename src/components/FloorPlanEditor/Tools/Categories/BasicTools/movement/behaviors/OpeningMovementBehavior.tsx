import type { MovementBehavior, MovementContext, MouseMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { Opening, OuterWallSegment, Perimeter } from '@/types/model'
import type { Length } from '@/types/geometry'
import { add, dot, scale, createLength, subtract } from '@/types/geometry'
import { isPerimeterId, isWallSegmentId, isOpeningId } from '@/types/ids'
import { OpeningMovementPreview } from '../previews/OpeningMovementPreview'

// Opening movement needs access to the wall, segment, and opening
export interface OpeningEntityContext {
  wall: Perimeter
  segment: OuterWallSegment
  opening: Opening
}

// Opening movement state tracks offset changes along the segment
export interface OpeningMovementState {
  newOffset: Length
}

export class OpeningMovementBehavior implements MovementBehavior<OpeningEntityContext, OpeningMovementState> {
  previewComponent = OpeningMovementPreview
  getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): OpeningEntityContext {
    const [wallId, segmentId] = parentIds

    if (!isPerimeterId(wallId) || !isWallSegmentId(segmentId) || !isOpeningId(entityId)) {
      throw new Error(`Invalid entity context for opening ${entityId}`)
    }

    const wall = store.getPerimeterById(wallId)
    const segment = store.getSegmentById(wallId, segmentId)
    const opening = store.getOpeningById(wallId, segmentId, entityId)

    if (!wall || !segment || !opening) {
      throw new Error(`Could not find required entities for opening ${entityId}`)
    }

    return { wall, segment, opening }
  }

  initializeState(
    _mouseState: MouseMovementState,
    context: MovementContext<OpeningEntityContext>
  ): OpeningMovementState {
    const { opening } = context.entity
    return {
      newOffset: opening.offsetFromStart
    }
  }

  constrainAndSnap(
    mouseState: MouseMovementState,
    context: MovementContext<OpeningEntityContext>
  ): OpeningMovementState {
    const { segment, opening, wall } = context.entity

    // Constrain to segment direction only - project the mouse delta onto segment direction
    const segmentDirection = segment.direction
    const projectedDistance = dot(mouseState.delta, segmentDirection)

    // Calculate new offset along segment (can be negative)
    const segmentStart = segment.insideLine.start
    const currentPosition = add(segmentStart, scale(segment.direction, opening.offsetFromStart))
    const newPosition = add(currentPosition, scale(segmentDirection, projectedDistance))

    // Use proper signed distance calculation to handle negative offsets
    const deltaFromStart = subtract(newPosition, segmentStart)
    const signedOffset = dot(deltaFromStart, segmentDirection)

    // Try to snap to nearest valid position
    const snappedOffset = context.store.findNearestValidOpeningPosition(
      wall.id,
      segment.id,
      createLength(signedOffset),
      opening.width,
      opening.id
    )

    // Use snapped position if available and within reasonable distance
    const maxSnapDistance = opening.width * 0.4
    const finalOffset =
      snappedOffset !== null && Math.abs(snappedOffset - signedOffset) <= maxSnapDistance
        ? snappedOffset
        : createLength(Math.max(0, signedOffset)) // Clamp to non-negative only if no snap

    return {
      newOffset: finalOffset
    }
  }

  validatePosition(movementState: OpeningMovementState, context: MovementContext<OpeningEntityContext>): boolean {
    const { wall, segment, opening } = context.entity
    return context.store.isOpeningPlacementValid(
      wall.id,
      segment.id,
      movementState.newOffset,
      opening.width,
      opening.id
    )
  }

  commitMovement(movementState: OpeningMovementState, context: MovementContext<OpeningEntityContext>): boolean {
    const { wall, segment, opening } = context.entity

    // Update opening position
    context.store.updateOpening(wall.id, segment.id, opening.id, {
      offsetFromStart: movementState.newOffset
    })

    return true
  }
}
