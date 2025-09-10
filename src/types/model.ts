import type { StoreyId, PerimeterId, PerimeterWallId, PerimeterCornerId, OpeningId } from '@/types/ids'
import type { Length, LineWall2D, Vec2 } from '@/types/geometry'

// Storey level branded type
export type StoreyLevel = number & { __brand: 'StoreyLevel' }

// Opening types
export type OpeningType = 'door' | 'window' | 'passage'

// Storey level validation and creation
export const createStoreyLevel = (value: number): StoreyLevel => {
  if (!Number.isInteger(value)) {
    throw new Error(`Storey level must be an integer, got ${value}`)
  }
  return value as StoreyLevel
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
export interface Storey {
  id: StoreyId
  name: string
  level: StoreyLevel // Floor level (0 = ground floor, 1 = first floor, etc.)
  height: Length
}

export interface Perimeter {
  id: PerimeterId
  storeyId: StoreyId

  // Polygon defining the inside area of the building
  boundary: Vec2[] // Ordered clockwise, defines inner face of walls

  // Per-side wall data
  walls: PerimeterWall[] // walls[i] goes from boundary[i] -> boundary[(i + 1) % boundary.length]
  corners: PerimeterCorner[]
}

export type PerimeterConstructionType = 'cells-under-tension' | 'infill' | 'strawhenge' | 'non-strawbale'

export interface PerimeterWall {
  id: PerimeterWallId
  thickness: Length
  constructionType: PerimeterConstructionType

  openings: Opening[]

  // Geometry, computed from the points automatically
  insideLength: Length
  outsideLength: Length
  wallLength: Length
  insideLine: LineWall2D
  outsideLine: LineWall2D
  direction: Vec2 // Normalized from start -> end of wall
  outsideDirection: Vec2 // Normal vector pointing outside
}

export interface PerimeterCorner {
  id: PerimeterCornerId

  // This point, the boundary point, and the two adjacent wall edge points define the corner area
  // Together with the wall areas the form the whole area that the perimeter covers
  outsidePoint: Vec2

  // Which wall "owns" this corner - this is relevant for construction
  belongsTo: 'previous' | 'next'
}
