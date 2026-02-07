import type { PerimeterReferenceSide, PerimeterWallWithGeometry, PerimeterWithGeometry } from '@/building/model'
import { type SelectableId, isPerimeterId, isPerimeterWallId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import { type WrappedGcs, gcsService } from '@/editor/gcs/service'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/MovementBehavior'
import { PerimeterWallMovementPreview } from '@/editor/tools/basic/movement/previews/PerimeterWallMovementPreview'
import { type Vec2, addVec2, midpoint, subVec2 } from '@/shared/geometry'

// Perimeter wall movement needs access to the wall to update the boundary
export interface PerimeterWallEntityContext {
  perimeter: PerimeterWithGeometry
  wall: PerimeterWallWithGeometry
  wallIndex: number // Index of the wall in the perimeter
  referenceSide: PerimeterReferenceSide
  gcs: WrappedGcs
}

// Perimeter wall movement state
export interface PerimeterWallMovementState extends MovementState {
  movementDelta: Vec2
  newBoundary: Vec2[]
}

export class PerimeterWallMovementBehavior implements MovementBehavior<
  PerimeterWallEntityContext,
  PerimeterWallMovementState
> {
  previewComponent = PerimeterWallMovementPreview
  getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): PerimeterWallEntityContext {
    const [perimeterId] = parentIds

    if (!isPerimeterId(perimeterId) || !isPerimeterWallId(entityId)) {
      throw new Error(`Invalid entity context for wall ${entityId}`)
    }

    const perimeter = store.getPerimeterById(perimeterId)
    const wall = store.getPerimeterWallById(entityId)

    // Find which wall index this is
    const wallIndex = perimeter.wallIds.indexOf(wall.id)
    if (wallIndex === -1) {
      throw new Error(`Could not find wall index for ${entityId}`)
    }

    const gcs = gcsService.getGcs()

    // Set up GCS for wall drag (adds temp point constrained to wall line)
    gcs.startWallDrag(wall.id, perimeter.referenceSide)

    return {
      perimeter,
      wall,
      wallIndex,
      referenceSide: perimeter.referenceSide,
      gcs
    }
  }

  initializeState(
    pointerState: PointerMovementState,
    context: MovementContext<PerimeterWallEntityContext>
  ): PerimeterWallMovementState {
    const { perimeter, referenceSide, gcs } = context.entity

    return {
      movementDelta: pointerState.delta,
      newBoundary: gcs.getPerimeterBoundary(perimeter.id, referenceSide)
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<PerimeterWallEntityContext>
  ): PerimeterWallMovementState {
    const { wall, perimeter, referenceSide, gcs } = context.entity

    // Move the temp point by the pointer delta from the wall midpoint
    const originalMidpoint = midpoint(wall.insideLine.start, wall.insideLine.end)
    const targetPosition = addVec2(originalMidpoint, pointerState.delta)

    gcs.updateDrag(targetPosition[0], targetPosition[1])

    const newBoundary = gcs.getPerimeterBoundary(perimeter.id, referenceSide)

    // Compute the effective movement delta from the solved drag point (wall midpoint)
    const solvedDragPos = gcs.getDragPointPosition()
    const movementDelta = subVec2(solvedDragPos, originalMidpoint)

    return { movementDelta, newBoundary }
  }

  validatePosition(
    _movementState: PerimeterWallMovementState,
    _context: MovementContext<PerimeterWallEntityContext>
  ): boolean {
    // The GCS solver's internal validator already checks all geometric validity.
    return true
  }

  commitMovement(
    movementState: PerimeterWallMovementState,
    context: MovementContext<PerimeterWallEntityContext>
  ): boolean {
    context.entity.gcs.endDrag()
    return context.store.updatePerimeterBoundary(context.entity.perimeter.id, movementState.newBoundary)
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<PerimeterWallEntityContext>): boolean {
    const { perimeter, wall, referenceSide, gcs } = context.entity

    // Start a new wall drag cycle on the same GCS instance
    const dragPos = gcs.startWallDrag(wall.id, referenceSide)

    const targetX = dragPos[0] + deltaDifference[0]
    const targetY = dragPos[1] + deltaDifference[1]

    gcs.updateDrag(targetX, targetY)

    const newBoundary = gcs.getPerimeterBoundary(perimeter.id, referenceSide)

    gcs.endDrag()

    return context.store.updatePerimeterBoundary(perimeter.id, newBoundary)
  }
}
