import type { WallId, PointId, RoomId, FloorId, SlabId, RoofId } from '@/types/ids'
import type { Length, Point2D } from '@/types/geometry'

// Floor level branded type
export type FloorLevel = number & { __brand: 'FloorLevel' }

// Wall types
export type WallType = 'outer' | 'structural' | 'partition' | 'other'
export type OutsideDirection = 'left' | 'right'

// Opening types
export type OpeningType = 'door' | 'window' | 'passage'

// Roof types
export type RoofOrientation = 'flat' | 'pitched' | 'gable'

// Floor level validation and creation
export const createFloorLevel = (value: number): FloorLevel => {
  if (!Number.isInteger(value)) {
    throw new Error(`Floor level must be an integer, got ${value}`)
  }
  return value as FloorLevel
}

// Connection point for wall endpoints
export interface Point {
  id: PointId
  floorId: FloorId // Immutable - set at creation time
  position: Point2D
  roomIds: Set<RoomId> // Rooms that this point belongs to
}

export type WallOrCornerId = WallId | PointId

// Connection point for wall endpoints
export interface Corner {
  pointId: PointId
  floorId: FloorId // Immutable - set at creation time
  wall1Id: WallId // Depending on the construction type, this is the dominant wall which "owns" the corner
  wall2Id: WallId
  otherWallIds?: WallId[]
}

// Wall entity
export interface Wall {
  id: WallId
  floorId: FloorId // Immutable - set at creation time

  startPointId: PointId
  startTouches?: WallOrCornerId
  endPointId: PointId
  endTouches?: WallOrCornerId
  touchedBy?: WallId[]

  thickness: Length

  openings?: Opening[]

  type: WallType
  outsideDirection?: OutsideDirection // Relative to the wall direction (start -> end), only for outer walls

  // Room tracking - left and right relative to wall direction (start -> end)
  leftRoomId?: RoomId
  rightRoomId?: RoomId
}

// Opening in a wall (door, window, etc.)
export interface Opening {
  type: OpeningType
  offsetFromStart: Length // Offset in mm from wall start point
  width: Length
  height: Length
  sillHeight?: Length // For windows
}

// Slab entity
export interface Slab {
  id: SlabId
  floorId: FloorId // Immutable - set at creation time
  outer: PointId[] // Outer boundary, ordered clockwise
  holes: PointId[][] // Inner boundaries (holes), each ordered counter-clockwise
  thickness: Length
}

// Roof entity
export interface Roof {
  id: RoofId
  floorId: FloorId // Immutable - set at creation time
  polygon: PointId[] // Outer boundary, ordered clockwise
  thickness: Length
  overhang: Length
  orientation: RoofOrientation
  ridgeHeight: Length
  eaveHeight: Length
}

// Room/space boundary definition
export interface RoomBoundary {
  pointIds: PointId[] // Ordered clockwise for outer boundary, counter-clockwise for holes
  wallIds: Set<WallId> // Walls that form this boundary
}

// Room/space
export interface Room {
  id: RoomId
  floorId: FloorId // Immutable - set at creation time
  name: string

  // Geometric structure supporting holes
  outerBoundary: RoomBoundary
  holes: RoomBoundary[] // Inner boundaries (holes) like courtyards, atriums, etc.

  // Interior walls that are inside the room (not part of boundaries)
  interiorWallIds: Set<WallId>
}

// Floor/level
export interface Floor {
  id: FloorId
  name: string
  level: FloorLevel // Floor level (0 = ground floor, 1 = first floor, etc.)
  height: Length
}
