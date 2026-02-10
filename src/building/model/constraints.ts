import { type Length } from '@/shared/geometry'

import type { ConstraintId, NodeId, PerimeterCornerId, WallEntityId, WallId } from './ids'

export type Constraint =
  | WallLengthConstraint
  | ColinearCornerConstraint
  | ParallelConstraint
  | PerpendicularCornerConstraint
  | CornerAngleConstraint
  | HorizontalWallConstraint
  | VerticalWallConstraint
  | WallEntityAbsoluteConstraint
  | WallEntityRelativeConstraint

export interface WallLengthConstraint {
  id: ConstraintId
  type: 'wallLength'
  side: 'left' | 'right'
  wall: WallId
  length: Length
}

export interface ParallelConstraint {
  id: ConstraintId
  type: 'parallel'
  wallA: WallId
  wallB: WallId
  distance?: Length
}

export interface ColinearCornerConstraint {
  id: ConstraintId
  type: 'colinearCorner'
  corner: PerimeterCornerId
}

export interface PerpendicularCornerConstraint {
  id: ConstraintId
  type: 'perpendicularCorner'
  corner: PerimeterCornerId
}

export interface CornerAngleConstraint {
  id: ConstraintId
  type: 'cornerAngle'
  corner: PerimeterCornerId
  angle: number // radians
}

export interface HorizontalWallConstraint {
  id: ConstraintId
  type: 'horizontalWall'
  wall: WallId
}

export interface VerticalWallConstraint {
  id: ConstraintId
  type: 'verticalWall'
  wall: WallId
}

export interface WallEntityAbsoluteConstraint {
  id: ConstraintId
  type: 'wallEntityAbsolute'
  wall: WallId
  entity: WallEntityId
  side: 'left' | 'right'
  entitySide: 'start' | 'center' | 'end'
  node: NodeId
  distance: Length
}

export interface WallEntityRelativeConstraint {
  id: ConstraintId
  type: 'wallEntityRelative'
  wall: WallId
  entityA: WallEntityId
  entityASide: 'start' | 'center' | 'end'
  entityB: WallEntityId
  entityBSide: 'start' | 'center' | 'end'
  distance: Length
}

/** A constraint without the `id` field, used when adding constraints to the store. */
export type ConstraintInput = {
  [K in Constraint['type']]: Omit<Extract<Constraint, { type: K }>, 'id'>
}[Constraint['type']]
