import type { Length, Vec2 } from './basic'
import {
  copyVec2,
  direction,
  distVec2,
  dotVec2,
  lenSqrVec2,
  lenVec2,
  normVec2,
  perpendicularCCW,
  perpendicularCW,
  projectVec2,
  scaleAddVec2,
  subVec2
} from './basic'

// Line-related types
export interface Line2D {
  point: Vec2
  direction: Vec2 // Normalized direction vector
}

export interface LineSegment2D {
  start: Vec2
  end: Vec2
}

// Line operations
export function lineIntersection(line1: Line2D, line2: Line2D): Vec2 | null {
  const { point: p1, direction: d1 } = line1
  const { point: p2, direction: d2 } = line2

  // Check if lines are parallel (cross product of directions is zero)
  const cross = d1[0] * d2[1] - d1[1] * d2[0]
  if (Math.abs(cross) < 1e-10) {
    return null // Lines are parallel
  }

  // Calculate intersection using parametric form
  const dp = subVec2(p2, p1)
  const t1 = (dp[0] * d2[1] - dp[1] * d2[0]) / cross

  return scaleAddVec2(p1, d1, t1)
}

export function lineFromPoints(p1: Vec2, p2: Vec2): Line2D | null {
  const direction = subVec2(p2, p1)
  const length = lenVec2(direction)

  if (length === 0) return null

  return {
    point: copyVec2(p1),
    direction: normVec2(direction)
  }
}

export function distanceToInfiniteLine(point: Vec2, line: Line2D): Length {
  const toPoint = subVec2(point, line.point)
  const crossProduct = Math.abs(toPoint[0] * line.direction[1] - toPoint[1] * line.direction[0])
  return crossProduct
}

export function projectPointOntoLine(point: Vec2, line: Line2D): Vec2 {
  const toPoint = subVec2(point, line.point)
  const projection = dotVec2(toPoint, line.direction)

  return scaleAddVec2(line.point, line.direction, projection)
}

export function lineFromSegment(segment: LineSegment2D): Line2D {
  return {
    point: copyVec2(segment.start),
    direction: direction(segment.start, segment.end)
  }
}

export function distanceToLineSegment(point: Vec2, line: LineSegment2D): Length {
  const lineVector = subVec2(line.end, line.start)
  const pointVector = subVec2(point, line.start)

  const lineLengthSquared = lenSqrVec2(lineVector)

  if (lineLengthSquared === 0) {
    // Line segment is actually a point
    return distVec2(point, line.start)
  }

  // Calculate parameter t that represents position along the segment
  let t = dotVec2(pointVector, lineVector) / lineLengthSquared

  // Clamp t to newVec2(0, 1) to stay within the segment
  t = Math.max(0, Math.min(1, t))

  // Find the closest point on the segment
  const closest = scaleAddVec2(line.start, lineVector, t)

  // Return distance from point to closest point on segment
  return distVec2(point, closest)
}

/**
 * Given a direction d and a set of points,
 * compute two parallel offset line segments with the given direction d
 * so that all the points lie between those two line segments
 */
export function computeBoundsLines(d: Vec2, points: Vec2[]): { left: LineSegment2D; right: LineSegment2D } {
  const A = points[0]
  const n1 = perpendicularCCW(d)
  const n2 = perpendicularCW(d)

  // Compute max signed distance of plan points relative to line through A
  let maxOffset1 = 0
  let maxOffset2 = 0
  for (const p of points) {
    const ap = subVec2(p, A)
    const dist1 = dotVec2(n1, ap) // signed offset along n1
    if (dist1 > maxOffset1) {
      maxOffset1 = dist1
    }
    const dist2 = dotVec2(n2, ap) // signed offset along n2
    if (dist2 > maxOffset2) {
      maxOffset2 = dist2
    }
  }

  const leftOrigin = scaleAddVec2(A, n1, maxOffset1)
  const rightOrigin = scaleAddVec2(A, n2, maxOffset2)

  // Find min and max projections along the direction to create line segments
  let minProjection = Infinity
  let maxProjection = -Infinity

  for (const p of points) {
    const projection = projectVec2(A, p, d)
    if (projection < minProjection) {
      minProjection = projection
    }
    if (projection > maxProjection) {
      maxProjection = projection
    }
  }

  // Create line segments with proper start and end points
  const leftStart = scaleAddVec2(leftOrigin, d, minProjection)
  const leftEnd = scaleAddVec2(leftOrigin, d, maxProjection)

  const rightStart = scaleAddVec2(rightOrigin, d, minProjection)
  const rightEnd = scaleAddVec2(rightOrigin, d, maxProjection)

  return {
    left: {
      start: leftStart,
      end: leftEnd
    },
    right: {
      start: rightStart,
      end: rightEnd
    }
  }
}

export function offsetLine(line: Line2D, offset: Length): Line2D {
  return {
    point: scaleAddVec2(line.point, perpendicularCW(line.direction), offset),
    direction: line.direction
  }
}
