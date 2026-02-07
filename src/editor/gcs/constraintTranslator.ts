import type { Constraint } from '@salusoft89/planegcs'

import type { ConstraintInput, PerimeterCornerId, PerimeterWallId, WallId } from '@/building/model'
import { isPerimeterCornerId, isPerimeterWallId } from '@/building/model'

// --- ID helpers ---

/**
 * Sort two strings alphabetically and return them as a tuple.
 */
function sortedPair(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a]
}

const BC_PREFIX = 'bc_'

/**
 * Get the GCS point ID for a corner on a given side.
 *
 * For a clockwise perimeter, 'left' is the outside face and 'right' is the inside face.
 */
export function nodeSidePointId(cornerId: PerimeterCornerId, side: 'left' | 'right'): string {
  const suffix = side === 'left' ? 'out' : 'in'
  return `corner_${cornerId}_${suffix}`
}

/**
 * Get the GCS point ID for a corner on the inside face.
 */
export function nodeInsidePointId(cornerId: PerimeterCornerId): string {
  return `corner_${cornerId}_in`
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
 * Symmetric pairs are sorted so that the same constraint expressed
 * with swapped arguments produces the same key. Certain constraint types
 * share a key prefix to prevent contradictory constraints (e.g. horizontal
 * and vertical on the same wall).
 */
export function buildingConstraintKey(constraint: ConstraintInput): string {
  switch (constraint.type) {
    case 'wallLength':
      return `wallLength_${constraint.wall}`
    case 'colinearCorner':
      return `colinearCorner_${constraint.corner}`
    case 'parallel': {
      const [a, b] = sortedPair(constraint.wallA, constraint.wallB)
      return `wall_pair_${a}_${b}`
    }
    case 'perpendicularCorner':
      return `perpendicularCorner_${constraint.corner}`
    case 'cornerAngle':
      return `cornerAngle_${constraint.corner}`
    case 'horizontalWall':
      return `hv_${constraint.wall}`
    case 'verticalWall':
      return `hv_${constraint.wall}`
  }
}

// --- Translation ---

/**
 * Context needed to resolve entity relationships for constraint translation.
 */
export interface TranslationContext {
  /** Given a GCS line ID, return the ID of its first point (p1_id). */
  getLineStartPointId: (lineId: string) => string | undefined
  /** Given a wall ID, return the IDs of the start and end corners. */
  getWallCornerIds: (wallId: WallId) => { startCornerId: PerimeterCornerId; endCornerId: PerimeterCornerId } | undefined
  /** Given a corner ID, return the IDs of the adjacent walls. */
  getCornerAdjacentWallIds: (cornerId: PerimeterCornerId) => { previousWallId: WallId; nextWallId: WallId } | undefined
  /** Given a corner ID, return the reference side for the perimeter it belongs to. */
  getReferenceSide: (cornerId: PerimeterCornerId) => 'left' | 'right'
}

/**
 * Translate a building-model constraint into one or more planegcs constraints.
 *
 * Each planegcs constraint gets a deterministic ID based on the building
 * constraint key so they can be found and removed later.
 */
export function translateBuildingConstraint(
  constraint: ConstraintInput,
  key: string,
  context: TranslationContext
): Constraint[] {
  const prefix = `${BC_PREFIX}${key}`

  switch (constraint.type) {
    case 'wallLength': {
      const corners = context.getWallCornerIds(constraint.wall)
      if (!corners) return []
      return [
        {
          id: prefix,
          type: 'p2p_distance',
          p1_id: nodeSidePointId(corners.startCornerId, constraint.side),
          p2_id: nodeSidePointId(corners.endCornerId, constraint.side),
          distance: constraint.length,
          driving: true
        }
      ]
    }

    case 'colinearCorner': {
      // The middle point (the corner itself) must lie on the line defined by
      // the adjacent corners on the same face.
      const adjWalls = context.getCornerAdjacentWallIds(constraint.corner)
      if (!adjWalls) return []
      const prevCorners = context.getWallCornerIds(adjWalls.previousWallId)
      const nextCorners = context.getWallCornerIds(adjWalls.nextWallId)
      if (!prevCorners || !nextCorners) return []
      // Previous wall's start corner and next wall's end corner are the line endpoints.
      // The corner itself is the point that must be on the line.
      const side = context.getReferenceSide(constraint.corner)
      return [
        {
          id: prefix,
          type: 'point_on_line_ppp',
          p_id: nodeSidePointId(constraint.corner, side),
          lp1_id: nodeSidePointId(prevCorners.startCornerId, side),
          lp2_id: nodeSidePointId(nextCorners.endCornerId, side),
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
        const pointId = context.getLineStartPointId(lineAId)

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

    case 'perpendicularCorner': {
      const adjWalls = context.getCornerAdjacentWallIds(constraint.corner)
      if (!adjWalls) return []
      return [
        {
          id: prefix,
          type: 'perpendicular_ll',
          l1_id: wallInsideLineId(adjWalls.previousWallId),
          l2_id: wallInsideLineId(adjWalls.nextWallId),
          driving: true
        }
      ]
    }

    case 'cornerAngle': {
      // Angle between the two walls meeting at this corner.
      // Lines are defined by the inside-face points of the corner and its neighbors.
      const adjWalls = context.getCornerAdjacentWallIds(constraint.corner)
      if (!adjWalls) return []
      const prevCorners = context.getWallCornerIds(adjWalls.previousWallId)
      const nextCorners = context.getWallCornerIds(adjWalls.nextWallId)
      if (!prevCorners || !nextCorners) return []
      return [
        {
          id: prefix,
          type: 'l2l_angle_pppp',
          l1p1_id: nodeInsidePointId(constraint.corner),
          l1p2_id: nodeInsidePointId(prevCorners.startCornerId),
          l2p1_id: nodeInsidePointId(constraint.corner),
          l2p2_id: nodeInsidePointId(nextCorners.endCornerId),
          angle: constraint.angle,
          driving: true
        }
      ]
    }

    case 'horizontalWall': {
      const corners = context.getWallCornerIds(constraint.wall)
      if (!corners) return []
      return [
        {
          id: prefix,
          type: 'horizontal_pp',
          p1_id: nodeInsidePointId(corners.startCornerId),
          p2_id: nodeInsidePointId(corners.endCornerId),
          driving: true
        }
      ]
    }

    case 'verticalWall': {
      const corners = context.getWallCornerIds(constraint.wall)
      if (!corners) return []
      return [
        {
          id: prefix,
          type: 'vertical_pp',
          p1_id: nodeInsidePointId(corners.startCornerId),
          p2_id: nodeInsidePointId(corners.endCornerId),
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
export function getReferencedCornerIds(constraint: ConstraintInput): PerimeterCornerId[] {
  switch (constraint.type) {
    case 'colinearCorner':
    case 'perpendicularCorner':
    case 'cornerAngle':
      return isPerimeterCornerId(constraint.corner) ? [constraint.corner] : []
    case 'wallLength':
    case 'horizontalWall':
    case 'verticalWall':
    case 'parallel':
      return []
  }
}

/**
 * Extract all PerimeterWallIds referenced by a building constraint.
 */
export function getReferencedWallIds(constraint: ConstraintInput): PerimeterWallId[] {
  switch (constraint.type) {
    case 'wallLength':
    case 'horizontalWall':
    case 'verticalWall':
      return isPerimeterWallId(constraint.wall) ? [constraint.wall] : []
    case 'parallel': {
      const result: PerimeterWallId[] = []
      if (isPerimeterWallId(constraint.wallA)) result.push(constraint.wallA)
      if (isPerimeterWallId(constraint.wallB)) result.push(constraint.wallB)
      return result
    }
    case 'colinearCorner':
    case 'perpendicularCorner':
    case 'cornerAngle':
      return []
  }
}
