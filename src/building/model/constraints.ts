import { type Length } from '@/shared/geometry'

import type { ConstraintId, PerimeterCornerId, WallId } from './ids'

export type Constraint =
  | WallLengthConstraint
  | ColinearCornerConstraint
  | ParallelConstraint
  | PerpendicularCornerConstraint
  | CornerAngleConstraint
  | HorizontalWallConstraint
  | VerticalWallConstraint

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

/** A constraint without the `id` field, used when adding constraints to the store. */
export type ConstraintInput = {
  [K in Constraint['type']]: Omit<Extract<Constraint, { type: K }>, 'id'>
}[Constraint['type']]
