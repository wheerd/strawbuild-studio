import { type Area, type Length, type LineSegment2D, type Polygon2D, type Vec2 } from '@/shared/geometry'

import type { IntermediateWallId, OpeningId, PerimeterId, PerimeterWallId, RoomId, WallId, WallNodeId } from './ids'

export type RoomType =
  | 'living-room'
  | 'kitchen'
  | 'dining-room'
  | 'bedroom'
  | 'bathroom'
  | 'wc'
  | 'hallway'
  | 'office'
  | 'storage'
  | 'utility'
  | 'service'
  | 'generic'

export interface BaseWallNode {
  id: WallNodeId
  perimeterId: PerimeterId
  type: 'perimeter' | 'inner'
}

export interface PerimeterWallNode extends BaseWallNode {
  type: 'perimeter'
  wallId: PerimeterWallId
  offsetFromCornerStart: Length

  // Computed
  position: Vec2
}

export interface InnerWallNode extends BaseWallNode {
  type: 'inner'
  position: Vec2
  constructedBy: IntermediateWallId

  // Computed
  boundary: Polygon2D
}

export type WallNode = PerimeterWallNode | InnerWallNode

export interface PerimeterWallNode extends BaseWallNode {
  type: 'perimeter'
}

export interface Room {
  id: RoomId
  perimeterId: PerimeterId
  wallIds: WallId[] // Detected automatically

  type: RoomType
  counter: number // Counts up the rooms per storey and room type (i.e. bedroom 1, bedroom 2, ...)
  customLabel?: string

  // Computed geometry
  boundary: Polygon2D
  area: Area
}

export interface WallAttachment {
  nodeId: WallNodeId
  axis: 'left' | 'center' | 'right'
}

export interface IntermediateWall {
  id: IntermediateWallId
  perimeterId: PerimeterId
  openingIds: OpeningId[]
  leftRoomId: RoomId
  rightRoomId: RoomId

  start: WallAttachment
  end: WallAttachment

  thickness: Length

  // Computed geometry:
  boundary: Polygon2D

  centerLine: LineSegment2D
  wallLength: Length

  leftLength: Length
  leftLine: LineSegment2D
  rightLength: Length
  rightLine: LineSegment2D

  direction: Vec2 // Normalized from start -> end of wall
  leftDirection: Vec2 // Normalized vector pointing left

  // TODO: wallAssemblyId: WallAssemblyId
}
