import { type Area, type Length, type LineSegment2D, type Polygon2D, type Vec2 } from '@/shared/geometry'

import type {
  InteriorWallAssemblyId,
  IntermediateWallId,
  PerimeterId,
  PerimeterWallId,
  RoomId,
  WallEntityId,
  WallId,
  WallNodeId
} from './ids'

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

export type WallAxis = 'left' | 'right'

export interface BaseWallNode {
  id: WallNodeId
  perimeterId: PerimeterId
  type: 'perimeter' | 'inner'
  connectedWallIds: IntermediateWallId[]
}

export interface PerimeterWallNode extends BaseWallNode {
  type: 'perimeter'
  wallId: PerimeterWallId
  offsetFromCornerStart: Length
}

export interface InnerWallNode extends BaseWallNode {
  type: 'inner'
  position: Vec2
  constructedBy?: IntermediateWallId
  constructedWithColinear?: IntermediateWallId
}

export interface WallNodeIncidentWall {
  id: WallId
  direction: Vec2
  leftPoint: Vec2
  rightPoint: Vec2
}

export interface BaseWallNodeGeometry {
  boundary?: Polygon2D
  center: Vec2
  incidentWalls: WallNodeIncidentWall[]
}

export interface PerimeterWallNodeGeometry extends BaseWallNodeGeometry {
  position: Vec2
  insideLine: LineSegment2D
  outsideLine: LineSegment2D
}

export type InnerWallNodeGeometry = BaseWallNodeGeometry

export type WallNodeGeometry = PerimeterWallNodeGeometry | InnerWallNodeGeometry

export type PerimeterWallNodeWithGeometry = PerimeterWallNode & PerimeterWallNodeGeometry
export type InnerWallNodeWithGeometry = InnerWallNode & InnerWallNodeGeometry

export type WallNode = PerimeterWallNode | InnerWallNode
export type WallNodeWithGeometry = PerimeterWallNodeWithGeometry | InnerWallNodeWithGeometry

export interface Room {
  id: RoomId
  perimeterId: PerimeterId
  wallIds: IntermediateWallId[] // Detected automatically
  type: RoomType
  counter: number // Counts up the rooms per storey and room type (i.e. bedroom 1, bedroom 2, ...)
  customLabel?: string
}

export interface RoomGeometry {
  boundary: Polygon2D
  area: Area
}

export type RoomWithGeometry = Room & RoomGeometry

export interface WallAttachment {
  nodeId: WallNodeId
  axis: WallAxis
}

export interface IntermediateWall {
  id: IntermediateWallId
  perimeterId: PerimeterId
  entityIds: WallEntityId[]
  leftRoomId?: RoomId // TODO
  rightRoomId?: RoomId // TODO
  start: WallAttachment
  end: WallAttachment
  thickness: Length
  wallAssemblyId: InteriorWallAssemblyId
}

export interface IntermediateWallGeometry {
  boundary: Polygon2D
  entityReferenceLine: LineSegment2D
  wallLength: Length
  leftLength: Length
  leftLine: LineSegment2D
  rightLength: Length
  rightLine: LineSegment2D
  direction: Vec2
  leftDirection: Vec2
}

export type IntermediateWallWithGeometry = IntermediateWall & IntermediateWallGeometry
