import type {
  Constraint as BuildingConstraint,
  PerimeterCornerWithGeometry,
  PerimeterReferenceSide,
  PerimeterWallWithGeometry
} from '@/building/model'
import type { Length, Vec2 } from '@/shared/geometry'
import { dotVec2, normVec2, subVec2 } from '@/shared/geometry'

/**
 * Map a perimeter reference side to the constraint side used by building constraints.
 *
 * For clockwise perimeters: 'inside' → 'right', 'outside' → 'left'.
 */
export function referenceSideToConstraintSide(referenceSide: PerimeterReferenceSide): 'left' | 'right' {
  return referenceSide === 'inside' ? 'right' : 'left'
}

/**
 * Get the reference-side point for a corner.
 */
function getReferenceSidePoint(corner: PerimeterCornerWithGeometry, referenceSide: PerimeterReferenceSide): Vec2 {
  return referenceSide === 'inside' ? corner.insidePoint : corner.outsidePoint
}

/**
 * Get the reference-side length for a wall.
 */
function getReferenceSideLength(wall: PerimeterWallWithGeometry, referenceSide: PerimeterReferenceSide): Length {
  return referenceSide === 'inside' ? wall.insideLength : wall.outsideLength
}

/**
 * Generate building constraints for a preset (axis-aligned) perimeter.
 *
 * Produces:
 * - A distance constraint for every wall (using the reference-side length)
 * - Horizontal/vertical constraints for consecutive corner pairs where the
 *   reference-side points are exactly aligned on one axis
 *
 * No perpendicular constraints are generated because H/V constraints already
 * fully determine the angles for axis-aligned geometry.
 */
export function generatePresetConstraints(
  corners: PerimeterCornerWithGeometry[],
  walls: PerimeterWallWithGeometry[],
  referenceSide: PerimeterReferenceSide
): BuildingConstraint[] {
  const side = referenceSideToConstraintSide(referenceSide)
  const constraints: BuildingConstraint[] = []
  const n = corners.length

  // Distance constraint for each wall
  for (const wall of walls) {
    const length = getReferenceSideLength(wall, referenceSide)
    constraints.push({
      type: 'distance',
      side,
      nodeA: wall.startCornerId,
      nodeB: wall.endCornerId,
      length
    })
  }

  // Horizontal/vertical constraints for consecutive corner pairs
  for (let i = 0; i < n; i++) {
    const cornerA = corners[i]
    const cornerB = corners[(i + 1) % n]
    const pA = getReferenceSidePoint(cornerA, referenceSide)
    const pB = getReferenceSidePoint(cornerB, referenceSide)

    // Exact equality check — preset geometry is precise
    if (pA[1] === pB[1]) {
      constraints.push({
        type: 'horizontal',
        nodeA: cornerA.id,
        nodeB: cornerB.id
      })
    } else if (pA[0] === pB[0]) {
      constraints.push({
        type: 'vertical',
        nodeA: cornerA.id,
        nodeB: cornerB.id
      })
    }
  }

  console.log(constraints)

  return constraints
}

/** Tolerance for "close enough" alignment checks in freeform mode (1mm). */
const ALIGNMENT_TOLERANCE = 1

/** Tolerance for perpendicularity check (dot product of directions). */
const PERPENDICULAR_DOT_TOLERANCE = 0.001

/** Threshold for colinearity check (dot product of consecutive normalized directions ≈ 1.0). */
const COLINEAR_DOT_THRESHOLD = 0.9999

/**
 * Generate building constraints for a freeform (user-drawn) perimeter.
 *
 * Produces:
 * - Distance constraints for walls where the user typed a length override
 * - Horizontal/vertical constraints for consecutive corner pairs whose
 *   reference-side points are aligned within a small tolerance
 * - Perpendicular constraints for adjacent wall pairs that meet at ~90°,
 *   but only when both walls don't already have H/V constraints
 * - Colinear constraints for 3 consecutive corners where the interior
 *   angle is ~180° (i.e. the middle corner is on the line between the others)
 */
export function generateFreeformConstraints(
  corners: PerimeterCornerWithGeometry[],
  walls: PerimeterWallWithGeometry[],
  referenceSide: PerimeterReferenceSide,
  segmentLengthOverrides: (Length | null)[]
): BuildingConstraint[] {
  const side = referenceSideToConstraintSide(referenceSide)
  const constraints: BuildingConstraint[] = []
  const n = corners.length

  // Track which wall indices have H/V constraints on their endpoints
  // (wall i goes from corners[i] to corners[(i+1)%n])
  const wallHasHV = new Set<number>()

  // --- Distance constraints for overridden segments ---
  for (let i = 0; i < walls.length; i++) {
    const override = segmentLengthOverrides[i]
    if (override != null) {
      constraints.push({
        type: 'distance',
        side,
        nodeA: walls[i].startCornerId,
        nodeB: walls[i].endCornerId,
        length: override
      })
    }
  }

  // --- Horizontal/vertical constraints for aligned consecutive corners ---
  for (let i = 0; i < n; i++) {
    const cornerA = corners[i]
    const cornerB = corners[(i + 1) % n]
    const pA = getReferenceSidePoint(cornerA, referenceSide)
    const pB = getReferenceSidePoint(cornerB, referenceSide)

    const dy = Math.abs(pA[1] - pB[1])
    const dx = Math.abs(pA[0] - pB[0])

    if (dy < ALIGNMENT_TOLERANCE) {
      constraints.push({
        type: 'horizontal',
        nodeA: cornerA.id,
        nodeB: cornerB.id
      })
      wallHasHV.add(i)
    } else if (dx < ALIGNMENT_TOLERANCE) {
      constraints.push({
        type: 'vertical',
        nodeA: cornerA.id,
        nodeB: cornerB.id
      })
      wallHasHV.add(i)
    }
  }

  // --- Perpendicular constraints for adjacent ~90° wall pairs ---
  for (let i = 0; i < n; i++) {
    const nextIdx = (i + 1) % n
    const wallA = walls[i]
    const wallB = walls[nextIdx]

    // Skip if both walls already have H/V constraints
    if (wallHasHV.has(i) && wallHasHV.has(nextIdx)) {
      continue
    }

    const dot = Math.abs(dotVec2(wallA.direction, wallB.direction))
    if (dot < PERPENDICULAR_DOT_TOLERANCE) {
      constraints.push({
        type: 'perpendicular',
        wallA: wallA.id,
        wallB: wallB.id
      })
    }
  }

  // --- Colinear constraints for ~180° interior angles ---
  for (let i = 0; i < n; i++) {
    const prevIdx = (i - 1 + n) % n
    const nextIdx = (i + 1) % n

    const cornerA = corners[prevIdx]
    const cornerB = corners[i]
    const cornerC = corners[nextIdx]

    const pA = getReferenceSidePoint(cornerA, referenceSide)
    const pB = getReferenceSidePoint(cornerB, referenceSide)
    const pC = getReferenceSidePoint(cornerC, referenceSide)

    const abDir = normVec2(subVec2(pB, pA))
    const bcDir = normVec2(subVec2(pC, pB))
    const dot = dotVec2(abDir, bcDir)

    if (dot >= COLINEAR_DOT_THRESHOLD) {
      constraints.push({
        type: 'colinear',
        nodeA: cornerA.id,
        nodeB: cornerB.id,
        nodeC: cornerC.id,
        side
      })
    }
  }

  return constraints
}
