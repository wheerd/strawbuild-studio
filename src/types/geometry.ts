// gl-matrix integration for high-performance vector operations
import { vec2, mat2d } from 'gl-matrix'

// Turf.js integration for robust polygon operations
import { polygon as turfPolygon, lineString as turfLineString, point as turfPoint } from '@turf/helpers'
import { kinks } from '@turf/kinks'
import { booleanValid } from '@turf/boolean-valid'
import { lineIntersect } from '@turf/line-intersect'
import { area as turfArea } from '@turf/area'
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon'
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

// Removed: normalizeAngle, pointOnLine, vectorFromAngle, lineFromPointAndAngle - unused functions

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

// Additional convenience functions for common operations
export function perpendicular(vector: Vec2): Vec2 {
  return perpendicularCCW(vector) // Default to counter-clockwise
}

// Removed: addVector and normalizeVector - unused and redundant with add/normalize

// Removed: snapToGrid, expandBounds, pointInBounds - unused functions

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

// Removed: isPointNearLine, offsetToPosition - unused functions

// Removed: formatLength, formatArea - unused formatting functions

// Polygon utilities - using turf.js for robust area calculation
export function calculatePolygonArea(polygon: Polygon2D): Area {
  if (polygon.points.length < 3) return createArea(0)

  try {
    const geoPolygon = polygonToGeoJSON(polygon)
    const areaM2 = turfArea(geoPolygon)
    return createArea(areaM2) // turf returns area in square meters
  } catch (error) {
    // Fallback to manual calculation if turf fails
    const points = polygon.points
    let area = 0
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      area += points[i][0] * points[j][1]
      area -= points[j][0] * points[i][1]
    }
    return createArea(Math.abs(area) / 2)
  }
}

// Removed: calculateCornerAngle, determineCornerType, radiansToDegrees, degreesToRadians, calculatePolygonWithHolesArea - unused functions

// Keep only the perpendicular functions as they might be useful for wall calculations
export function perpendicularCCW(vector: Vec2): Vec2 {
  return createVec2(-vector[1], vector[0]) // Rotate 90° counterclockwise
}

// Removed: rotatePoint, rotatePointAround, scalePointFrom, reflectVector, perpendicularCW - unused functions

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
  try {
    const turfPt = turfPoint([point[0], point[1]])
    const geoPolygon = polygonToGeoJSON(polygon)
    return booleanPointInPolygon(turfPt, geoPolygon)
  } catch (error) {
    // Fallback to manual calculation if turf fails
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
