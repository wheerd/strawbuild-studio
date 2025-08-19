import type { WallId, ConnectionPointId, RoomId, OpeningId, FloorId } from './ids'

// Core geometric types
export interface Point2D {
  x: number
  y: number
}

export interface Vector2D {
  x: number
  y: number
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

// Connection point for wall endpoints
export interface ConnectionPoint {
  id: ConnectionPointId
  position: Point2D
  connectedWallIds: WallId[]
}

// Wall entity
export interface Wall {
  id: WallId
  startPointId: ConnectionPointId
  endPointId: ConnectionPointId
  thickness: number
  height: number
  openingIds: OpeningId[]
}

// Opening in a wall (door, window, etc.)
export interface Opening {
  id: OpeningId
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
  connectionPointIds: ConnectionPointId[]
  openingIds: OpeningId[]
}

// Model state for the application
export interface ModelState {
  floors: Map<FloorId, Floor>
  walls: Map<WallId, Wall>
  rooms: Map<RoomId, Room>
  connectionPoints: Map<ConnectionPointId, ConnectionPoint>
  openings: Map<OpeningId, Opening>
  bounds?: Bounds
  createdAt: Date
  updatedAt: Date
}
