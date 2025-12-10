import { vec2 } from 'gl-matrix'

import type { SelectableId } from '@/building/model/ids'
import { isOpeningId, isPerimeterId, isPerimeterWallId } from '@/building/model/ids'
import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import type { StoreActions } from '@/building/store/types'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/MovementBehavior'
import { OpeningMovementPreview } from '@/editor/tools/basic/movement/previews/OpeningMovementPreview'
import type { Length } from '@/shared/geometry'

// Opening movement needs access to the wall, wall, and opening
export interface OpeningEntityContext {
  perimeter: Perimeter
  wall: PerimeterWall
  opening: Opening
}

// Opening movement state tracks offset changes along the wall
export interface OpeningMovementState extends MovementState {
  newOffset: Length
  movementDelta: vec2 // [offsetChange, 0] format for simplicity
}

export class OpeningMovementBehavior implements MovementBehavior<OpeningEntityContext, OpeningMovementState> {
  previewComponent = OpeningMovementPreview
  getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): OpeningEntityContext {
    const [perimeterId, wallId] = parentIds

    if (!isPerimeterId(perimeterId) || !isPerimeterWallId(wallId) || !isOpeningId(entityId)) {
      throw new Error(`Invalid entity context for opening ${entityId}`)
    }

    const perimeter = store.getPerimeterById(perimeterId)
    const wall = store.getPerimeterWallById(perimeterId, wallId)
    const opening = store.getPerimeterWallOpeningById(perimeterId, wallId, entityId)

    if (!perimeter || !wall || !opening) {
      throw new Error(`Could not find required entities for opening ${entityId}`)
    }

    return { perimeter, wall, opening }
  }

  initializeState(
    _pointerState: PointerMovementState,
    context: MovementContext<OpeningEntityContext>
  ): OpeningMovementState {
    const { opening } = context.entity

    return {
      newOffset: opening.centerOffsetFromWallStart,
      movementDelta: vec2.fromValues(0, 0) // Store as [1D_change, 0]
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<OpeningEntityContext>
  ): OpeningMovementState {
    const { perimeter, opening, wall } = context.entity

    // Constrain to wall direction only - project the pointer delta onto wall direction
    const wallDirection = wall.direction
    const projectedDistance = vec2.dot(pointerState.delta, wallDirection)

    // Calculate new offset along wall (can be negative)
    const wallStart = wall.insideLine.start
    const currentPosition = vec2.add(
      vec2.create(),
      wallStart,
      vec2.scale(vec2.create(), wall.direction, opening.centerOffsetFromWallStart)
    )
    const newPosition = vec2.add(
      vec2.create(),
      currentPosition,
      vec2.scale(vec2.create(), wallDirection, projectedDistance)
    )

    // Use proper signed distance calculation to handle negative offsets
    const deltaFromStart = vec2.subtract(vec2.create(), newPosition, wallStart)
    const signedOffset = vec2.dot(deltaFromStart, wallDirection)

    // Try to snap to nearest valid position
    const snappedOffset = context.store.findNearestValidPerimeterWallOpeningPosition(
      perimeter.id,
      wall.id,
      signedOffset,
      opening.width,
      opening.id
    )

    // Use snapped position if available and within reasonable distance
    const maxSnapDistance = opening.width * 0.4
    const finalOffset =
      snappedOffset !== null && Math.abs(snappedOffset - signedOffset) <= maxSnapDistance
        ? snappedOffset
        : Math.max(0, signedOffset) // Clamp to non-negative only if no snap

    return {
      newOffset: finalOffset,
      movementDelta: [finalOffset - opening.centerOffsetFromWallStart, 0]
    }
  }

  validatePosition(movementState: OpeningMovementState, context: MovementContext<OpeningEntityContext>): boolean {
    const { perimeter, wall, opening } = context.entity
    return context.store.isPerimeterWallOpeningPlacementValid(
      perimeter.id,
      wall.id,
      movementState.newOffset,
      opening.width,
      opening.id
    )
  }

  commitMovement(movementState: OpeningMovementState, context: MovementContext<OpeningEntityContext>): boolean {
    const { perimeter, wall, opening } = context.entity

    // Update opening position
    context.store.updatePerimeterWallOpening(perimeter.id, wall.id, opening.id, {
      centerOffsetFromWallStart: movementState.newOffset
    })

    return true
  }

  applyRelativeMovement(deltaDifference: vec2, context: MovementContext<OpeningEntityContext>): boolean {
    const { perimeter, wall, opening } = context.entity

    // Use deltaDifference[0] as the offset change (1D movement along wall)
    const newOffset = opening.centerOffsetFromWallStart + deltaDifference[0]

    // Validate the new position
    if (
      !context.store.isPerimeterWallOpeningPlacementValid(perimeter.id, wall.id, newOffset, opening.width, opening.id)
    ) {
      return false
    }

    // Apply the movement
    context.store.updatePerimeterWallOpening(perimeter.id, wall.id, opening.id, {
      centerOffsetFromWallStart: newOffset
    })

    return true
  }
}
