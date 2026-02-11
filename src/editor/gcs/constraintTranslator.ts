import type { Constraint } from '@salusoft89/planegcs'

import type { ConstraintInput, PerimeterCornerId, PerimeterWallId, WallEntityId, WallId } from '@/building/model'
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
 * Get the GCS point ID for a corner on the reference side.
 * This is a single point shared by both adjacent walls.
 */
export function nodeRefSidePointId(cornerId: PerimeterCornerId): string {
  return `corner_${cornerId}_ref`
}

/**
 * Get the GCS point ID for a corner on the non-reference side,
 * specifically for the previous wall (wall ending at this corner).
 */
export function nodeNonRefSidePointForPrevWall(cornerId: PerimeterCornerId): string {
  return `corner_${cornerId}_nonref_prev`
}

/**
 * Get the GCS point ID for a corner on the non-reference side,
 * specifically for the next wall (wall starting at this corner).
 */
export function nodeNonRefSidePointForNextWall(cornerId: PerimeterCornerId): string {
  return `corner_${cornerId}_nonref_next`
}

export function wallNonRefSideProjectedPoint(wallId: PerimeterWallId, side: 'start' | 'end'): string {
  return `${wallId}_${side}_proj`
}

/**
 * Get the GCS line ID for the reference side of a wall.
 */
export function wallRefLineId(wallId: WallId): string {
  return `wall_${wallId}_ref`
}

/**
 * Get the GCS line ID for the non-reference side of a wall.
 */
export function wallNonRefLineId(wallId: WallId): string {
  return `wall_${wallId}_nonref`
}

export function wallEntityPointId(entityId: WallEntityId, side: 'start' | 'center' | 'end'): string {
  return `${entityId}_${side}_ref`
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
    case 'wallEntityAbsolute':
      return `we_${constraint.entity}_${constraint.node}`
    case 'wallEntityRelative': {
      const [a, b] = sortedPair(constraint.entityA, constraint.entityB)
      return `we_${a}_${b}`
    }
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

      // Determine if constraint side matches perimeter's reference side
      const refConstraintSide = context.getReferenceSide(corners.startCornerId)
      const isRefSide = constraint.side === refConstraintSide

      return [
        {
          id: prefix,
          type: 'p2p_distance',
          p1_id: isRefSide
            ? nodeRefSidePointId(corners.startCornerId)
            : nodeNonRefSidePointForNextWall(corners.startCornerId),
          p2_id: isRefSide
            ? nodeRefSidePointId(corners.endCornerId)
            : nodeNonRefSidePointForPrevWall(corners.endCornerId),
          distance: constraint.length,
          driving: true
        }
      ]
    }

    case 'colinearCorner': {
      // The middle point (the corner itself) must lie on the line defined by
      // the adjacent corners on the reference side.
      const adjWalls = context.getCornerAdjacentWallIds(constraint.corner)
      if (!adjWalls) return []
      const prevCorners = context.getWallCornerIds(adjWalls.previousWallId)
      const nextCorners = context.getWallCornerIds(adjWalls.nextWallId)
      if (!prevCorners || !nextCorners) return []
      // Previous wall's start corner and next wall's end corner are the line endpoints.
      // The corner itself is the point that must be on the line.
      return [
        {
          id: prefix,
          type: 'point_on_line_ppp',
          p_id: nodeRefSidePointId(constraint.corner),
          lp1_id: nodeRefSidePointId(prevCorners.startCornerId),
          lp2_id: nodeRefSidePointId(nextCorners.endCornerId),
          driving: true
        }
      ]
    }

    case 'parallel': {
      const result: Constraint[] = [
        {
          id: `${prefix}_par`,
          type: 'parallel',
          l1_id: wallRefLineId(constraint.wallA),
          l2_id: wallRefLineId(constraint.wallB),
          driving: true
        }
      ]

      if (constraint.distance != null) {
        const lineAId = wallRefLineId(constraint.wallA)
        const pointId = context.getLineStartPointId(lineAId)

        if (pointId) {
          result.push({
            id: `${prefix}_dist`,
            type: 'p2l_distance',
            p_id: pointId,
            l_id: wallRefLineId(constraint.wallB),
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
          l1_id: wallRefLineId(adjWalls.previousWallId),
          l2_id: wallRefLineId(adjWalls.nextWallId),
          driving: true
        }
      ]
    }

    case 'cornerAngle': {
      const adjWalls = context.getCornerAdjacentWallIds(constraint.corner)
      if (!adjWalls) return []
      return [
        {
          id: prefix,
          type: 'l2l_angle_ll',
          l1_id: wallRefLineId(adjWalls.previousWallId),
          l2_id: wallRefLineId(adjWalls.nextWallId),
          angle: constraint.angle,
          driving: true
        }
      ]
    }

    case 'horizontalWall': {
      return [
        {
          id: prefix,
          type: 'horizontal_l',
          l_id: wallRefLineId(constraint.wall),
          driving: true
        }
      ]
    }

    case 'verticalWall': {
      return [
        {
          id: prefix,
          type: 'vertical_l',
          l_id: wallRefLineId(constraint.wall),
          driving: true
        }
      ]
    }

    case 'wallEntityAbsolute': {
      const wall = context.getWallCornerIds(constraint.wall)
      if (!wall || !isPerimeterCornerId(constraint.node) || !isPerimeterWallId(constraint.wall)) return []

      const isRefSide = context.getReferenceSide(constraint.node) === constraint.side
      const entityPointId = wallEntityPointId(constraint.entity, constraint.entitySide)
      const nodePointId = isRefSide
        ? nodeRefSidePointId(constraint.node)
        : wallNonRefSideProjectedPoint(constraint.wall, constraint.node === wall.startCornerId ? 'start' : 'end')

      return [
        {
          id: prefix,
          type: 'p2p_distance',
          p1_id: nodePointId,
          p2_id: entityPointId,
          distance: constraint.distance,
          driving: true
        }
      ]
    }

    case 'wallEntityRelative': {
      const wall = context.getWallCornerIds(constraint.wall)
      if (!wall) return []

      const entityAPointId = wallEntityPointId(constraint.entityA, constraint.entityASide)
      const entityBPointId = wallEntityPointId(constraint.entityB, constraint.entityBSide)

      return [
        {
          id: prefix,
          type: 'p2p_distance',
          p1_id: entityAPointId,
          p2_id: entityBPointId,
          distance: constraint.distance,
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
    case 'wallEntityAbsolute':
      return isPerimeterCornerId(constraint.node) ? [constraint.node] : []
    default:
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
    case 'wallEntityRelative':
    case 'wallEntityAbsolute':
      return isPerimeterWallId(constraint.wall) ? [constraint.wall] : []
    case 'parallel': {
      const result: PerimeterWallId[] = []
      if (isPerimeterWallId(constraint.wallA)) result.push(constraint.wallA)
      if (isPerimeterWallId(constraint.wallB)) result.push(constraint.wallB)
      return result
    }
    default:
      return []
  }
}

/**
 * Extract all WallEntityIds referenced by a building constraint.
 */
export function getReferencedWallEntityIds(constraint: ConstraintInput): WallEntityId[] {
  switch (constraint.type) {
    case 'wallEntityAbsolute':
      return [constraint.entity]
    case 'wallEntityRelative':
      return [constraint.entityA, constraint.entityB]
    default:
      return []
  }
}

/**
 * Get GCS constraint ID for wall entity width constraint.
 * Only creates a constraint for the reference side (nonref is implied).
 */
export function wallEntityWidthConstraintId(entityId: WallEntityId): string {
  return `bc_we_${entityId}_width`
}
