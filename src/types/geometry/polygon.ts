import { polygon as turfPolygon, lineString as turfLineString, point as turfPoint } from '@turf/helpers'
import { kinks } from '@turf/kinks'
import { booleanValid } from '@turf/boolean-valid'
import { lineIntersect } from '@turf/line-intersect'
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon'
import type { Feature, Polygon as GeoJSONPolygon, LineString } from 'geojson'

import type { Vec2, Area, Length, Bounds2D } from './basic'
import { boundsFromPoints, createArea, createLength, distance } from './basic'
import type { LineWall2D } from './line'

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

export function lineWallToGeoJSON(wall: LineWall2D): Feature<LineString> {
  return turfLineString([
    [wall.start[0], wall.start[1]],
    [wall.end[0], wall.end[1]]
  ])
}

// Check if two line walls intersect (using Turf.js)
export function doLineWallsIntersect(seg1: LineWall2D, seg2: LineWall2D): boolean {
  const line1 = lineWallToGeoJSON(seg1)
  const line2 = lineWallToGeoJSON(seg2)

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

  // The new line wall would be from the last existing point to the new point
  const newWall: LineWall2D = {
    start: existingPoints[existingPoints.length - 1],
    end: newPoint
  }

  // Check if this new wall intersects with any existing walls (except the last one it connects to)
  for (let i = 0; i < existingPoints.length - 2; i++) {
    const existingWall: LineWall2D = {
      start: existingPoints[i],
      end: existingPoints[i + 1]
    }

    if (doLineWallsIntersect(newWall, existingWall)) {
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

// Offset a polygon by a given distance (positive = outward, negative = inward)
// Uses a simple approach: move each vertex perpendicular to the adjacent edges
export function offsetPolygon(points: Vec2[], distance: number): Vec2[] {
  if (points.length < 3) return []

  const n = points.length
  const offsetPoints: Vec2[] = []

  // Determine if polygon is clockwise to get correct normal direction
  const isClockwise = polygonIsClockwise({ points })
  const direction = isClockwise ? 1 : -1 // Positive distance = outward, negative = inward

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]
    const curr = points[i]
    const next = points[(i + 1) % n]

    // Get normalized vectors for the two adjacent edges
    const v1x = curr[0] - prev[0]
    const v1y = curr[1] - prev[1]
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y)

    const v2x = next[0] - curr[0]
    const v2y = next[1] - curr[1]
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y)

    if (len1 === 0 || len2 === 0) {
      offsetPoints.push([curr[0], curr[1]])
      continue
    }

    // Normalize the vectors
    const n1x = v1x / len1
    const n1y = v1y / len1
    const n2x = v2x / len2
    const n2y = v2y / len2

    // Get perpendicular vectors (normals) pointing outward
    const perp1x = -n1y * direction
    const perp1y = n1x * direction
    const perp2x = -n2y * direction
    const perp2y = n2x * direction

    // Calculate bisector by averaging the two perpendiculars
    let bisectorX = perp1x + perp2x
    let bisectorY = perp1y + perp2y

    const bisectorLen = Math.sqrt(bisectorX * bisectorX + bisectorY * bisectorY)
    if (bisectorLen === 0) {
      // Parallel edges, use one of the perpendiculars
      bisectorX = perp1x
      bisectorY = perp1y
    } else {
      bisectorX /= bisectorLen
      bisectorY /= bisectorLen
    }

    // Calculate the angle between the edges to adjust the offset distance
    const dot = n1x * n2x + n1y * n2y
    const angle = Math.acos(Math.max(-1, Math.min(1, -dot))) // Angle between edges
    const sinHalfAngle = Math.sin(angle / 2)

    // Adjust distance to maintain consistent offset width
    const adjustedDistance = sinHalfAngle > 0.1 ? distance / sinHalfAngle : distance

    // Apply the offset
    offsetPoints.push([curr[0] + bisectorX * adjustedDistance, curr[1] + bisectorY * adjustedDistance])
  }

  return offsetPoints
}

export function areBoundsOverlapping(bbox1: Bounds2D, bbox2: Bounds2D): boolean {
  return (
    bbox1.min[0] <= bbox2.max[0] &&
    bbox1.max[0] >= bbox2.min[0] &&
    bbox1.min[1] <= bbox2.max[1] &&
    bbox1.max[1] >= bbox2.min[1]
  )
}

export function arePolygonsIntersecting(polygon1: Polygon2D, polygon2: Polygon2D): boolean {
  // Handle empty polygons
  if (polygon1.points.length < 3 || polygon2.points.length < 3) {
    return false
  }

  const bbox1 = boundsFromPoints(polygon1.points)
  const bbox2 = boundsFromPoints(polygon2.points)

  if (!bbox1 || !bbox2 || !areBoundsOverlapping(bbox1, bbox2))
    for (const vertex of polygon1.points) {
      if (isPointInPolygon(vertex, polygon2)) {
        return true
      }
    }

  for (const vertex of polygon2.points) {
    if (isPointInPolygon(vertex, polygon1)) {
      return true
    }
  }

  const edges1 = getPolygonEdges(polygon1)
  const edges2 = getPolygonEdges(polygon2)

  for (const edge1 of edges1) {
    for (const edge2 of edges2) {
      if (doLineWallsIntersect(edge1, edge2)) {
        return true
      }
    }
  }

  return false
}

// Helper function to get polygon edges as line walls
function getPolygonEdges(polygon: Polygon2D): LineWall2D[] {
  const edges: LineWall2D[] = []
  const points = polygon.points

  for (let i = 0; i < points.length; i++) {
    const start = points[i]
    const end = points[(i + 1) % points.length]
    edges.push({ start, end })
  }

  return edges
}
