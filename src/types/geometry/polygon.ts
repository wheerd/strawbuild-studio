import { polygon as turfPolygon, lineString as turfLineString, point as turfPoint } from '@turf/helpers'
import { kinks } from '@turf/kinks'
import { booleanValid } from '@turf/boolean-valid'
import { lineIntersect } from '@turf/line-intersect'
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon'
import type { Feature, Polygon as GeoJSONPolygon, LineString } from 'geojson'

import type { Vec2, Area, Length } from './basic'
import { createArea, createLength, distance } from './basic'
import type { LineSegment2D } from './line'

// Polygon types
export interface Polygon2D {
  points: Vec2[]
}

export interface PolygonWithHoles2D {
  outer: Polygon2D
  holes: Polygon2D[]
}

// Polygon operations
export function calculatePolygonArea(polygon: Polygon2D): Area {
  if (polygon.points.length < 3) return createArea(0)
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

export function isPointInPolygon(point: Vec2, polygon: Polygon2D): boolean {
  const turfPt = turfPoint([point[0], point[1]])
  const geoPolygon = polygonToGeoJSON(polygon)
  return booleanPointInPolygon(turfPt, geoPolygon)
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
