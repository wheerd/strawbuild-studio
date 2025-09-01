import type { WallId, PointId } from '@/types/ids'
import type { Vec2 } from '@/types/geometry'

export interface RoomBoundaryDefinition {
  wallIds: WallId[]
  pointIds: PointId[]
}

// Definition of a room (before it becomes a Room entity)
export interface RoomDefinition {
  name: string
  outerBoundary: RoomBoundaryDefinition // clockwise order of points
  holes: RoomBoundaryDefinition[] // counter-clockwise order of points
  interiorWallIds: WallId[] // Walls inside the room that don't form boundaries
}

export interface WallLoopTrace {
  pointIds: PointId[]
  wallIds: WallId[]
}

// Room side relative to wall direction
export type RoomSide = 'left' | 'right'

export interface RoomDetectionEdge {
  endPointId: PointId
  wallId: WallId
}

export interface RoomDetectionGraph {
  points: Map<PointId, Vec2>
  // Edges are undirected, so if this map contains p1 -> p2, it also contains p2 -> p1
  edges: Map<PointId, RoomDetectionEdge[]>
  walls: Map<WallId, { startPointId: PointId; endPointId: PointId }>
}
