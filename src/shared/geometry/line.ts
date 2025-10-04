import { vec2 } from 'gl-matrix'

import type { Length, Vec2 } from './basic'
import { createLength, distance, dot, normalize, perpendicularCCW, perpendicularCW, subtract } from './basic'

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
  const dp = subtract(p2, p1)
  const t1 = (dp[0] * d2[1] - dp[1] * d2[0]) / cross

  const result = vec2.create()
  vec2.scaleAndAdd(result, p1, d1, t1)
  return result
}

export function lineFromPoints(p1: Vec2, p2: Vec2): Line2D | null {
  const direction = subtract(p2, p1)
  const length = vec2.length(direction)

  if (length === 0) return null

  return {
    point: vec2.copy(vec2.create(), p1),
    direction: normalize(direction)
  }
}

export function distanceToInfiniteLine(point: Vec2, line: Line2D): Length {
  const toPoint = subtract(point, line.point)
  const crossProduct = Math.abs(toPoint[0] * line.direction[1] - toPoint[1] * line.direction[0])
  return createLength(crossProduct)
}

export function projectPointOntoLine(point: Vec2, line: Line2D): Vec2 {
  const toPoint = subtract(point, line.point)
  const projection = dot(toPoint, line.direction)

  const result = vec2.create()
  vec2.scaleAndAdd(result, line.point, line.direction, projection)
  return result
}

export function lineFromSegment(segment: LineSegment2D): Line2D {
  return {
    point: vec2.copy(vec2.create(), segment.start),
    direction: normalize(subtract(segment.end, segment.start))
  }
}

export function distanceToLineSegment(point: Vec2, line: LineSegment2D): Length {
  const lineVector = subtract(line.end, line.start)
  const pointVector = subtract(point, line.start)

  const lineLengthSquared = vec2.squaredLength(lineVector)

  if (lineLengthSquared === 0) {
    // Line segment is actually a point
    return distance(point, line.start)
  }

  // Calculate parameter t that represents position along the segment
  let t = dot(pointVector, lineVector) / lineLengthSquared

  // Clamp t to [0, 1] to stay within the segment
  t = Math.max(0, Math.min(1, t))

  // Find the closest point on the segment
  const closest = vec2.create()
  vec2.scaleAndAdd(closest, line.start, lineVector, t)

  // Return distance from point to closest point on segment
  return distance(point, closest)
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
    const projection = dot(subtract(p, A), d)
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
