import type { SelectableId } from '@/building/model/ids'
import { isPerimeterId } from '@/building/model/ids'
import type { Perimeter } from '@/building/model/model'
import type { StoreActions } from '@/building/store/types'
import type { SnapResult, SnappingContext } from '@/editor/services/snapping'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/MovementBehavior'
import { PerimeterMovementPreview } from '@/editor/tools/basic/movement/previews/PerimeterMovementPreview'
import type { Vec2 } from '@/shared/geometry'
import { add, distanceSquared, subtract } from '@/shared/geometry'
import { arePolygonsIntersecting } from '@/shared/geometry/polygon'

export interface PerimeterEntityContext {
  perimeter: Perimeter
  snapContext: SnappingContext
}

export interface PerimeterMovementState extends MovementState {
  movementDelta: Vec2 // The 2D movement delta
  snapResult?: SnapResult
}

export class PerimeterMovementBehavior implements MovementBehavior<PerimeterEntityContext, PerimeterMovementState> {
  previewComponent = PerimeterMovementPreview

  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): PerimeterEntityContext {
    if (!isPerimeterId(entityId)) {
      throw new Error(`Invalid entity context for wall ${entityId}`)
    }

    const perimeter = store.getPerimeterById(entityId)
    if (!perimeter) {
      throw new Error(`Could not find wall ${entityId}`)
    }

    const activeStorey = store.getActiveStoreyId()
    const storeys = store.getStoreysOrderedByLevel()
    const storeyIndex = storeys.findIndex(s => s.id === activeStorey)
    const lowerStorey = storeyIndex > 0 ? storeys[storeyIndex - 1] : null
    const lowerPerimeters = lowerStorey ? store.getPerimetersByStorey(lowerStorey.id) : []
    const lowerPerimeterPoints = lowerPerimeters.flatMap(p => p.corners.map(c => c.insidePoint))

    const otherPerimeters = store.getPerimetersByStorey(activeStorey).filter(p => p.id !== entityId)
    const otherPerimeterPoints = otherPerimeters.flatMap(p => p.corners.map(c => c.insidePoint))

    const snapContext: SnappingContext = {
      snapPoints: lowerPerimeterPoints,
      alignPoints: otherPerimeterPoints
    }

    return { perimeter, snapContext }
  }

  initializeState(
    pointerState: PointerMovementState,
    _context: MovementContext<PerimeterEntityContext>
  ): PerimeterMovementState {
    return {
      movementDelta: pointerState.delta
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<PerimeterEntityContext>
  ): PerimeterMovementState {
    const { perimeter, snapContext } = context.entity

    const newBoundary = perimeter.corners.map(c => add(c.insidePoint, pointerState.delta))
    let bestSnapResult: SnapResult | undefined
    let bestDist = Infinity
    let finalDelta = pointerState.delta
    for (let i = 0; i < newBoundary.length; i++) {
      const snapResult = context.snappingService.findSnapResult(newBoundary[i], snapContext) ?? undefined
      if (snapResult) {
        const snapDist = distanceSquared(snapResult.position, newBoundary[i]) * (snapResult.lines ? 5 : 1)
        if (snapDist < bestDist) {
          bestSnapResult = snapResult
          bestDist = snapDist
          finalDelta = subtract(snapResult.position, perimeter.corners[i].insidePoint)
        }
      }
    }

    return {
      movementDelta: finalDelta,
      snapResult: bestSnapResult
    }
  }

  validatePosition(movementState: PerimeterMovementState, context: MovementContext<PerimeterEntityContext>): boolean {
    // Check if the moved polygon would intersect with other wall polygons
    const previewBoundary = context.entity.perimeter.corners.map(corner =>
      add(corner.insidePoint, movementState.movementDelta)
    )

    // Get other walls on the same floor
    const currentWall = context.entity.perimeter
    const allWalls = context.store.getPerimetersByStorey(currentWall.storeyId)
    const otherWalls = allWalls.filter(wall => wall.id !== currentWall.id)

    // Check for intersections with other wall polygons
    for (const otherWall of otherWalls) {
      if (arePolygonsIntersecting({ points: previewBoundary }, { points: otherWall.corners.map(c => c.insidePoint) })) {
        return false
      }
    }

    return true
  }

  commitMovement(movementState: PerimeterMovementState, context: MovementContext<PerimeterEntityContext>): boolean {
    const wallId = context.entity.perimeter.id
    return context.store.movePerimeter(wallId, movementState.movementDelta)
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<PerimeterEntityContext>): boolean {
    // Validate the movement by checking intersections
    const previewBoundary = context.entity.perimeter.corners.map(corner => add(corner.insidePoint, deltaDifference))

    // Get other walls on the same floor
    const currentWall = context.entity.perimeter
    const allWalls = context.store.getPerimetersByStorey(currentWall.storeyId)
    const otherWalls = allWalls.filter(wall => wall.id !== currentWall.id)

    // Check for intersections with other wall polygons
    for (const otherWall of otherWalls) {
      if (arePolygonsIntersecting({ points: previewBoundary }, { points: otherWall.corners.map(c => c.insidePoint) })) {
        return false
      }
    }

    // Apply the relative movement
    return context.store.movePerimeter(context.entity.perimeter.id, deltaDifference)
  }
}
