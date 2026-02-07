import type { PerimeterCornerWithGeometry, PerimeterReferenceSide } from '@/building/model'
import { type SelectableId, isPerimeterCornerId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import { type WrappedGcs, gcsService } from '@/editor/gcs/service'
import type { SnapResult, SnappingContext } from '@/editor/services/snapping/types'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/MovementBehavior'
import { PerimeterCornerMovementPreview } from '@/editor/tools/basic/movement/previews/PerimeterCornerMovementPreview'
import { type LineSegment2D, type Vec2, addVec2, subVec2 } from '@/shared/geometry'

// Corner movement needs access to the wall to update the boundary
export interface CornerEntityContext {
  corner: PerimeterCornerWithGeometry
  corners: PerimeterCornerWithGeometry[]
  cornerIndex: number // Index of the boundary point that corresponds to this corner
  referenceSide: PerimeterReferenceSide
  snapContext: SnappingContext
  gcs: WrappedGcs
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

    const gcs = gcsService.getGcs()

    return {
      corners,
      corner,
      cornerIndex,
      referenceSide: perimeter.referenceSide,
      snapContext,
      gcs
    }
  }

  initializeState(
    pointerState: PointerMovementState,
    context: MovementContext<CornerEntityContext>
  ): CornerMovementState {
    const { corner, referenceSide, gcs } = context.entity

    gcs.startCornerDrag(corner.id, referenceSide)

    return {
      position: corner.referencePoint,
      movementDelta: pointerState.delta,
      newBoundary: gcs.getPerimeterBoundary(corner.perimeterId, referenceSide)
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<CornerEntityContext>
  ): CornerMovementState {
    const { corner, referenceSide, snapContext, gcs } = context.entity

    const newPosition = addVec2(corner.referencePoint, pointerState.delta)

    const snapResult = context.snappingService.findSnapResult(newPosition, snapContext)
    const finalPosition = snapResult?.position ?? newPosition

    // Feed the target position to the GCS solver
    gcs.updateDrag(finalPosition[0], finalPosition[1])

    // Read solved positions to build the boundary
    const newBoundary = gcs.getPerimeterBoundary(corner.perimeterId, referenceSide)

    // The actual solved position of the dragged corner
    const solvedPosition = gcs.getCornerPosition(corner.id, referenceSide)

    return {
      position: solvedPosition,
      movementDelta: subVec2(solvedPosition, corner.referencePoint),
      snapResult: snapResult ?? undefined,
      newBoundary
    }
  }

  validatePosition(_movementState: CornerMovementState, _context: MovementContext<CornerEntityContext>): boolean {
    // The GCS solver's internal validator already checks self-intersection,
    // min wall length, wall consistency, and colinearity.
    // If we got a boundary back from the solver, it's valid.
    return true
  }

  commitMovement(movementState: CornerMovementState, context: MovementContext<CornerEntityContext>): boolean {
    context.entity.gcs.endDrag()
    return context.store.updatePerimeterBoundary(context.entity.corner.perimeterId, movementState.newBoundary)
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<CornerEntityContext>): boolean {
    const { corner, referenceSide, gcs } = context.entity

    // Start a new drag cycle on the same GCS instance
    const dragPos = gcs.startCornerDrag(corner.id, referenceSide)

    const targetX = dragPos[0] + deltaDifference[0]
    const targetY = dragPos[1] + deltaDifference[1]

    gcs.updateDrag(targetX, targetY)

    const newBoundary = gcs.getPerimeterBoundary(corner.perimeterId, referenceSide)

    gcs.endDrag()

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
