import type {
  WallId,
  PointId,
  RoomId,
  FloorId,
  SlabId,
  RoofId,
  OuterWallId,
  WallSegmentId,
  OuterCornerId,
  OpeningId
} from '@/types/ids'
import type { Length, LineSegment2D, Vec2 } from '@/types/geometry'

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
  position: Vec2
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
  id: OpeningId
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

export interface OuterWallPolygon {
  id: OuterWallId
  floorId: FloorId

  // Polygon defining the inside area of the building
  boundary: Vec2[] // Ordered clockwise, defines inner face of walls

  // Per-side wall data
  segments: OuterWallSegment[] // segments[i] goes from boundary[i] -> boundary[(i + 1) % boundary.length]
  corners: OuterCorner[]
}

export type OuterWallConstructionType = 'cells-under-tension' | 'infill' | 'strawhenge' | 'non-strawbale'

export interface OuterWallSegment {
  id: WallSegmentId
  thickness: Length
  constructionType: OuterWallConstructionType

  openings: Opening[]

  // Geometry, computed from the points automatically
  insideLength: Length
  outsideLength: Length
  segmentLength: Length
  insideLine: LineSegment2D
  outsideLine: LineSegment2D
  direction: Vec2 // Normalized from start -> end of segment
  outsideDirection: Vec2 // Normal vector pointing outside
}

export interface OuterCorner {
  id: OuterCornerId
  // This point, the boundary point, and the two adjacent wall edge points define the corner area
  // Together with the wall areas the form the whole area that the outer wall covers
  outsidePoint: Vec2

  // Which wall "owns" this corner - this is relevant for construction
  belongsTo: 'previous' | 'next'
}
