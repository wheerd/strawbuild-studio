import type { WallId, PointId, RoomId, FloorId, CornerId, SlabId, RoofId } from '@/types/ids'
import type {
  Length,
  Area,
  Angle,
  Point2D,
  Bounds2D,
  Polygon2D,
  PolygonWithHoles2D
} from '@/types/geometry'

// Floor level branded type
export type FloorLevel = number & { __brand: 'FloorLevel' }

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
  position: Point2D
}

export type WallOrCornerId = WallId | CornerId

// Connection point for wall endpoints
export interface Corner {
  id: CornerId
  pointId: PointId
  wall1Id: WallId // Depending on the construction type, this is the dominant wall which "owns" the corner
  wall2Id: WallId
  otherWallIds?: WallId[]
  readonly angle: Angle
  readonly type: 'corner' | 'straight' | 'tee' | 'cross'
  readonly area: Polygon2D
}

// Wall entity
export interface Wall {
  id: WallId

  startPointId: PointId
  startTouches?: WallOrCornerId
  endPointId: PointId
  endTouches?: WallOrCornerId

  heightAtStart: Length
  heightAtEnd: Length
  thickness: Length

  touchedBy?: WallId[]
  openings?: Opening[]

  type: 'outer' | 'structural' | 'partition' | 'other'
  outsideDirection?: 'left' | 'right' // Relative to the wall's start point

  readonly shape: Polygon2D // Computed
  readonly length: Length // Computed
}

// Opening in a wall (door, window, etc.)
export interface Opening {
  type: 'door' | 'window' | 'passage'
  offsetFromStart: Length // Offset in mm from wall start point
  width: Length
  height: Length
  sillHeight?: Length // For windows
}

// Slab entity
export interface Slab {
  id: SlabId
  polygon: PolygonWithHoles2D
  thickness: Length
  readonly area: Area // Computed
}

// Slab entity
export interface Roof {
  id: RoofId
  polygon: Polygon2D
  thickness: Length
  overhang: Length
  readonly slope: Angle
  orientation: 'flat' | 'pitched' | 'gable'
  ridgeHeight: Length
  eaveHeight: Length
  readonly area: Area // Computed
}

// Room/space
export interface Room {
  id: RoomId
  name: string
  wallIds: WallId[]
  readonly area: Area
}

// Floor/level
export interface Floor {
  id: FloorId
  name: string
  level: FloorLevel // Floor level (0 = ground floor, 1 = first floor, etc.)
  height: Length
  wallIds: WallId[]
  roomIds: RoomId[]
  pointIds: PointId[]
  slabIds: SlabId[]
  roofIds: RoofId[]
  readonly area: Area // Computed from walls and rooms
  readonly bounds?: Bounds2D
}

// Model state for the application
export interface ModelState {
  floors: Map<FloorId, Floor>
  walls: Map<WallId, Wall>
  rooms: Map<RoomId, Room>
  points: Map<PointId, Point>
  corners: Map<CornerId, Corner>
  slabs: Map<SlabId, Slab>
  roofs: Map<RoofId, Roof>
  readonly bounds?: Bounds2D
  createdAt: Date
  updatedAt: Date
}
