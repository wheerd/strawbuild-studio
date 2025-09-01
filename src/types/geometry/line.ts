import { vec2 } from 'gl-matrix'
import type { Vec2, Length } from './basic'
import { createLength, subtract, normalize, dot, distance } from './basic'

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

export function distanceToLineSegment(point: Vec2, segment: LineSegment2D): Length {
  const segmentVector = subtract(segment.end, segment.start)
  const pointVector = subtract(point, segment.start)

  const segmentLengthSquared = vec2.squaredLength(segmentVector)

  if (segmentLengthSquared === 0) {
    // Line segment is actually a point
    return distance(point, segment.start)
  }

  // Calculate parameter t that represents position along the line segment
  let t = dot(pointVector, segmentVector) / segmentLengthSquared

  // Clamp t to [0, 1] to stay within the line segment
  t = Math.max(0, Math.min(1, t))

  // Find the closest point on the line segment
  const closest = vec2.create()
  vec2.scaleAndAdd(closest, segment.start, segmentVector, t)

  // Return distance from point to closest point on line segment
  return distance(point, closest)
}
