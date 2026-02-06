import { type Length } from '@/shared/geometry'

import type { ConstraintId, NodeId, WallId } from './ids'

export type Constraint =
  | DistanceConstraint
  | ColinearConstraint
  | ParallelConstraint
  | PerpendicularConstraint
  | AngleConstraint
  | HorizontalConstraint
  | VerticalConstraint

export interface DistanceConstraint {
  id: ConstraintId
  type: 'distance'
  side: 'left' | 'right'
  nodeA: NodeId
  nodeB: NodeId
  length: Length
}

export interface ParallelConstraint {
  id: ConstraintId
  type: 'parallel'
  wallA: WallId
  wallB: WallId
  distance?: Length
}

export interface ColinearConstraint {
  id: ConstraintId
  type: 'colinear'
  nodeA: NodeId
  nodeB: NodeId
  nodeC: NodeId
  side: 'left' | 'right'
}

export interface PerpendicularConstraint {
  id: ConstraintId
  type: 'perpendicular'
  wallA: WallId
  wallB: WallId
}

export interface AngleConstraint {
  id: ConstraintId
  type: 'angle'
  pivot: NodeId
  nodeA: NodeId
  nodeB: NodeId
  angle: number // radians
}

export interface HorizontalConstraint {
  id: ConstraintId
  type: 'horizontal'
  nodeA: NodeId
  nodeB: NodeId
}

export interface VerticalConstraint {
  id: ConstraintId
  type: 'vertical'
  nodeA: NodeId
  nodeB: NodeId
}

/** A constraint without the `id` field, used when adding constraints to the store. */
export type ConstraintInput = {
  [K in Constraint['type']]: Omit<Extract<Constraint, { type: K }>, 'id'>
}[Constraint['type']]
