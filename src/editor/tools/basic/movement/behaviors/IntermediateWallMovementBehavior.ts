import { wallRefLineId } from '@/building/gcs/constraintTranslator'
import { type WrappedGcs, gcsService } from '@/building/gcs/service'
import type { IntermediateWallWithGeometry } from '@/building/model'
import type { SelectableId, WallId, WallNodeId } from '@/building/model/ids'
import { isIntermediateWallId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import { IntermediateWallMovementPreview } from '@/editor/tools/basic/movement/previews/IntermediateWallMovementPreview'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/types'
import { type LineSegment2D, type Vec2, addVec2, midpoint, subVec2 } from '@/shared/geometry'

import { getAffectedIntermediateWalls, getFixedWallPointIds, getWallNodePositions } from './wallMovement'

export interface IntermediateWallEntityContext {
  wall: IntermediateWallWithGeometry
  directNodeIds: Set<WallNodeId>
  gcs: WrappedGcs
  startPoint: Vec2
  affectedWallIds: WallId[]
}

export interface IntermediateWallMovementState extends MovementState {
  movementDelta: Vec2
  nodePositions: Record<WallNodeId, Vec2>
  entityReferenceLine: LineSegment2D
}

export class IntermediateWallMovementBehavior implements MovementBehavior<
  IntermediateWallEntityContext,
  IntermediateWallMovementState
> {
  previewComponent = IntermediateWallMovementPreview

  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): IntermediateWallEntityContext {
    if (!isIntermediateWallId(entityId)) throw new Error(`Invalid intermediate wall ${entityId}`)
    const wall = store.getIntermediateWallById(entityId)
    const directNodeIds = new Set<WallNodeId>([wall.start.nodeId, wall.end.nodeId])
    const perimeters = store.getPerimetersByStorey(store.getActiveStoreyId())
    const gcs = gcsService.getGcs(undefined, getFixedWallPointIds(perimeters, directNodeIds))
    const startPoint = gcs.startLineDrag(wallRefLineId(wall.id))
    const affectedWalls = getAffectedIntermediateWalls(store, wall.perimeterId, directNodeIds)
    return {
      wall,
      directNodeIds,
      gcs,
      startPoint,
      affectedWallIds: affectedWalls.map(affectedWall => affectedWall.id)
    }
  }

  initializeState(
    pointerState: PointerMovementState,
    context: MovementContext<IntermediateWallEntityContext>
  ): IntermediateWallMovementState {
    const { wall, gcs } = context.entity
    return {
      movementDelta: pointerState.delta,
      nodePositions: getWallNodePositions(gcs, [
        context.store.getWallNodeById(wall.start.nodeId),
        context.store.getWallNodeById(wall.end.nodeId)
      ]),
      entityReferenceLine: wall.entityReferenceLine
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<IntermediateWallEntityContext>
  ): IntermediateWallMovementState {
    const { wall, gcs, startPoint } = context.entity
    const targetPosition = addVec2(startPoint, pointerState.delta)
    gcs.updateDrag(targetPosition[0], targetPosition[1])
    const nodePositions = getWallNodePositions(gcs, [
      context.store.getWallNodeById(wall.start.nodeId),
      context.store.getWallNodeById(wall.end.nodeId)
    ])
    return {
      movementDelta: subVec2(
        midpoint(nodePositions[wall.start.nodeId], nodePositions[wall.end.nodeId]),
        midpoint(wall.entityReferenceLine.start, wall.entityReferenceLine.end)
      ),
      nodePositions,
      entityReferenceLine: {
        start: nodePositions[wall.start.nodeId],
        end: nodePositions[wall.end.nodeId]
      }
    }
  }

  validatePosition(
    _movementState: IntermediateWallMovementState,
    _context: MovementContext<IntermediateWallEntityContext>
  ): boolean {
    // GcsService validates the solved geometry before exposing it as a valid solution.
    return true
  }

  commitMovement(
    movementState: IntermediateWallMovementState,
    context: MovementContext<IntermediateWallEntityContext>
  ): boolean {
    const { wall, gcs } = context.entity
    context.store.applyGcsWallNodePositions(wall.perimeterId, movementState.nodePositions)
    gcs.applyWallEntityOffsets(wall.perimeterId)
    gcs.endDrag()
    gcs.syncConstraintStatus()
    return true
  }

  cancelMovement(context: MovementContext<IntermediateWallEntityContext>): void {
    context.entity.gcs.endDrag()
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<IntermediateWallEntityContext>): boolean {
    const { wall, gcs, startPoint } = context.entity
    const targetPosition = addVec2(startPoint, deltaDifference)
    gcs.updateDrag(targetPosition[0], targetPosition[1])
    context.store.applyGcsWallNodePositions(
      wall.perimeterId,
      getWallNodePositions(gcs, [
        context.store.getWallNodeById(wall.start.nodeId),
        context.store.getWallNodeById(wall.end.nodeId)
      ])
    )
    gcs.applyWallEntityOffsets(wall.perimeterId)
    gcs.endDrag()
    gcs.syncConstraintStatus()
    return true
  }
}
