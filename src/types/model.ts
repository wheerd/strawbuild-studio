import type { FloorId, OuterWallId, WallSegmentId, OuterCornerId, OpeningId } from '@/types/ids'
import type { Length, LineSegment2D, Vec2 } from '@/types/geometry'

// Floor level branded type
export type FloorLevel = number & { __brand: 'FloorLevel' }

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

// Opening in a wall (door, window, etc.)
export interface Opening {
  id: OpeningId
  type: OpeningType
  offsetFromStart: Length // Offset in mm from wall start point
  width: Length
  height: Length
  sillHeight?: Length // For windows
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
