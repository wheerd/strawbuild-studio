import { type Length, type LineSegment2D, type Polygon2D, type Vec2 } from '@/shared/geometry'

import type {
  IntermediateWallId,
  PerimeterCornerId,
  PerimeterId,
  PerimeterWallId,
  RingBeamAssemblyId,
  RoomId,
  StoreyId,
  WallAssemblyId,
  WallEntityId,
  WallNodeId
} from './ids'

export type PerimeterReferenceSide = 'inside' | 'outside'

export interface Perimeter {
  id: PerimeterId
  storeyId: StoreyId

  wallIds: PerimeterWallId[] // walls[i] goes from corners[i] -> corners[(i + 1) % corners.length]
  cornerIds: PerimeterCornerId[]
  roomIds: RoomId[]
  wallNodeIds: WallNodeId[]
  intermediateWallIds: IntermediateWallId[]

  referenceSide: PerimeterReferenceSide
}

export interface PerimeterGeometry {
  outerPolygon: Polygon2D
  innerPolygon: Polygon2D
}

export interface PerimeterWithGeometry extends Perimeter, PerimeterGeometry {}

export interface PerimeterWall {
  id: PerimeterWallId
  perimeterId: PerimeterId
  startCornerId: PerimeterCornerId
  endCornerId: PerimeterCornerId
  entityIds: WallEntityId[]

  thickness: Length
  wallAssemblyId: WallAssemblyId

  baseRingBeamAssemblyId?: RingBeamAssemblyId
  topRingBeamAssemblyId?: RingBeamAssemblyId
}

export interface PerimeterWallGeometry {
  insideLength: Length
  outsideLength: Length
  wallLength: Length
  insideLine: LineSegment2D
  outsideLine: LineSegment2D
  direction: Vec2 // Normalized from start -> end of wall
  outsideDirection: Vec2 // Normal vector pointing outside
  polygon: Polygon2D
}

export interface PerimeterWallWithGeometry extends PerimeterWall, PerimeterWallGeometry {}

export interface PerimeterCorner {
  id: PerimeterCornerId
  perimeterId: PerimeterId
  previousWallId: PerimeterWallId
  nextWallId: PerimeterWallId

  referencePoint: Vec2

  // Which wall "owns" this corner - this is relevant for construction
  constructedByWall: 'previous' | 'next'
}

export interface PerimeterCornerGeometry {
  // The inside point defines the inner boundary of the building
  insidePoint: Vec2

  // The outside point defines the outer edge after applying wall thickness
  // Together with the inside points and adjacent wall edge points, these define the corner area
  outsidePoint: Vec2

  // Interior angle (inside the building perimeter) in degrees
  interiorAngle: number

  // Exterior angle (outside the building perimeter) in degrees
  exteriorAngle: number

  polygon: Polygon2D
}

export interface PerimeterCornerWithGeometry extends PerimeterCorner, PerimeterCornerGeometry {}
