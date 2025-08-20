import type { WallId, PointId, RoomId, OpeningId, FloorId } from '@/types/ids'

// Core geometric types
export interface Point2D {
  x: number
  y: number
}

export interface Vector2D {
  x: number
  y: number
}

export interface Bounds2D {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

// Connection point for wall endpoints
export interface Point {
  id: PointId
  floorId: FloorId
  position: Point2D
  connectedWallIds: WallId[]
}

// Wall entity
export interface Wall {
  id: WallId
  floorId: FloorId
  startPointId: PointId
  endPointId: PointId
  thickness: number
  height: number
  openingIds: OpeningId[]
}

// Opening in a wall (door, window, etc.)
export interface Opening {
  id: OpeningId
  floorId: FloorId
  wallId: WallId
  type: 'door' | 'window' | 'passage'
  offsetFromStart: number // Offset in mm from wall start point
  width: number
  height: number
  sillHeight?: number // For windows
}

// Room/space
export interface Room {
  id: RoomId
  floorId: FloorId
  name: string
  wallIds: WallId[]
  area?: number
}

// Floor/level
export interface Floor {
  id: FloorId
  name: string
  level: number // Floor number (0 = ground, 1 = first floor, etc.)
  height: number
  wallIds: WallId[]
  roomIds: RoomId[]
  pointIds: PointId[]
  openingIds: OpeningId[]
  bounds?: Bounds2D
}

// Model state for the application
export interface ModelState {
  floors: Map<FloorId, Floor>
  walls: Map<WallId, Wall>
  rooms: Map<RoomId, Room>
  points: Map<PointId, Point>
  openings: Map<OpeningId, Opening>
  bounds?: Bounds2D
  createdAt: Date
  updatedAt: Date
}
