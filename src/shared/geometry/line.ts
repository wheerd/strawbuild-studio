import { vec2 } from 'gl-matrix'

import type { Length } from './basic'
import { direction, perpendicularCCW, perpendicularCW } from './basic'

// Line-related types
export interface Line2D {
  point: vec2
  direction: vec2 // Normalized direction vector
}

export interface LineSegment2D {
  start: vec2
  end: vec2
}

// Line operations
export function lineIntersection(line1: Line2D, line2: Line2D): vec2 | null {
  const { point: p1, direction: d1 } = line1
  const { point: p2, direction: d2 } = line2

  // Check if lines are parallel (cross product of directions is zero)
  const cross = d1[0] * d2[1] - d1[1] * d2[0]
  if (Math.abs(cross) < 1e-10) {
    return null // Lines are parallel
  }

  // Calculate intersection using parametric form
  const dp = vec2.subtract(vec2.create(), p2, p1)
  const t1 = (dp[0] * d2[1] - dp[1] * d2[0]) / cross

  return vec2.scaleAndAdd(vec2.create(), p1, d1, t1)
}

export function lineFromPoints(p1: vec2, p2: vec2): Line2D | null {
  const direction = vec2.subtract(vec2.create(), p2, p1)
  const length = vec2.length(direction)

  if (length === 0) return null

  return {
    point: vec2.copy(vec2.create(), p1),
    direction: vec2.normalize(vec2.create(), direction)
  }
}

export function distanceToInfiniteLine(point: vec2, line: Line2D): Length {
  const toPoint = vec2.subtract(vec2.create(), point, line.point)
  const crossProduct = Math.abs(toPoint[0] * line.direction[1] - toPoint[1] * line.direction[0])
  return crossProduct
}

export function projectPointOntoLine(point: vec2, line: Line2D): vec2 {
  const toPoint = vec2.subtract(vec2.create(), point, line.point)
  const projection = vec2.dot(toPoint, line.direction)

  return vec2.scaleAndAdd(vec2.create(), line.point, line.direction, projection)
}

export function lineFromSegment(segment: LineSegment2D): Line2D {
  return {
    point: vec2.copy(vec2.create(), segment.start),
    direction: direction(segment.start, segment.end)
  }
}

export function distanceToLineSegment(point: vec2, line: LineSegment2D): Length {
  const lineVector = vec2.subtract(vec2.create(), line.end, line.start)
  const pointVector = vec2.subtract(vec2.create(), point, line.start)

  const lineLengthSquared = vec2.squaredLength(lineVector)

  if (lineLengthSquared === 0) {
    // Line segment is actually a point
    return vec2.distance(point, line.start)
  }

  // Calculate parameter t that represents position along the segment
  let t = vec2.dot(pointVector, lineVector) / lineLengthSquared

  // Clamp t to vec2.fromValues(0, 1) to stay within the segment
  t = Math.max(0, Math.min(1, t))

  // Find the closest point on the segment
  const closest = vec2.create()
  vec2.scaleAndAdd(closest, line.start, lineVector, t)

  // Return distance from point to closest point on segment
  return vec2.distance(point, closest)
}

/**
 * Given a direction d and a set of points,
 * compute two parallel offset line segments with the given direction d
 * so that all the points lie between those two line segments
 */
export function computeBoundsLines(d: vec2, points: vec2[]): { left: LineSegment2D; right: LineSegment2D } {
  const A = points[0]
  const n1 = perpendicularCCW(d)
  const n2 = perpendicularCW(d)

  // Compute max signed distance of plan points relative to line through A
  let maxOffset1 = 0
  let maxOffset2 = 0
  for (const p of points) {
    const ap = vec2.create()
    vec2.sub(ap, p, A)
    const dist1 = vec2.dot(n1, ap) // signed offset along n1
    if (dist1 > maxOffset1) {
      maxOffset1 = dist1
    }
    const dist2 = vec2.dot(n2, ap) // signed offset along n2
    if (dist2 > maxOffset2) {
      maxOffset2 = dist2
    }
  }

  const leftOrigin = vec2.create()
  vec2.scaleAndAdd(leftOrigin, A, n1, maxOffset1)
  const rightOrigin = vec2.create()
  vec2.scaleAndAdd(rightOrigin, A, n2, maxOffset2)

  // Find min and max projections along the direction to create line segments
  let minProjection = Infinity
  let maxProjection = -Infinity

  for (const p of points) {
    const projection = vec2.dot(vec2.subtract(vec2.create(), p, A), d)
    if (projection < minProjection) {
      minProjection = projection
    }
    if (projection > maxProjection) {
      maxProjection = projection
    }
  }

  // Create line segments with proper start and end points
  const leftStart = vec2.create()
  vec2.scaleAndAdd(leftStart, leftOrigin, d, minProjection)
  const leftEnd = vec2.create()
  vec2.scaleAndAdd(leftEnd, leftOrigin, d, maxProjection)

  const rightStart = vec2.create()
  vec2.scaleAndAdd(rightStart, rightOrigin, d, minProjection)
  const rightEnd = vec2.create()
  vec2.scaleAndAdd(rightEnd, rightOrigin, d, maxProjection)

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
