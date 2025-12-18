
import type { SelectableId } from '@/building/model'
import type { StoreActions } from '@/building/store'
import type { SnapResult, SnappingContext } from '@/editor/services/snapping/types'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/MovementBehavior'
import { PolygonMovementPreview } from '@/editor/tools/basic/movement/previews/PolygonMovementPreview'
import { type Vec2, addVec2, copyVec2, distSqrVec2, subVec2 } from '@/shared/geometry'

export interface PolygonEntityContext {
  snapContext: SnappingContext
}

export interface PolygonMovementState extends MovementState {
  previewPolygon: readonly Vec2[]
  snapResult?: SnapResult
}

export abstract class PolygonMovementBehavior<TEntity extends PolygonEntityContext> implements MovementBehavior<
  TEntity,
  PolygonMovementState
> {
  previewComponent = PolygonMovementPreview<TEntity>

  abstract getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): TEntity

  initializeState(pointerState: PointerMovementState, context: MovementContext<TEntity>): PolygonMovementState {
    return {
      previewPolygon: this.getPolygonPoints(context),
      movementDelta: copyVec2(pointerState.delta)
    }
  }

  constrainAndSnap(pointerState: PointerMovementState, context: MovementContext<TEntity>): PolygonMovementState {
    const originalPoints = this.getPolygonPoints(context)
    const previewPoints = originalPoints.map(point => addVec2(point, pointerState.delta))
    const snapContext = this.getSnapContext(context)

    let bestSnap: SnapResult | undefined
    let bestScore = Infinity
    let resultDelta = copyVec2(pointerState.delta)

    for (let index = 0; index < previewPoints.length; index += 1) {
      const snapResult = context.snappingService.findSnapResult(previewPoints[index], snapContext) ?? undefined
      if (!snapResult) continue

      const score =
        distSqrVec2(previewPoints[index], snapResult.position) *
        (snapResult.lines && snapResult.lines.length > 0 ? 5 : 1)

      if (score < bestScore) {
        bestScore = score
        bestSnap = snapResult
        resultDelta = subVec2(snapResult.position, originalPoints[index])
      }
    }

    return {
      previewPolygon: this.translatePoints(this.getPolygonPoints(context), resultDelta),
      movementDelta: resultDelta,
      snapResult: bestSnap
    }
  }

  validatePosition(_movementState: PolygonMovementState, _context: MovementContext<TEntity>): boolean {
    return true
  }

  commitMovement(movementState: PolygonMovementState, context: MovementContext<TEntity>): boolean {
    return this.applyMovementDelta(movementState.movementDelta, context)
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<TEntity>): boolean {
    return this.applyMovementDelta(deltaDifference, context)
  }

  protected getSnapContext(context: MovementContext<TEntity>): SnappingContext {
    return context.entity.snapContext
  }

  protected translatePoints(points: readonly Vec2[], delta: Vec2): Vec2[] {
    return points.map(point => addVec2(point, delta))
  }

  protected abstract getPolygonPoints(context: MovementContext<TEntity>): readonly Vec2[]

  protected abstract applyMovementDelta(delta: Vec2, context: MovementContext<TEntity>): boolean
}
