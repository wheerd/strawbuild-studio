import type { PathD, PointD } from 'clipper2-wasm'
import { vec2 } from 'gl-matrix'

import { withClipperPath } from '@/shared/geometry/clipperInstance'

import type { Area, Bounds2D, Vec2 } from './basic'
import { boundsFromPoints, createArea } from './basic'
import type { LineSegment2D } from './line'

const COLINEAR_EPSILON = 1e-9
const SIMPLIFY_TOLERANCE = 0.01

export interface Polygon2D {
  points: Vec2[]
}

export interface PolygonWithHoles2D {
  outer: Polygon2D
  holes: Polygon2D[]
}

export function calculatePolygonArea(polygon: Polygon2D): Area {
  return withClipperPath(polygon.points, createArea(0), (module, path) => {
    const area = Math.abs(module.AreaPathD(path))
    return createArea(area)
  })
}

export function polygonIsClockwise(polygon: Polygon2D): boolean {
  return withClipperPath(polygon.points, false, (module, path) => !module.IsPositiveD(path))
}

export function isPointInPolygon(point: Vec2, polygon: Polygon2D): boolean {
  return withClipperPath(polygon.points, false, (module, path) => {
    if (path.size() < 3) return false
    const testPoint: PointD = new module.PointD(point[0], point[1], 0)
    try {
      const result = module.PointInPolygonD(testPoint, path)
      return result.value !== module.PointInPolygonResult.IsOutside.value
    } finally {
      testPoint.delete()
    }
  })
}

function doLineSegmentsIntersect(seg1: LineSegment2D, seg2: LineSegment2D): boolean {
  return segmentsIntersect(seg1.start, seg1.end, seg2.start, seg2.end)
}

export function wouldPolygonSelfIntersect(existingPoints: Vec2[], newPoint: Vec2): boolean {
  if (existingPoints.some(p => vec2.equals(p, newPoint))) {
    return true
  }

  if (existingPoints.length < 2) return false

  const newSegment: LineSegment2D = {
    start: existingPoints[existingPoints.length - 1],
    end: newPoint
  }

  for (let i = 0; i < existingPoints.length - 2; i++) {
    const existingSegment: LineSegment2D = {
      start: existingPoints[i],
      end: existingPoints[i + 1]
    }

    if (doLineSegmentsIntersect(newSegment, existingSegment) && !segmentsShareEndpoint(newSegment, existingSegment)) {
      return true
    }
  }

  return false
}

export function wouldClosingPolygonSelfIntersect(points: Vec2[]): boolean {
  if (points.length < 3) return false

  const normalized = normalizePoints(points)
  if (normalized.length < 3) return false

  if (hasDuplicatePoints(normalized)) {
    return true
  }

  const simplifiedChanged = withClipperPath(normalized, false, (module, path) => {
    if (path.size() < 3) return false
    const simplified = module.SimplifyPathD(path, SIMPLIFY_TOLERANCE, true)
    try {
      if (simplified.size() !== path.size()) {
        return true
      }
      return !pathsApproximatelyEqual(path, simplified)
    } finally {
      simplified.delete()
    }
  })

  if (simplifiedChanged) {
    return true
  }

  return hasSelfIntersection(normalized)
}

export function simplifyPolygon(polygon: Polygon2D, epsilon = SIMPLIFY_TOLERANCE): Polygon2D {
  return withClipperPath(polygon.points, { points: [...polygon.points] }, (module, path) => {
    if (path.size() < 3) {
      return { points: [...polygon.points] }
    }
    const simplified = module.SimplifyPathD(path, epsilon, true)
    try {
      const simplifiedPoints = pathDToPoints(simplified)
      return { points: simplifiedPoints }
    } finally {
      simplified.delete()
    }
  })
}

export function offsetPolygon(points: Vec2[], distanceValue: number): Vec2[] {
  if (points.length < 3) return []

  const n = points.length
  const offsetPoints: Vec2[] = []

  const isClockwiseOrientation = polygonIsClockwise({ points })
  const direction = isClockwiseOrientation ? 1 : -1

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]
    const curr = points[i]
    const next = points[(i + 1) % n]

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

    const n1x = v1x / len1
    const n1y = v1y / len1
    const n2x = v2x / len2
    const n2y = v2y / len2

    const perp1x = -n1y * direction
    const perp1y = n1x * direction
    const perp2x = -n2y * direction
    const perp2y = n2x * direction

    let bisectorX = perp1x + perp2x
    let bisectorY = perp1y + perp2y

    const bisectorLen = Math.sqrt(bisectorX * bisectorX + bisectorY * bisectorY)
    if (bisectorLen === 0) {
      bisectorX = perp1x
      bisectorY = perp1y
    } else {
      bisectorX /= bisectorLen
      bisectorY /= bisectorLen
    }

    const dot = n1x * n2x + n1y * n2y
    const angle = Math.acos(Math.max(-1, Math.min(1, -dot)))
    const sinHalfAngle = Math.sin(angle / 2)

    const adjustedDistance = sinHalfAngle > 0.1 ? distanceValue / sinHalfAngle : distanceValue

    offsetPoints.push([curr[0] + bisectorX * adjustedDistance, curr[1] + bisectorY * adjustedDistance])
  }

  return offsetPoints
}

function areBoundsOverlapping(bbox1: Bounds2D, bbox2: Bounds2D): boolean {
  return (
    bbox1.min[0] <= bbox2.max[0] &&
    bbox1.max[0] >= bbox2.min[0] &&
    bbox1.min[1] <= bbox2.max[1] &&
    bbox1.max[1] >= bbox2.min[1]
  )
}

export function arePolygonsIntersecting(polygon1: Polygon2D, polygon2: Polygon2D): boolean {
  if (polygon1.points.length < 3 || polygon2.points.length < 3) {
    return false
  }

  const bbox1 = boundsFromPoints(polygon1.points)
  const bbox2 = boundsFromPoints(polygon2.points)

  if (!areBoundsOverlapping(bbox1, bbox2)) return false

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
      if (doLineSegmentsIntersect(edge1, edge2) && !segmentsShareEndpoint(edge1, edge2)) {
        return true
      }
    }
  }

  return false
}

function pathDToPoints(path: PathD): Vec2[] {
  const result: Vec2[] = []
  const size = path.size()
  for (let i = 0; i < size; i++) {
    const point = path.get(i) as PointD
    result.push([point.x as number, point.y as number])
  }
  return result
}

function pathsApproximatelyEqual(original: PathD, simplified: PathD): boolean {
  if (original.size() !== simplified.size()) {
    return false
  }

  for (let i = 0; i < original.size(); i++) {
    const a = original.get(i) as PointD
    const b = simplified.get(i) as PointD
    if (!vec2.equals([a.x, a.y], [b.x, b.y])) {
      return false
    }
  }
  return true
}

function normalizePoints(points: Vec2[]): Vec2[] {
  if (points.length === 0) return []
  const normalized: Vec2[] = []
  for (const point of points) {
    if (normalized.length === 0 || !vec2.equals(normalized[normalized.length - 1], point)) {
      normalized.push(point)
    }
  }
  if (normalized.length > 1 && vec2.equals(normalized[0], normalized[normalized.length - 1])) {
    normalized.pop()
  }
  return normalized
}

function hasDuplicatePoints(points: Vec2[]): boolean {
  const seen: Vec2[] = []
  for (const point of points) {
    if (seen.some(existing => vec2.equals(existing, point))) {
      return true
    }
    seen.push(point)
  }
  return false
}

function hasSelfIntersection(points: Vec2[]): boolean {
  const segments = buildPolygonSegments(points)
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      if (segmentsShareEndpoint(segments[i], segments[j])) continue
      if (doLineSegmentsIntersect(segments[i], segments[j])) {
        return true
      }
    }
  }
  return false
}

function buildPolygonSegments(points: Vec2[]): LineSegment2D[] {
  const segments: LineSegment2D[] = []
  for (let i = 0; i < points.length; i++) {
    const start = points[i]
    const end = points[(i + 1) % points.length]
    segments.push({ start, end })
  }
  return segments
}

function segmentsShareEndpoint(seg1: LineSegment2D, seg2: LineSegment2D): boolean {
  return (
    vec2.equals(seg1.start, seg2.start) ||
    vec2.equals(seg1.start, seg2.end) ||
    vec2.equals(seg1.end, seg2.start) ||
    vec2.equals(seg1.end, seg2.end)
  )
}

function segmentsIntersect(p1: Vec2, q1: Vec2, p2: Vec2, q2: Vec2): boolean {
  const o1 = orientation(p1, q1, p2)
  const o2 = orientation(p1, q1, q2)
  const o3 = orientation(p2, q2, p1)
  const o4 = orientation(p2, q2, q1)

  if (o1 !== o2 && o3 !== o4) return true

  if (o1 === 0 && onSegment(p1, p2, q1)) return true
  if (o2 === 0 && onSegment(p1, q2, q1)) return true
  if (o3 === 0 && onSegment(p2, p1, q2)) return true
  if (o4 === 0 && onSegment(p2, q1, q2)) return true

  return false
}

function orientation(p: Vec2, q: Vec2, r: Vec2): number {
  const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
  if (Math.abs(val) < COLINEAR_EPSILON) return 0
  return val > 0 ? 1 : 2
}

function onSegment(p: Vec2, q: Vec2, r: Vec2): boolean {
  return (
    q[0] <= Math.max(p[0], r[0]) + COLINEAR_EPSILON &&
    q[0] + COLINEAR_EPSILON >= Math.min(p[0], r[0]) &&
    q[1] <= Math.max(p[1], r[1]) + COLINEAR_EPSILON &&
    q[1] + COLINEAR_EPSILON >= Math.min(p[1], r[1])
  )
}

function getPolygonEdges(polygon: Polygon2D): LineSegment2D[] {
  const edges: LineSegment2D[] = []
  const points = polygon.points

  for (let i = 0; i < points.length; i++) {
    const start = points[i]
    const end = points[(i + 1) % points.length]
    edges.push({ start, end })
  }

  return edges
}
