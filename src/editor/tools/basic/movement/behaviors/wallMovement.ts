import {
  nodeRefSidePointId,
  wallNodeRefPointId,
  wallNonRefLineId,
  wallRefLineId
} from '@/building/gcs/constraintTranslator'
import type { WrappedGcs } from '@/building/gcs/service'
import type { IntermediateWallWithGeometry, Perimeter, WallNodeWithGeometry } from '@/building/model'
import type { NodeId, PerimeterId, WallId, WallNodeId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import type { Vec2 } from '@/shared/geometry'

export function getFixedWallPointIds(perimeters: Perimeter[], excludedNodes: ReadonlySet<NodeId>): string[] {
  return perimeters.flatMap(perimeter => [
    ...perimeter.cornerIds.filter(c => !excludedNodes.has(c)).map(c => nodeRefSidePointId(c)),
    ...perimeter.wallNodeIds.filter(n => !excludedNodes.has(n)).map(n => wallNodeRefPointId(n))
  ])
}

export function getSolvedIntermediateWallLines(
  gcs: WrappedGcs,
  wallIds: WallId[]
): { wallId: WallId; line: ReturnType<WrappedGcs['getLineSegment']> }[] {
  return wallIds.flatMap(w => [
    { wallId: w, line: gcs.getLineSegment(wallRefLineId(w)) },
    { wallId: w, line: gcs.getLineSegment(wallNonRefLineId(w)) }
  ])
}

export function getAffectedIntermediateWalls(
  store: StoreActions,
  perimeterId: PerimeterId,
  nodeIds: ReadonlySet<WallNodeId>
): IntermediateWallWithGeometry[] {
  return store
    .getIntermediateWallsByPerimeter(perimeterId)
    .filter(wall => nodeIds.has(wall.start.nodeId) || nodeIds.has(wall.end.nodeId))
}

export function getWallNodePositions(gcs: WrappedGcs, nodes: WallNodeWithGeometry[]): Record<WallNodeId, Vec2> {
  return Object.fromEntries(nodes.map(node => [node.id, gcs.getPointPosition(wallNodeRefPointId(node.id))])) as Record<
    WallNodeId,
    Vec2
  >
}
