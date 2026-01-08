import type { Perimeter, PerimeterCornerWithGeometry } from '@/building/model'
import type { SelectableId } from '@/building/model/ids'
import { isPerimeterCornerId, isPerimeterId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import type { SnapResult, SnappingContext } from '@/editor/services/snapping/types'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/MovementBehavior'
import { PerimeterCornerMovementPreview } from '@/editor/tools/basic/movement/previews/PerimeterCornerMovementPreview'
import { type LineSegment2D, type Vec2, addVec2, copyVec2, wouldClosingPolygonSelfIntersect } from '@/shared/geometry'

// Corner movement needs access to the wall to update the boundary
export interface CornerEntityContext {
  wall: PerimeterWithGeometry
  corner: PerimeterCornerWithGeometry
  cornerIndex: number // Index of the boundary point that corresponds to this corner
  snapContext: SnappingContext
}

// Corner movement state
export interface CornerMovementState extends MovementState {
  position: Vec2
  movementDelta: Vec2 // The 2D movement delta
  snapResult?: SnapResult
  newBoundary: Vec2[]
}

export class PerimeterCornerMovementBehavior implements MovementBehavior<CornerEntityContext, CornerMovementState> {
  previewComponent = PerimeterCornerMovementPreview
  getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): CornerEntityContext {
    const [wallId] = parentIds

    if (!isPerimeterId(wallId) || !isPerimeterCornerId(entityId)) {
      throw new Error(`Invalid entity context for corner ${entityId}`)
    }

    const wall = store.getPerimeterById(wallId)
    const corner = store.getPerimeterCornerById(wallId, entityId)

    if (!wall || !corner) {
      throw new Error(`Could not find wall or corner ${entityId}`)
    }

    // Find which boundary point corresponds to this corner
    const cornerIndex = wall.corners.findIndex(c => c.id === corner.id)
    if (cornerIndex === -1) {
      throw new Error(`Could not find corner index for ${entityId}`)
    }

    const snapLines = this.getSnapLines(wall, cornerIndex)
    const snapContext: SnappingContext = {
      snapPoints: [wall.referencePolygon[cornerIndex]],
      alignPoints: wall.referencePolygon,
      referenceLineSegments: snapLines
    }

    return { wall, corner, cornerIndex, snapContext }
  }

  initializeState(
    pointerState: PointerMovementState,
    context: MovementContext<CornerEntityContext>
  ): CornerMovementState {
    const { wall, cornerIndex } = context.entity
    const boundaryPoint = wall.referencePolygon[cornerIndex]
    const newBoundary = wall.referencePolygon.map(point => copyVec2(point))

    return {
      position: boundaryPoint,
      movementDelta: pointerState.delta,
      newBoundary
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<CornerEntityContext>
  ): CornerMovementState {
    const { wall, cornerIndex, snapContext } = context.entity

    const originalPosition = wall.referencePolygon[cornerIndex]
    const newPosition = addVec2(originalPosition, pointerState.delta)

    const snapResult = context.snappingService.findSnapResult(newPosition, snapContext)
    const finalPosition = snapResult?.position || newPosition

    const newBoundary = wall.referencePolygon.map(point => copyVec2(point))
    newBoundary[cornerIndex] = finalPosition

    return {
      position: finalPosition,
      movementDelta: pointerState.delta,
      snapResult: snapResult ?? undefined,
      newBoundary
    }
  }

  validatePosition(movementState: CornerMovementState, _context: MovementContext<CornerEntityContext>): boolean {
    const { newBoundary } = movementState

    if (newBoundary.length < 3) return false

    return !wouldClosingPolygonSelfIntersect({ points: newBoundary })
  }

  commitMovement(movementState: CornerMovementState, context: MovementContext<CornerEntityContext>): boolean {
    return context.store.updatePerimeterBoundary(context.entity.wall.id, movementState.newBoundary)
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<CornerEntityContext>): boolean {
    const { wall, cornerIndex } = context.entity

    const currentPosition = wall.referencePolygon[cornerIndex]
    const newPosition = addVec2(currentPosition, deltaDifference)

    // Create new boundary with updated corner position
    const newBoundary = wall.referencePolygon.map(point => copyVec2(point))
    newBoundary[cornerIndex] = newPosition

    // Validate the new boundary
    if (wouldClosingPolygonSelfIntersect({ points: newBoundary })) {
      return false
    }

    // Commit the movement
    return context.store.updatePerimeterBoundary(wall.id, newBoundary)
  }

  private getSnapLines(wall: PerimeterWithGeometry, cornerIndex: number): LineSegment2D[] {
    const snapLines: LineSegment2D[] = []

    for (let i = 0; i < wall.referencePolygon.length; i++) {
      const nextIndex = (i + 1) % wall.referencePolygon.length
      if (i === cornerIndex || nextIndex === cornerIndex) continue
      const start = wall.referencePolygon[i]
      const end = wall.referencePolygon[nextIndex]
      snapLines.push({ start, end })
    }

    return snapLines
  }
}
