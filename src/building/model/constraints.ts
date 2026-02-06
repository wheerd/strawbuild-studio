import { type Length } from '@/shared/geometry'

import type { NodeId, WallId } from './ids'

export type Constraint =
  | DistanceConstraint
  | ColinearConstraint
  | ParallelConstraint
  | PerpendicularConstraint
  | AngleConstraint
  | HorizontalConstraint
  | VerticalConstraint

export interface DistanceConstraint {
  type: 'distance'
  side: 'left' | 'right'
  nodeA: NodeId
  nodeB: NodeId
  length: Length
}

export interface ParallelConstraint {
  type: 'parallel'
  wallA: WallId
  wallB: WallId
  distance?: Length
}

export interface ColinearConstraint {
  type: 'colinear'
  nodeA: NodeId
  nodeB: NodeId
  nodeC: NodeId
  side: 'left' | 'right'
}

export interface PerpendicularConstraint {
  type: 'perpendicular'
  wallA: WallId
  wallB: WallId
}

export interface AngleConstraint {
  type: 'angle'
  pivot: NodeId
  nodeA: NodeId
  nodeB: NodeId
  angle: number // radians
}

export interface HorizontalConstraint {
  type: 'horizontal'
  nodeA: NodeId
  nodeB: NodeId
}

export interface VerticalConstraint {
  type: 'vertical'
  nodeA: NodeId
  nodeB: NodeId
}
