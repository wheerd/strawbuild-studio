import type { PerimeterCornerWithGeometry } from '@/building/model'
import type { SelectableId } from '@/building/model/ids'
import { isPerimeterCornerId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import type { SnapResult, SnappingContext } from '@/editor/services/snapping/types'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/MovementBehavior'
import { PerimeterCornerMovementPreview } from '@/editor/tools/basic/movement/previews/PerimeterCornerMovementPreview'
import { type LineSegment2D, type Vec2, addVec2, wouldClosingPolygonSelfIntersect } from '@/shared/geometry'

// Corner movement needs access to the wall to update the boundary
export interface CornerEntityContext {
  corner: PerimeterCornerWithGeometry
  corners: PerimeterCornerWithGeometry[]
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
  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): CornerEntityContext {
    if (!isPerimeterCornerId(entityId)) {
      throw new Error(`Invalid entity context for corner ${entityId}`)
    }

    const corner = store.getPerimeterCornerById(entityId)
    const perimeter = store.getPerimeterById(corner.perimeterId)
    const corners = perimeter.cornerIds.map(store.getPerimeterCornerById)

    // Find which boundary point corresponds to this corner
    const cornerIndex = perimeter.cornerIds.indexOf(corner.id)
    if (cornerIndex === -1) {
      throw new Error(`Could not find corner index for ${entityId}`)
    }

    const snapLines = this.getSnapLines(corners, cornerIndex)
    const snapContext: SnappingContext = {
      snapPoints: [corner.referencePoint],
      alignPoints: corners.map(c => c.referencePoint),
      referenceLineSegments: snapLines
    }

    return { corners, corner, cornerIndex, snapContext }
  }

  initializeState(
    pointerState: PointerMovementState,
    context: MovementContext<CornerEntityContext>
  ): CornerMovementState {
    const { corners, corner } = context.entity
    return {
      position: corner.referencePoint,
      movementDelta: pointerState.delta,
      newBoundary: corners.map(c => c.referencePoint)
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<CornerEntityContext>
  ): CornerMovementState {
    const { corner, corners, cornerIndex, snapContext } = context.entity

    const newPosition = addVec2(corner.referencePoint, pointerState.delta)

    const snapResult = context.snappingService.findSnapResult(newPosition, snapContext)
    const finalPosition = snapResult?.position ?? newPosition

    const newBoundary = corners.map(c => c.referencePoint)
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
    return context.store.updatePerimeterBoundary(context.entity.corner.perimeterId, movementState.newBoundary)
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<CornerEntityContext>): boolean {
    const { corner, corners, cornerIndex } = context.entity

    const newPosition = addVec2(corner.referencePoint, deltaDifference)

    // Create new boundary with updated corner position
    const newBoundary = corners.map(c => c.referencePoint)
    newBoundary[cornerIndex] = newPosition

    // Validate the new boundary
    if (wouldClosingPolygonSelfIntersect({ points: newBoundary })) {
      return false
    }

    // Commit the movement
    return context.store.updatePerimeterBoundary(corner.perimeterId, newBoundary)
  }

  private getSnapLines(corners: PerimeterCornerWithGeometry[], cornerIndex: number): LineSegment2D[] {
    const snapLines: LineSegment2D[] = []

    for (let i = 0; i < corners.length; i++) {
      const nextIndex = (i + 1) % corners.length
      if (i === cornerIndex || nextIndex === cornerIndex) continue
      const start = corners[i].referencePoint
      const end = corners[nextIndex].referencePoint
      snapLines.push({ start, end })
    }

    return snapLines
  }
}
