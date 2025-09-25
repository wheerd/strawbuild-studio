import type { SelectableId } from '@/building/model/ids'
import { isOpeningId, isPerimeterId, isPerimeterWallId } from '@/building/model/ids'
import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import type { StoreActions } from '@/building/store/types'
import type {
  MovementBehavior,
  MovementContext,
  PointerMovementState
} from '@/editor/tools/basic/movement/MovementBehavior'
import { OpeningMovementPreview } from '@/editor/tools/basic/movement/previews/OpeningMovementPreview'
import type { Length } from '@/shared/geometry'
import { add, createLength, dot, scale, subtract } from '@/shared/geometry'

// Opening movement needs access to the wall, wall, and opening
export interface OpeningEntityContext {
  perimeter: Perimeter
  wall: PerimeterWall
  opening: Opening
}

// Opening movement state tracks offset changes along the wall
export interface OpeningMovementState {
  newOffset: Length
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
      newOffset: opening.offsetFromStart
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<OpeningEntityContext>
  ): OpeningMovementState {
    const { perimeter, opening, wall } = context.entity

    // Constrain to wall direction only - project the pointer delta onto wall direction
    const wallDirection = wall.direction
    const projectedDistance = dot(pointerState.delta, wallDirection)

    // Calculate new offset along wall (can be negative)
    const wallStart = wall.insideLine.start
    const currentPosition = add(wallStart, scale(wall.direction, opening.offsetFromStart))
    const newPosition = add(currentPosition, scale(wallDirection, projectedDistance))

    // Use proper signed distance calculation to handle negative offsets
    const deltaFromStart = subtract(newPosition, wallStart)
    const signedOffset = dot(deltaFromStart, wallDirection)

    // Try to snap to nearest valid position
    const snappedOffset = context.store.findNearestValidPerimeterWallOpeningPosition(
      perimeter.id,
      wall.id,
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
      offsetFromStart: movementState.newOffset
    })

    return true
  }
}
