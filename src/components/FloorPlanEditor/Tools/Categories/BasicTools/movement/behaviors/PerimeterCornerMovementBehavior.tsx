import type { MovementBehavior, MovementContext, PointerMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { PerimeterCorner, Perimeter } from '@/types/model'
import type { LineWall2D, Vec2 } from '@/types/geometry'
import type { SnappingContext, SnapResult } from '@/model/store/services/snapping/types'
import { add, wouldClosingPolygonSelfIntersect } from '@/types/geometry'
import { isPerimeterId, isPerimeterCornerId } from '@/types/ids'
import { PerimeterCornerMovementPreview } from '../previews/PerimeterCornerMovementPreview'

// Corner movement needs access to the wall to update the boundary
export interface CornerEntityContext {
  wall: Perimeter
  corner: PerimeterCorner
  cornerIndex: number // Index of the boundary point that corresponds to this corner
  snapContext: SnappingContext
}

// Corner movement state
export interface CornerMovementState {
  position: Vec2
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
      snapPoints: [wall.boundary[cornerIndex]],
      alignPoints: wall.boundary,
      referenceLineWalls: snapLines
    }

    return { wall, corner, cornerIndex, snapContext }
  }

  initializeState(
    _pointerState: PointerMovementState,
    context: MovementContext<CornerEntityContext>
  ): CornerMovementState {
    const { wall, cornerIndex } = context.entity
    const boundaryPoint = wall.boundary[cornerIndex]
    const newBoundary = [...wall.boundary]

    return {
      position: boundaryPoint,
      newBoundary
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<CornerEntityContext>
  ): CornerMovementState {
    const { wall, cornerIndex, snapContext } = context.entity

    const originalPosition = wall.boundary[cornerIndex]
    const newPosition = add(originalPosition, pointerState.delta)

    const snapResult = context.snappingService.findSnapResult(newPosition, snapContext)
    const finalPosition = snapResult?.position || newPosition

    const newBoundary = [...wall.boundary]
    newBoundary[cornerIndex] = finalPosition

    return {
      position: finalPosition,
      snapResult: snapResult ?? undefined,
      newBoundary
    }
  }

  validatePosition(movementState: CornerMovementState, _context: MovementContext<CornerEntityContext>): boolean {
    const { newBoundary } = movementState

    if (newBoundary.length < 3) return false

    return !wouldClosingPolygonSelfIntersect(newBoundary)
  }

  commitMovement(movementState: CornerMovementState, context: MovementContext<CornerEntityContext>): boolean {
    return context.store.updatePerimeterBoundary(context.entity.wall.id, movementState.newBoundary)
  }

  private getSnapLines(wall: Perimeter, cornerIndex: number): Array<LineWall2D> {
    const snapLines: Array<LineWall2D> = []

    for (let i = 0; i < wall.boundary.length; i++) {
      const nextIndex = (i + 1) % wall.boundary.length
      if (i === cornerIndex || nextIndex === cornerIndex) continue
      const start = wall.boundary[i]
      const end = wall.boundary[nextIndex]
      snapLines.push({ start, end })
    }

    return snapLines
  }
}
