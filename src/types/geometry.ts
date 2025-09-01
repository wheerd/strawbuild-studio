// gl-matrix integration for high-performance vector operations
import { vec2, mat2d } from 'gl-matrix'

// Turf.js integration for robust polygon operations
import { polygon as turfPolygon, lineString as turfLineString } from '@turf/helpers'
import { kinks } from '@turf/kinks'
import { booleanValid } from '@turf/boolean-valid'
import { lineIntersect } from '@turf/line-intersect'
import type { Feature, Polygon as GeoJSONPolygon, LineString } from 'geojson'

// Core types - simplified with gl-matrix
export type Vec2 = vec2
export type Matrix2D = mat2d

// Branded numeric types for type safety (keep these for domain specificity)
export type Length = number & { __brand: 'Length' }
export type Area = number & { __brand: 'Area' }
export type Angle = number & { __brand: 'Angle' }

// Helper functions to create branded types
export const createLength = (value: number): Length => value as Length
export const createArea = (value: number): Area => value as Area
export const createAngle = (value: number): Angle => value as Angle

// Helper function to create Vec2
export const createVec2 = (x: number, y: number): Vec2 => vec2.fromValues(x, y)

// Core geometric types - simplified
export interface Polygon2D {
  points: Vec2[]
}

export interface PolygonWithHoles2D {
  outer: Polygon2D
  holes: Polygon2D[]
}

export interface Bounds2D {
  min: Vec2
  max: Vec2
}

export interface Line2D {
  point: Vec2
  direction: Vec2 // Normalized direction vector
}

export interface LineSegment2D {
  start: Vec2
  end: Vec2
}

// Geometry utility functions - powered by gl-matrix
export function distance(p1: Vec2, p2: Vec2): Length {
  return createLength(vec2.distance(p1, p2))
}

export function distanceSquared(p1: Vec2, p2: Vec2): number {
  return vec2.squaredDistance(p1, p2)
}

export function midpoint(p1: Vec2, p2: Vec2): Vec2 {
  const result = vec2.create()
  vec2.lerp(result, p1, p2, 0.5)
  return result
}

export function angle(from: Vec2, to: Vec2): Angle {
  const direction = vec2.create()
  vec2.subtract(direction, to, from)
  return createAngle(Math.atan2(direction[1], direction[0]))
}

export function normalizeAngle(angle: Angle): Angle {
  let normalized = Number(angle)
  while (normalized > Math.PI) normalized -= 2 * Math.PI
  while (normalized < -Math.PI) normalized += 2 * Math.PI
  return createAngle(normalized)
}

export function pointOnLine(start: Vec2, end: Vec2, t: number): Vec2 {
  const result = vec2.create()
  vec2.lerp(result, start, end, t)
  return result
}

export function vectorFromAngle(angle: Angle, length: Length = createLength(1)): Vec2 {
  return vec2.fromValues(Math.cos(angle) * length, Math.sin(angle) * length)
}

export function add(a: Vec2, b: Vec2): Vec2 {
  const result = vec2.create()
  vec2.add(result, a, b)
  return result
}

export function subtract(a: Vec2, b: Vec2): Vec2 {
  const result = vec2.create()
  vec2.subtract(result, a, b)
  return result
}

export function scale(v: Vec2, scalar: number): Vec2 {
  const result = vec2.create()
  vec2.scale(result, v, scalar)
  return result
}

export function normalize(v: Vec2): Vec2 {
  const result = vec2.create()
  vec2.normalize(result, v)
  return result
}

export function dot(a: Vec2, b: Vec2): number {
  return vec2.dot(a, b)
}

export function direction(source: Vec2, target: Vec2): Vec2 {
  return normalize(subtract(target, source))
}

export function addVector(point: Vec2, vector: Vec2): Vec2 {
  return add(point, vector)
}

export function normalizeVector(vector: Vec2): Vec2 {
  return normalize(vector)
}

export function snapToGrid(point: Vec2, gridSize: Length): Vec2 {
  return createVec2(Math.round(point[0] / gridSize) * gridSize, Math.round(point[1] / gridSize) * gridSize)
}

export function expandBounds(bounds: Bounds2D, padding: Length): Bounds2D {
  return {
    min: createVec2(bounds.min[0] - padding, bounds.min[1] - padding),
    max: createVec2(bounds.max[0] + padding, bounds.max[1] + padding)
  }
}

export function pointInBounds(point: Vec2, bounds: Bounds2D): boolean {
  return (
    point[0] >= bounds.min[0] && point[0] <= bounds.max[0] && point[1] >= bounds.min[1] && point[1] <= bounds.max[1]
  )
}

export function boundsFromPoints(points: Vec2[]): Bounds2D | null {
  if (points.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point[0])
    minY = Math.min(minY, point[1])
    maxX = Math.max(maxX, point[0])
    maxY = Math.max(maxY, point[1])
  }

  return {
    min: createVec2(minX, minY),
    max: createVec2(maxX, maxY)
  }
}

export function isPointNearLine(
  point: Vec2,
  lineStart: Vec2,
  lineEnd: Vec2,
  tolerance: Length = createLength(5)
): boolean {
  const distToLine = distanceToLineSegment(point, { start: lineStart, end: lineEnd })
  return distToLine <= tolerance
}

export function offsetToPosition(startPoint: Vec2, endPoint: Vec2, offset: Length): Vec2 {
  const dir = subtract(endPoint, startPoint)
  const length = vec2.length(dir)

  if (length === 0) return vec2.copy(vec2.create(), startPoint)

  const t = offset / length
  return pointOnLine(startPoint, endPoint, t)
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
    area += points[i][0] * points[j][1]
    area -= points[j][0] * points[i][1]
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
export function calculateCornerAngle(wall1Start: Vec2, cornerPoint: Vec2, wall2End: Vec2): Angle {
  // Vector from corner to wall1 start
  const vec1 = subtract(wall1Start, cornerPoint)
  // Vector from corner to wall2 end
  const vector2 = subtract(wall2End, cornerPoint)

  // Calculate angle between vectors using dot product
  const dotProduct = dot(vec1, vector2)
  const mag1 = vec2.length(vec1)
  const mag2 = vec2.length(vector2)

  if (mag1 === 0 || mag2 === 0) return createAngle(0)

  const cosAngle = dotProduct / (mag1 * mag2)
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

// Advanced gl-matrix operations
export function rotatePoint(point: Vec2, angle: Angle): Vec2 {
  const result = vec2.create()
  vec2.rotate(result, point, vec2.create(), angle)
  return result
}

export function rotatePointAround(point: Vec2, center: Vec2, angle: Angle): Vec2 {
  const transform = mat2d.create()
  mat2d.translate(transform, transform, center)
  mat2d.rotate(transform, transform, angle)
  mat2d.translate(transform, transform, vec2.negate(vec2.create(), center))

  const result = vec2.create()
  vec2.transformMat2d(result, point, transform)
  return result
}

export function scalePointFrom(point: Vec2, origin: Vec2, scale: number): Vec2 {
  const transform = mat2d.create()
  mat2d.translate(transform, transform, origin)
  mat2d.scale(transform, transform, vec2.fromValues(scale, scale))
  mat2d.translate(transform, transform, vec2.negate(vec2.create(), origin))

  const result = vec2.create()
  vec2.transformMat2d(result, point, transform)
  return result
}

export function perpendicularCCW(vector: Vec2): Vec2 {
  return createVec2(-vector[1], vector[0]) // Rotate 90° counterclockwise
}

export function perpendicularCW(vector: Vec2): Vec2 {
  return createVec2(vector[1], -vector[0]) // Rotate 90° clockwise
}

export function reflectVector(vector: Vec2, normal: Vec2): Vec2 {
  const result = vec2.create()
  // reflect = v - 2 * dot(v,n) * n
  const normalizedNormal = normalize(normal)
  const dotProduct = dot(vector, normalizedNormal)
  const reflection = scale(normalizedNormal, 2 * dotProduct)
  vec2.subtract(result, vector, reflection)
  return result
}

// Calculate intersection of two infinite lines
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

// Create a line from two points
export function lineFromPoints(p1: Vec2, p2: Vec2): Line2D | null {
  const direction = subtract(p2, p1)
  const length = vec2.length(direction)

  if (length === 0) return null

  return {
    point: vec2.copy(vec2.create(), p1),
    direction: normalize(direction)
  }
}

// Create a line from a point and angle
export function lineFromPointAndAngle(point: Vec2, angle: Angle): Line2D {
  return {
    point: vec2.copy(vec2.create(), point),
    direction: vectorFromAngle(angle)
  }
}

// Distance from point to infinite line
export function distanceToInfiniteLine(point: Vec2, line: Line2D): Length {
  const toPoint = subtract(point, line.point)
  const crossProduct = Math.abs(toPoint[0] * line.direction[1] - toPoint[1] * line.direction[0])
  return createLength(crossProduct)
}

// Project a point onto a line (returns closest point on the line)
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

export function isPointInPolygon(point: Vec2, polygon: Polygon2D): boolean {
  const points = polygon.points
  let inside = false

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0]
    const yi = points[i][1]
    const xj = points[j][0]
    const yj = points[j][1]

    const intersect =
      yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi + 1e-10) + xi
    if (intersect) inside = !inside
  }

  return inside
}

export function polygonIsClockwise(polygon: Polygon2D): boolean {
  const points = polygon.points
  let sum = 0

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    sum += (points[j][0] - points[i][0]) * (points[j][1] + points[i][1])
  }

  return sum > 0
}

// Calculate the shortest distance from a point to a line segment
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

// Conversion utilities between our types and GeoJSON
export function polygonToGeoJSON(polygon: Polygon2D): Feature<GeoJSONPolygon> {
  const coordinates = polygon.points.map(p => [p[0], p[1]])
  // Ensure the polygon is closed
  if (coordinates.length > 0) {
    const first = coordinates[0]
    const last = coordinates[coordinates.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coordinates.push([first[0], first[1]])
    }
  }
  return turfPolygon([coordinates])
}

export function pointsToGeoJSONPolygon(points: Vec2[]): Feature<GeoJSONPolygon> {
  const coordinates = points.map(p => [p[0], p[1]])
  // Ensure the polygon is closed
  if (coordinates.length > 0) {
    coordinates.push([coordinates[0][0], coordinates[0][1]])
  }
  return turfPolygon([coordinates])
}

export function lineSegmentToGeoJSON(segment: LineSegment2D): Feature<LineString> {
  return turfLineString([
    [segment.start[0], segment.start[1]],
    [segment.end[0], segment.end[1]]
  ])
}

// Check if two line segments intersect (using Turf.js)
export function doLineSegmentsIntersect(seg1: LineSegment2D, seg2: LineSegment2D): boolean {
  const line1 = lineSegmentToGeoJSON(seg1)
  const line2 = lineSegmentToGeoJSON(seg2)

  const intersections = lineIntersect(line1, line2)
  return intersections.features.length > 0
}

// Check if a point is already used in the polygon (with tolerance for floating point precision)
export function isPointAlreadyUsed(
  existingPoints: Vec2[],
  newPoint: Vec2,
  tolerance: Length = createLength(1e-6)
): boolean {
  return existingPoints.some(existingPoint => distance(existingPoint, newPoint) <= tolerance)
}

// Check if adding a new point to a polygon would create self-intersection or reuse existing points
export function wouldPolygonSelfIntersect(existingPoints: Vec2[], newPoint: Vec2): boolean {
  if (existingPoints.length < 2) return false

  // Check if the new point is already used (this counts as invalid)
  if (isPointAlreadyUsed(existingPoints, newPoint)) {
    return true
  }

  // The new line segment would be from the last existing point to the new point
  const newSegment: LineSegment2D = {
    start: existingPoints[existingPoints.length - 1],
    end: newPoint
  }

  // Check if this new segment intersects with any existing segments (except the last one it connects to)
  for (let i = 0; i < existingPoints.length - 2; i++) {
    const existingSegment: LineSegment2D = {
      start: existingPoints[i],
      end: existingPoints[i + 1]
    }

    if (doLineSegmentsIntersect(newSegment, existingSegment)) {
      return true
    }
  }

  return false
}

// Check if closing a polygon would create self-intersection
export function wouldClosingPolygonSelfIntersect(points: Vec2[]): boolean {
  if (points.length < 3) return false

  try {
    const polygon = pointsToGeoJSONPolygon(points)

    // Check if the closed polygon is valid
    if (!booleanValid(polygon)) {
      return true
    }

    // Check if the polygon has self-intersections
    const selfIntersections = kinks(polygon)
    return selfIntersections.features.length > 0
  } catch (error) {
    // If Turf can't create or validate the polygon, it's likely invalid
    return true
  }
}

// Compatibility aliases for easier migration
export const createPoint2D = createVec2
export const createVector2D = createVec2
export type Point2D = Vec2
export type Vector2D = Vec2
