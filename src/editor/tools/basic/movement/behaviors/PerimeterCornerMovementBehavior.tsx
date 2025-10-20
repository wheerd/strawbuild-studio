import { vec2 } from 'gl-matrix'

import type { SelectableId } from '@/building/model/ids'
import { isPerimeterCornerId, isPerimeterId } from '@/building/model/ids'
import type { Perimeter, PerimeterCorner } from '@/building/model/model'
import type { StoreActions } from '@/building/store/types'
import type { SnapResult, SnappingContext } from '@/editor/services/snapping/types'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/MovementBehavior'
import { PerimeterCornerMovementPreview } from '@/editor/tools/basic/movement/previews/PerimeterCornerMovementPreview'
import type { LineSegment2D } from '@/shared/geometry'
import { wouldClosingPolygonSelfIntersect } from '@/shared/geometry'

// Corner movement needs access to the wall to update the boundary
export interface CornerEntityContext {
  wall: Perimeter
  corner: PerimeterCorner
  cornerIndex: number // Index of the boundary point that corresponds to this corner
  snapContext: SnappingContext
}

// Corner movement state
export interface CornerMovementState extends MovementState {
  position: vec2
  movementDelta: vec2 // The 2D movement delta
  snapResult?: SnapResult
  newBoundary: vec2[]
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
      snapPoints: [wall.corners[cornerIndex].insidePoint],
      alignPoints: wall.corners.map(c => c.insidePoint),
      referenceLineSegments: snapLines
    }

    return { wall, corner, cornerIndex, snapContext }
  }

  initializeState(
    pointerState: PointerMovementState,
    context: MovementContext<CornerEntityContext>
  ): CornerMovementState {
    const { wall, cornerIndex } = context.entity
    const boundaryPoint = wall.corners[cornerIndex].insidePoint
    const newBoundary = wall.corners.map(c => c.insidePoint)

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

    const originalPosition = wall.corners[cornerIndex].insidePoint
    const newPosition = vec2.add(vec2.create(), originalPosition, pointerState.delta)

    const snapResult = context.snappingService.findSnapResult(newPosition, snapContext)
    const finalPosition = snapResult?.position || newPosition

    const newBoundary = wall.corners.map(c => c.insidePoint)
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

  applyRelativeMovement(deltaDifference: vec2, context: MovementContext<CornerEntityContext>): boolean {
    const { wall, cornerIndex } = context.entity

    const currentPosition = wall.corners[cornerIndex].insidePoint
    const newPosition = vec2.add(vec2.create(), currentPosition, deltaDifference)

    // Create new boundary with updated corner position
    const newBoundary = wall.corners.map(c => c.insidePoint)
    newBoundary[cornerIndex] = newPosition

    // Validate the new boundary
    if (wouldClosingPolygonSelfIntersect({ points: newBoundary })) {
      return false
    }

    // Commit the movement
    return context.store.updatePerimeterBoundary(wall.id, newBoundary)
  }

  private getSnapLines(wall: Perimeter, cornerIndex: number): LineSegment2D[] {
    const snapLines: LineSegment2D[] = []

    for (let i = 0; i < wall.corners.length; i++) {
      const nextIndex = (i + 1) % wall.corners.length
      if (i === cornerIndex || nextIndex === cornerIndex) continue
      const start = wall.corners[i].insidePoint
      const end = wall.corners[nextIndex].insidePoint
      snapLines.push({ start, end })
    }

    return snapLines
  }
}
