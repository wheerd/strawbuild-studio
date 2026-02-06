import type { Constraint } from '@salusoft89/planegcs'

import type {
  Constraint as BuildingConstraint,
  NodeId,
  PerimeterCornerId,
  PerimeterWallId,
  WallId
} from '@/building/model'
import { isPerimeterCornerId, isPerimeterWallId } from '@/building/model'

// --- ID helpers ---

/**
 * Sort two strings alphabetically and return them as a tuple.
 */
function sortedPair(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a]
}

/**
 * Sort three strings alphabetically and return them as a tuple.
 */
function sortedTriple(a: string, b: string, c: string): [string, string, string] {
  const arr = [a, b, c].sort()
  return arr as [string, string, string]
}

const BC_PREFIX = 'bc_'

/**
 * Get the GCS point ID for a node on a given side.
 *
 * For a clockwise perimeter, 'left' is the outside face and 'right' is the inside face.
 */
export function nodeSidePointId(nodeId: NodeId, side: 'left' | 'right'): string {
  const suffix = side === 'left' ? 'out' : 'in'
  return `corner_${nodeId}_${suffix}`
}

/**
 * Get the GCS point ID for a node on the inside face.
 */
export function nodeInsidePointId(nodeId: NodeId): string {
  return `corner_${nodeId}_in`
}

/**
 * Get the GCS line ID for the inside face of a wall.
 */
export function wallInsideLineId(wallId: WallId): string {
  return `wall_${wallId}_in`
}

// --- Key derivation ---

/**
 * Derive a deterministic, deduplicated key for a building constraint.
 *
 * Symmetric pairs/triples are sorted so that the same constraint expressed
 * with swapped arguments produces the same key. Certain constraint types
 * share a key prefix to prevent contradictory constraints (e.g. horizontal
 * and vertical on the same nodes, or parallel and perpendicular on the same
 * walls).
 */
export function buildingConstraintKey(constraint: BuildingConstraint): string {
  switch (constraint.type) {
    case 'distance': {
      const [a, b] = sortedPair(constraint.nodeA, constraint.nodeB)
      return `distance_${a}_${b}`
    }
    case 'colinear': {
      const [a, b, c] = sortedTriple(constraint.nodeA, constraint.nodeB, constraint.nodeC)
      return `colinear_${a}_${b}_${c}`
    }
    case 'parallel': {
      const [a, b] = sortedPair(constraint.wallA, constraint.wallB)
      return `wall_pair_${a}_${b}`
    }
    case 'perpendicular': {
      const [a, b] = sortedPair(constraint.wallA, constraint.wallB)
      return `wall_pair_${a}_${b}`
    }
    case 'angle': {
      const [a, b, c] = sortedTriple(constraint.pivot, constraint.nodeA, constraint.nodeB)
      return `angle_${a}_${b}_${c}`
    }
    case 'horizontal': {
      const [a, b] = sortedPair(constraint.nodeA, constraint.nodeB)
      return `hv_${a}_${b}`
    }
    case 'vertical': {
      const [a, b] = sortedPair(constraint.nodeA, constraint.nodeB)
      return `hv_${a}_${b}`
    }
  }
}

// --- Translation ---

/**
 * Context needed to resolve wall line start points for certain constraints.
 */
export interface TranslationContext {
  /** Given a GCS line ID, return the ID of its first point (p1_id). */
  getLineStartPointId: (lineId: string) => string | undefined
}

/**
 * Translate a building-model constraint into one or more planegcs constraints.
 *
 * Each planegcs constraint gets a deterministic ID based on the building
 * constraint key so they can be found and removed later.
 *
 * @param context - Required only for ParallelConstraint with a distance field.
 *   Provides a way to look up line start points from the store.
 */
export function translateBuildingConstraint(
  constraint: BuildingConstraint,
  key: string,
  context?: TranslationContext
): Constraint[] {
  const prefix = `${BC_PREFIX}${key}`

  switch (constraint.type) {
    case 'distance': {
      return [
        {
          id: prefix,
          type: 'p2p_distance',
          p1_id: nodeSidePointId(constraint.nodeA, constraint.side),
          p2_id: nodeSidePointId(constraint.nodeB, constraint.side),
          distance: constraint.length,
          driving: true
        }
      ]
    }

    case 'colinear': {
      return [
        {
          id: prefix,
          type: 'point_on_line_ppp',
          p_id: nodeSidePointId(constraint.nodeB, constraint.side),
          lp1_id: nodeSidePointId(constraint.nodeA, constraint.side),
          lp2_id: nodeSidePointId(constraint.nodeC, constraint.side),
          driving: true
        }
      ]
    }

    case 'parallel': {
      const result: Constraint[] = [
        {
          id: `${prefix}_par`,
          type: 'parallel',
          l1_id: wallInsideLineId(constraint.wallA),
          l2_id: wallInsideLineId(constraint.wallB),
          driving: true
        }
      ]

      if (constraint.distance != null) {
        const lineAId = wallInsideLineId(constraint.wallA)
        const pointId = context?.getLineStartPointId(lineAId)

        if (pointId) {
          result.push({
            id: `${prefix}_dist`,
            type: 'p2l_distance',
            p_id: pointId,
            l_id: wallInsideLineId(constraint.wallB),
            distance: constraint.distance,
            driving: true
          })
        }
      }

      return result
    }

    case 'perpendicular': {
      return [
        {
          id: prefix,
          type: 'perpendicular_ll',
          l1_id: wallInsideLineId(constraint.wallA),
          l2_id: wallInsideLineId(constraint.wallB),
          driving: true
        }
      ]
    }

    case 'angle': {
      return [
        {
          id: prefix,
          type: 'l2l_angle_pppp',
          l1p1_id: nodeInsidePointId(constraint.pivot),
          l1p2_id: nodeInsidePointId(constraint.nodeA),
          l2p1_id: nodeInsidePointId(constraint.pivot),
          l2p2_id: nodeInsidePointId(constraint.nodeB),
          angle: constraint.angle,
          driving: true
        }
      ]
    }

    case 'horizontal': {
      return [
        {
          id: prefix,
          type: 'horizontal_pp',
          p1_id: nodeInsidePointId(constraint.nodeA),
          p2_id: nodeInsidePointId(constraint.nodeB),
          driving: true
        }
      ]
    }

    case 'vertical': {
      return [
        {
          id: prefix,
          type: 'vertical_pp',
          p1_id: nodeInsidePointId(constraint.nodeA),
          p2_id: nodeInsidePointId(constraint.nodeB),
          driving: true
        }
      ]
    }
  }
}

/**
 * Get the IDs of all planegcs constraints that were translated from a
 * building constraint with the given key.
 */
export function translatedConstraintIds(key: string): string[] {
  return [`${BC_PREFIX}${key}`, `${BC_PREFIX}${key}_par`, `${BC_PREFIX}${key}_dist`]
}

// --- Validation helpers ---

/**
 * Extract all PerimeterCornerIds referenced by a building constraint.
 */
export function getReferencedCornerIds(constraint: BuildingConstraint): PerimeterCornerId[] {
  const nodeIds = getReferencedNodeIds(constraint)
  return nodeIds.filter(isPerimeterCornerId)
}

/**
 * Extract all PerimeterWallIds referenced by a building constraint.
 */
export function getReferencedWallIds(constraint: BuildingConstraint): PerimeterWallId[] {
  const wallIds = getReferencedWallIdsRaw(constraint)
  return wallIds.filter(isPerimeterWallId)
}

function getReferencedNodeIds(constraint: BuildingConstraint): NodeId[] {
  switch (constraint.type) {
    case 'distance':
    case 'horizontal':
    case 'vertical':
      return [constraint.nodeA, constraint.nodeB]
    case 'colinear':
      return [constraint.nodeA, constraint.nodeB, constraint.nodeC]
    case 'angle':
      return [constraint.pivot, constraint.nodeA, constraint.nodeB]
    case 'parallel':
    case 'perpendicular':
      return []
  }
}

function getReferencedWallIdsRaw(constraint: BuildingConstraint): WallId[] {
  switch (constraint.type) {
    case 'parallel':
    case 'perpendicular':
      return [constraint.wallA, constraint.wallB]
    case 'distance':
    case 'colinear':
    case 'angle':
    case 'horizontal':
    case 'vertical':
      return []
  }
}
