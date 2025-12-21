import type {
  FloorAreaId,
  FloorAssemblyId,
  FloorOpeningId,
  OpeningAssemblyId,
  OpeningId,
  PerimeterCornerId,
  PerimeterId,
  PerimeterWallId,
  RingBeamAssemblyId,
  RoofAssemblyId,
  RoofId,
  RoofOverhangId,
  StoreyId,
  WallAssemblyId,
  WallPostId
} from '@/building/model/ids'
import type { MaterialId } from '@/construction/materials/material'
import { type Length, type LineSegment2D, type Polygon2D, type Vec2 } from '@/shared/geometry'

export type PerimeterReferenceSide = 'inside' | 'outside'

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

  // Position (geometrically invariant to padding)
  centerOffsetFromWallStart: Length // Center position along inside wall face (same for finished/fitted)

  // Dimensions (FITTED - include padding/framing)
  width: Length // Fitted width (finished width + 2×padding)
  height: Length // Fitted height (finished height + 2×padding)
  sillHeight?: Length // Fitted sill height (finished sill - padding) - distance from floor to bottom of rough opening

  openingAssemblyId?: OpeningAssemblyId // Optional override for this specific opening
}

export type WallPostType = 'single' | 'double'

export interface WallPost {
  id: WallPostId
  type: WallPostType

  centerOffsetFromWallStart: Length
  position: 'center' | 'inside' | 'outside'

  width: Length
  thickness: Length
  material: MaterialId
  infillMaterial: MaterialId
}

// Floor/level
export interface Storey {
  readonly id: StoreyId
  readonly name: string
  readonly level: StoreyLevel // Floor level (0 = ground floor, 1 = first floor, etc.)
  readonly floorHeight: Length // Finished floor to finished floor
  readonly floorAssemblyId: FloorAssemblyId
}

export interface Perimeter {
  id: PerimeterId
  storeyId: StoreyId
  referenceSide: PerimeterReferenceSide
  referencePolygon: Vec2[]

  // Per-side wall data
  walls: PerimeterWall[] // walls[i] goes from corners[i].insidePoint -> corners[(i + 1) % corners.length].insidePoint
  corners: PerimeterCorner[]
}

export interface PerimeterWall {
  id: PerimeterWallId
  thickness: Length
  wallAssemblyId: WallAssemblyId

  openings: Opening[]
  posts: WallPost[]

  // Ring beam configuration
  baseRingBeamAssemblyId?: RingBeamAssemblyId
  topRingBeamAssemblyId?: RingBeamAssemblyId

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
  constructedByWall: 'previous' | 'next'

  // Interior angle (inside the building perimeter) in degrees
  interiorAngle: number

  // Exterior angle (outside the building perimeter) in degrees
  exteriorAngle: number
}

export interface FloorArea {
  id: FloorAreaId
  storeyId: StoreyId
  area: Polygon2D
}

export interface FloorOpening {
  id: FloorOpeningId
  storeyId: StoreyId
  area: Polygon2D
}

export type RoofType = 'shed' | 'gable'

export interface RoofOverhang {
  id: RoofOverhangId
  sideIndex: number
  value: Length
  // Computed trapezoid geometry (4 points: innerStart, innerEnd, outerEnd, outerStart)
  area: Polygon2D
}

export interface Roof {
  id: RoofId
  storeyId: StoreyId
  type: RoofType
  referencePolygon: Polygon2D
  ridgeLine: LineSegment2D
  mainSideIndex: number
  slope: number // Angle in degrees
  // Added to the floorHeight of the storey to determine the highest point of the roof (outside)
  verticalOffset: Length
  overhangs: RoofOverhang[] // Overhang for each side with computed geometry
  assemblyId: RoofAssemblyId
  referencePerimeter?: PerimeterId

  // Computed
  overhangPolygon: Polygon2D
  slopeAngleRad: number
  ridgeDirection: Vec2
  downSlopeDirection: Vec2
  rise: Length
  span: Length
}
