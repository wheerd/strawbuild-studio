import type {
  StoreyId,
  PerimeterId,
  PerimeterWallId,
  PerimeterCornerId,
  OpeningId,
  RingBeamConstructionMethodId
} from '@/types/ids'
import type { Length, LineSegment2D, Vec2 } from '@/types/geometry'

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

  // Per-side wall data
  walls: PerimeterWall[] // walls[i] goes from corners[i].insidePoint -> corners[(i + 1) % corners.length].insidePoint
  corners: PerimeterCorner[]

  // Ring beam configuration
  baseRingBeamMethodId?: RingBeamConstructionMethodId
  topRingBeamMethodId?: RingBeamConstructionMethodId
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
  insideLine: LineSegment2D
  outsideLine: LineSegment2D
  direction: Vec2 // Normalized from start -> end of wall
  outsideDirection: Vec2 // Normal vector pointing outside
}

export interface PerimeterCorner {
  id: PerimeterCornerId

  // The inside point defines the inner boundary of the building
  insidePoint: Vec2

  // The outside point defines the outer edge after applying wall thickness
  // Together with the inside points and adjacent wall edge points, these define the corner area
  outsidePoint: Vec2

  // Which wall "owns" this corner - this is relevant for construction
  constuctedByWall: 'previous' | 'next'
}
