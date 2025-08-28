import type { WallId, PointId, RoomId, FloorId } from '@/types/ids'
import type { Point2D } from '@/types/geometry'

// Result of room detection operations
export interface RoomDetectionResult {
  roomsToCreate: RoomDefinition[]
  roomsToUpdate: Array<{ roomId: RoomId, definition: RoomDefinition }>
  roomsToDelete: RoomId[]
  wallAssignments: WallRoomAssignment[]
  pointAssignments: PointRoomAssignment[]
}

// Definition of a room boundary (before it becomes a RoomBoundary entity)
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

// Assignment of rooms to wall sides
export interface WallRoomAssignment {
  wallId: WallId
  leftRoomId?: RoomId
  rightRoomId?: RoomId
}

// Assignment of rooms to points
export interface PointRoomAssignment {
  pointId: PointId
  roomIds: Set<RoomId>
}

// Result of room validation
export interface RoomValidationResult {
  validRooms: RoomId[]
  invalidRooms: RoomId[]
  orphanedWalls: WallId[]
  orphanedPoints: PointId[]
}

// Context for room detection operations
export interface RoomDetectionContext {
  floorId: FloorId
  // Optional filters to limit scope of detection
  affectedWallIds?: Set<WallId>
  affectedPointIds?: Set<PointId>
}

// Configuration for room detection
export interface RoomDetectionConfig {
  // Naming pattern for auto-generated rooms
  roomNamePattern: string
}

// Default configuration
export const DEFAULT_ROOM_DETECTION_CONFIG: RoomDetectionConfig = {
  roomNamePattern: 'Room {index}'
}

// Loop trace result
export interface WallLoopTrace {
  pointIds: PointId[]
  wallIds: WallId[]
}

// Direction for loop tracing
export type LoopDirection = 'left' | 'right'

// Room side relative to wall direction
export type RoomSide = 'left' | 'right'

export interface RoomDetectionEdge { endPointId: PointId, wallId: WallId }

export interface RoomDetectionGraph {
  points: Map<PointId, Point2D>
  edges: Map<PointId, RoomDetectionEdge[]> // Edges are undirected, so if this map contains p1 -> p2, it also contains p2 -> p1
  walls: Map<WallId, { startPointId: PointId, endPointId: PointId }>
}
