import type { PerimeterWallWithGeometry, PerimeterWithGeometry } from '@/building/model'
import type { SelectableId } from '@/building/model/ids'
import { isPerimeterId, isPerimeterWallId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/MovementBehavior'
import { PerimeterWallMovementPreview } from '@/editor/tools/basic/movement/previews/PerimeterWallMovementPreview'
import { type Vec2, addVec2, dotVec2, scaleVec2 } from '@/shared/geometry'
import { wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'

// Wall wall movement needs access to the wall to update the boundary
export interface PerimeterWallEntityContext {
  perimeter: PerimeterWithGeometry
  wall: PerimeterWallWithGeometry
  wallIndex: number // Index of the wall in the wall
}

// Wall wall movement state - projected delta along perpendicular
export interface PerimeterWallMovementState extends MovementState {
  movementDelta: Vec2 // The projected delta (perpendicular to wall)
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

    if (!perimeter || !wall) {
      throw new Error(`Could not find wall or wall ${entityId}`)
    }

    // Find which wall index this is
    const wallIndex = perimeter.wallIds.indexOf(wall.id)
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
    const projectedDistance = dotVec2(pointerState.delta, wall.outsideDirection)
    const projectedDelta = scaleVec2(wall.outsideDirection, projectedDistance)

    const referencePolygon =
      perimeter.referenceSide === 'inside' ? perimeter.innerPolygon.points : perimeter.outerPolygon.points
    const newBoundary = [...referencePolygon]
    newBoundary[wallIndex] = addVec2(referencePolygon[wallIndex], projectedDelta)
    newBoundary[(wallIndex + 1) % referencePolygon.length] = addVec2(
      referencePolygon[(wallIndex + 1) % referencePolygon.length],
      projectedDelta
    )
    return { movementDelta: projectedDelta, newBoundary }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<PerimeterWallEntityContext>
  ): PerimeterWallMovementState {
    const { perimeter, wall, wallIndex } = context.entity
    const projectedDistance = dotVec2(pointerState.delta, wall.outsideDirection)
    const projectedDelta = scaleVec2(wall.outsideDirection, projectedDistance)

    const referencePolygon =
      perimeter.referenceSide === 'inside' ? perimeter.innerPolygon.points : perimeter.outerPolygon.points
    const newBoundary = [...referencePolygon]
    newBoundary[wallIndex] = addVec2(referencePolygon[wallIndex], projectedDelta)
    newBoundary[(wallIndex + 1) % referencePolygon.length] = addVec2(
      referencePolygon[(wallIndex + 1) % referencePolygon.length],
      projectedDelta
    )
    return { movementDelta: projectedDelta, newBoundary }
  }

  validatePosition(
    movementState: PerimeterWallMovementState,
    _context: MovementContext<PerimeterWallEntityContext>
  ): boolean {
    return !wouldClosingPolygonSelfIntersect({ points: movementState.newBoundary })
  }

  commitMovement(
    movementState: PerimeterWallMovementState,
    context: MovementContext<PerimeterWallEntityContext>
  ): boolean {
    return context.store.updatePerimeterBoundary(context.entity.perimeter.id, movementState.newBoundary)
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<PerimeterWallEntityContext>): boolean {
    const { perimeter, wall, wallIndex } = context.entity

    // Project delta difference onto wall's perpendicular direction
    const projectedDistance = dotVec2(deltaDifference, wall.outsideDirection)
    const projectedDelta = scaleVec2(wall.outsideDirection, projectedDistance)

    // Create new boundary by moving both wall endpoints by the projected delta
    const referencePolygon =
      perimeter.referenceSide === 'inside' ? perimeter.innerPolygon.points : perimeter.outerPolygon.points
    const newBoundary = [...referencePolygon]
    newBoundary[wallIndex] = addVec2(referencePolygon[wallIndex], projectedDelta)
    newBoundary[(wallIndex + 1) % referencePolygon.length] = addVec2(
      referencePolygon[(wallIndex + 1) % referencePolygon.length],
      projectedDelta
    )

    // Validate the new boundary
    if (wouldClosingPolygonSelfIntersect({ points: newBoundary })) {
      return false
    }

    // Commit the movement
    return context.store.updatePerimeterBoundary(perimeter.id, newBoundary)
  }
}
