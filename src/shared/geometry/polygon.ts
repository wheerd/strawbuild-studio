import { vec2 } from 'gl-matrix'

import {
  createPathD,
  createPathsD,
  createPointD,
  getClipperModule,
  pathDToPoints
} from '@/shared/geometry/clipperInstance'

import type { Area, Vec2 } from './basic'
import { createArea } from './basic'
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
  const path = createPathD(polygon.points)
  try {
    return createArea(getClipperModule().AreaPathD(path))
  } finally {
    path.delete()
  }
}

export function polygonIsClockwise(polygon: Polygon2D): boolean {
  const path = createPathD(polygon.points)
  try {
    return !getClipperModule().IsPositiveD(path)
  } finally {
    path.delete()
  }
}

export function isPointInPolygon(point: Vec2, polygon: Polygon2D): boolean {
  const testPoint = createPointD(point)
  const path = createPathD(polygon.points)
  try {
    const module = getClipperModule()
    const result = module.PointInPolygonD(testPoint, path)
    return result.value !== module.PointInPolygonResult.IsOutside.value
  } finally {
    testPoint.delete()
    path.delete()
  }
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

    if (segmentsIntersect(newSegment.start, newSegment.end, existingSegment.start, existingSegment.end)) {
      return true
    }
  }

  return false
}

export function wouldClosingPolygonSelfIntersect(polygon: Polygon2D): boolean {
  if (polygon.points.length < 3) return false

  const path = createPathD(polygon.points)
  const paths = createPathsD([path])

  try {
    const module = getClipperModule()
    const unionPaths = module.UnionSelfD(paths, module.FillRule.EvenOdd, 2)
    try {
      return unionPaths.size() !== 1
    } finally {
      unionPaths.delete()
    }
  } finally {
    paths.delete()
    path.delete()
  }
}

export function simplifyPolygon(polygon: Polygon2D, epsilon = SIMPLIFY_TOLERANCE): Polygon2D {
  const path = createPathD(polygon.points)
  const paths = createPathsD([path])
  try {
    const simplified = getClipperModule().SimplifyPathD(path, epsilon, true)
    try {
      const points = pathDToPoints(simplified)
      return { points }
    } finally {
      simplified.delete()
    }
  } finally {
    paths.delete()
    path.delete()
  }
}

export function offsetPolygon(polygon: Polygon2D, distanceValue: number): Polygon2D {
  if (distanceValue === 0) {
    return polygon
  }

  const path = createPathD(polygon.points)
  const paths = createPathsD([path])

  try {
    const module = getClipperModule()
    const inflated = module.InflatePathsD(
      paths,
      distanceValue,
      module.JoinType.Miter,
      module.EndType.Polygon,
      1000,
      2,
      0
    )
    try {
      const inflatedPath = inflated.get(0)
      return { points: pathDToPoints(inflatedPath) }
    } finally {
      inflated.delete()
    }
  } finally {
    paths.delete()
    path.delete()
  }
}

export function arePolygonsIntersecting(polygon1: Polygon2D, polygon2: Polygon2D): boolean {
  if (polygon1.points.length < 3 || polygon2.points.length < 3) {
    return false
  }

  const module = getClipperModule()
  const pathA = createPathD(polygon1.points)
  const pathB = createPathD(polygon2.points)
  const pathsA = createPathsD([pathA])
  const pathsB = createPathsD([pathB])

  try {
    const intersections = module.IntersectD(pathsA, pathsB, module.FillRule.EvenOdd, 2)
    try {
      for (let i = 0; i < intersections.size(); i++) {
        const intersectionPath = intersections.get(i)
        if (intersectionPath.size() > 0) {
          return true
        }
      }
    } finally {
      intersections.delete()
    }

    return false
  } finally {
    pathsA.delete()
    pathsB.delete()
    pathA.delete()
    pathB.delete()
  }
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
