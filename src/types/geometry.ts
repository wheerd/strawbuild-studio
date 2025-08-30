// Branded numeric types for type safety
export type AbsoluteOffset = number & { __brand: 'AbsoluteOffset' }
export type Length = number & { __brand: 'Length' }
export type Area = number & { __brand: 'Area' }
export type Angle = number & { __brand: 'Angle' }

// Helper functions to create branded types
export const createAbsoluteOffset = (value: number): AbsoluteOffset => value as AbsoluteOffset
export const createLength = (value: number): Length => value as Length
export const createArea = (value: number): Area => value as Area
export const createAngle = (value: number): Angle => value as Angle

// Helper function to create Point2D from two numbers
export const createPoint2D = (x: number, y: number): Point2D => ({
  x: createAbsoluteOffset(x),
  y: createAbsoluteOffset(y)
})

// Helper function to create Vector2D from two numbers
export const createVector2D = (x: number, y: number): Vector2D => ({
  x: createLength(x),
  y: createLength(y)
})

// Core geometric types
export interface Point2D {
  x: AbsoluteOffset
  y: AbsoluteOffset
}

export interface Vector2D {
  x: Length
  y: Length
}

export interface Bounds2D {
  minX: AbsoluteOffset
  minY: AbsoluteOffset
  maxX: AbsoluteOffset
  maxY: AbsoluteOffset
}

export interface Polygon2D {
  points: Point2D[]
}

export interface PolygonWithHoles2D {
  outer: Polygon2D
  holes: Polygon2D[]
}

// Geometry utility functions
export function distance(p1: Point2D, p2: Point2D): Length {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return createLength(Math.sqrt(dx * dx + dy * dy))
}

export function distanceSquared(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return dx * dx + dy * dy
}

export function midpoint(p1: Point2D, p2: Point2D): Point2D {
  return createPoint2D((p1.x + p2.x) / 2, (p1.y + p2.y) / 2)
}

export function angle(from: Point2D, to: Point2D): Angle {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return createAngle(Math.atan2(dy, dx))
}

export function normalizeAngle(angle: Angle): Angle {
  let normalized = Number(angle)
  while (normalized > Math.PI) normalized -= 2 * Math.PI
  while (normalized < -Math.PI) normalized += 2 * Math.PI
  return createAngle(normalized)
}

export function pointOnLine(start: Point2D, end: Point2D, t: number): Point2D {
  return createPoint2D(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t)
}

export function vectorFromAngle(angle: Angle, length: Length = createLength(1)): Vector2D {
  return {
    x: createLength(Math.cos(angle) * length),
    y: createLength(Math.sin(angle) * length)
  }
}

export function addVector(point: Point2D, vector: Vector2D): Point2D {
  return createPoint2D(point.x + vector.x, point.y + vector.y)
}

export function direction(source: Point2D, target: Point2D): Vector2D {
  return createVector2D(target.x - source.x, target.y - source.y)
}

export function normalizeVector(vector: Vector2D): Vector2D {
  const len = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
  if (len === 0) return createVector2D(0, 0)
  return createVector2D(vector.x / len, vector.y / len)
}

export function snapToGrid(point: Point2D, gridSize: Length): Point2D {
  return createPoint2D(Math.round(point.x / gridSize) * gridSize, Math.round(point.y / gridSize) * gridSize)
}

export function expandBounds(bounds: Bounds2D, padding: Length): Bounds2D {
  return {
    minX: createAbsoluteOffset(bounds.minX - padding),
    minY: createAbsoluteOffset(bounds.minY - padding),
    maxX: createAbsoluteOffset(bounds.maxX + padding),
    maxY: createAbsoluteOffset(bounds.maxY + padding)
  }
}

export function pointInBounds(point: Point2D, bounds: Bounds2D): boolean {
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY
}

export function boundsFromPoints(points: Point2D[]): Bounds2D | null {
  if (points.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return {
    minX: createAbsoluteOffset(minX),
    minY: createAbsoluteOffset(minY),
    maxX: createAbsoluteOffset(maxX),
    maxY: createAbsoluteOffset(maxY)
  }
}

export function isPointNearLine(
  point: Point2D,
  lineStart: Point2D,
  lineEnd: Point2D,
  tolerance: Length = createLength(5)
): boolean {
  const A = point.x - lineStart.x
  const B = point.y - lineStart.y
  const C = lineEnd.x - lineStart.x
  const D = lineEnd.y - lineStart.y

  const dot = A * C + B * D
  const lenSq = C * C + D * D

  if (lenSq === 0) return distance(point, lineStart) <= tolerance

  const param = dot / lenSq

  let closestPoint: Point2D

  if (param < 0) {
    closestPoint = lineStart
  } else if (param > 1) {
    closestPoint = lineEnd
  } else {
    closestPoint = {
      x: createAbsoluteOffset(lineStart.x + param * C),
      y: createAbsoluteOffset(lineStart.y + param * D)
    }
  }

  return distance(point, closestPoint) <= tolerance
}

export function offsetToPosition(startPoint: Point2D, endPoint: Point2D, offset: Length): Point2D {
  const dx = endPoint.x - startPoint.x
  const dy = endPoint.y - startPoint.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return startPoint

  const t = offset / length

  return {
    x: createAbsoluteOffset(startPoint.x + dx * t),
    y: createAbsoluteOffset(startPoint.y + dy * t)
  }
}

// Formatting utilities
export function formatLength(length: Length, unit: 'mm' | 'cm' | 'm' = 'm'): string {
  switch (unit) {
    case 'mm':
      return `${length.toFixed(0)}mm`
    case 'cm':
      return `${(length / 10).toFixed(1)}cm`
    case 'm':
      return `${(length / 1000).toFixed(2)}m`
    default:
      return `${length.toFixed(0)}`
  }
}

export function formatArea(area: Area, unit: 'mm²' | 'cm²' | 'm²' = 'm²'): string {
  switch (unit) {
    case 'mm²':
      return `${area.toFixed(0)}mm²`
    case 'cm²':
      return `${(area / 100).toFixed(1)}cm²`
    case 'm²':
      return `${(area / 1000000).toFixed(2)}m²`
    default:
      return `${area.toFixed(0)}`
  }
}

// Polygon utilities
export function calculatePolygonArea(polygon: Polygon2D): Area {
  const points = polygon.points
  if (points.length < 3) return createArea(0)

  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }

  return createArea(Math.abs(area) / 2)
}

export function calculatePolygonWithHolesArea(polygon: PolygonWithHoles2D): Area {
  let totalArea = calculatePolygonArea(polygon.outer)

  for (const hole of polygon.holes) {
    totalArea = createArea(totalArea - calculatePolygonArea(hole))
  }

  return totalArea
}

// Corner angle calculation utilities
export function calculateCornerAngle(wall1Start: Point2D, cornerPoint: Point2D, wall2End: Point2D): Angle {
  // Vector from corner to wall1 start
  const vec1 = {
    x: wall1Start.x - cornerPoint.x,
    y: wall1Start.y - cornerPoint.y
  }

  // Vector from corner to wall2 end
  const vec2 = {
    x: wall2End.x - cornerPoint.x,
    y: wall2End.y - cornerPoint.y
  }

  // Calculate angle between vectors using dot product
  const dot = vec1.x * vec2.x + vec1.y * vec2.y
  const mag1 = Math.sqrt(vec1.x * vec1.x + vec1.y * vec1.y)
  const mag2 = Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y)

  if (mag1 === 0 || mag2 === 0) return createAngle(0)

  const cosAngle = dot / (mag1 * mag2)
  // Clamp to prevent NaN from floating point precision issues
  const clampedCos = Math.max(-1, Math.min(1, cosAngle))
  const angleRad = Math.acos(clampedCos)

  return createAngle(angleRad)
}

export function determineCornerType(wallCount: number, angle: Angle): 'corner' | 'straight' | 'tee' | 'cross' {
  const angleInRadians = Number(angle)
  // Use a very small tolerance to handle only floating point precision errors
  const tolerance = 1e-10 // ~0.0000000057 degrees

  if (wallCount === 2) {
    // Check if angle is very close to π (180 degrees)
    if (Math.abs(angleInRadians - Math.PI) < tolerance) {
      return 'straight'
    }
    return 'corner'
  } else if (wallCount === 3) {
    return 'tee'
  } else if (wallCount > 3) {
    return 'cross'
  }

  return 'corner'
}

export function radiansToDegrees(angle: Angle): number {
  return (Number(angle) * 180) / Math.PI
}

export function degreesToRadians(degrees: number): Angle {
  return createAngle((degrees * Math.PI) / 180)
}

// Line representation for intersection calculations
export interface Line2D {
  point: Point2D
  direction: Vector2D // Normalized direction vector
}

export interface LineSegment2D {
  start: Point2D
  end: Point2D
}

// Calculate intersection of two infinite lines
export function lineIntersection(line1: Line2D, line2: Line2D): Point2D | null {
  const { point: p1, direction: d1 } = line1
  const { point: p2, direction: d2 } = line2

  // Check if lines are parallel (cross product of directions is zero)
  const cross = Number(d1.x) * Number(d2.y) - Number(d1.y) * Number(d2.x)
  if (Math.abs(cross) < 1e-10) {
    return null // Lines are parallel
  }

  // Calculate intersection using parametric form
  // Line1: p1 + t1 * d1
  // Line2: p2 + t2 * d2
  const dp = createVector2D(Number(p2.x) - Number(p1.x), Number(p2.y) - Number(p1.y))
  const t1 = (Number(dp.x) * Number(d2.y) - Number(dp.y) * Number(d2.x)) / cross

  return createPoint2D(Number(p1.x) + t1 * Number(d1.x), Number(p1.y) + t1 * Number(d1.y))
}

// Create a line from two points
export function lineFromPoints(p1: Point2D, p2: Point2D): Line2D | null {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return null

  return {
    point: p1,
    direction: createVector2D(dx / length, dy / length)
  }
}

// Create a line from a point and angle
export function lineFromPointAndAngle(point: Point2D, angle: Angle): Line2D {
  return {
    point,
    direction: createVector2D(Math.cos(angle), Math.sin(angle))
  }
}

// Distance from point to infinite line
export function distanceToInfiniteLine(point: Point2D, line: Line2D): Length {
  // Vector from line point to target point
  const dx = point.x - line.point.x
  const dy = point.y - line.point.y

  // Calculate perpendicular distance using cross product
  const crossProduct = Math.abs(dx * line.direction.y - dy * line.direction.x)
  return createLength(crossProduct)
}

// Project a point onto a line (returns closest point on the line)
export function projectPointOntoLine(point: Point2D, line: Line2D): Point2D {
  // Vector from line point to target point
  const toPoint = createVector2D(point.x - line.point.x, point.y - line.point.y)

  // Project toPoint onto line direction
  const projection = Number(toPoint.x) * Number(line.direction.x) + Number(toPoint.y) * Number(line.direction.y)

  return createPoint2D(
    Number(line.point.x) + projection * Number(line.direction.x),
    Number(line.point.y) + projection * Number(line.direction.y)
  )
}

export function lineFromSegment(segment: LineSegment2D): Line2D {
  return {
    point: segment.start,
    direction: normalizeVector(createVector2D(segment.end.x - segment.start.x, segment.end.y - segment.start.y))
  }
}

export function isPointInPolygon(point: Point2D, polygon: Polygon2D): boolean {
  const { points } = polygon
  let inside = false

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x
    const yi = points[i].y
    const xj = points[j].x
    const yj = points[j].y

    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 1e-10) + xi
    if (intersect) inside = !inside
  }

  return inside
}

export function polygonIsClockwise(polygon: Polygon2D): boolean {
  const { points } = polygon
  let sum = 0

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    sum += (points[j].x - points[i].x) * (points[j].y + points[i].y)
  }

  return sum > 0
}

// Calculate the shortest distance from a point to a line segment
export function distanceToLineSegment(point: Point2D, segment: LineSegment2D): Length {
  const dx = segment.end.x - segment.start.x
  const dy = segment.end.y - segment.start.y

  if (dx === 0 && dy === 0) {
    // Line segment is actually a point
    return distance(point, segment.start)
  }

  const lengthSquared = dx * dx + dy * dy

  // Calculate parameter t that represents position along the line segment
  // t = 0 means segment.start, t = 1 means segment.end
  let t = ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lengthSquared

  // Clamp t to [0, 1] to stay within the line segment
  t = Math.max(0, Math.min(1, t))

  // Find the closest point on the line segment
  const closest = createPoint2D(segment.start.x + t * dx, segment.start.y + t * dy)

  // Return distance from point to closest point on line segment
  return distance(point, closest)
}
