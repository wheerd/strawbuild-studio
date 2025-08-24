import type { WallId, PointId, RoomId, FloorId } from '@/types/ids'
import type { Area } from '@/types/geometry'

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
  wallIds: WallId[] // All walls for backward compatibility
  outerBoundary: RoomBoundaryDefinition
  holes: RoomBoundaryDefinition[]
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
  wallIds: WallId[]
  pointIds: PointId[]
  isValid: boolean
  area?: Area
}

// Direction for loop tracing
export type LoopDirection = 'left' | 'right'

// Room side relative to wall direction
export type RoomSide = 'left' | 'right'