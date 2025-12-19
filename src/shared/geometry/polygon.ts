import type { PathsD, PolyPathD } from 'clipper2-wasm'
import { vec3 } from 'gl-matrix'

import { lineSegmentIntersect, polygonEdges } from '@/construction/helpers'
import {
  createPathD,
  createPathsD,
  createPointD,
  getClipperModule,
  pathDToPoints
} from '@/shared/geometry/clipperInstance'

import {
  type Vec2,
  ZERO_VEC2,
  direction,
  distSqrVec2,
  distVec2,
  dotVec2,
  eqVec2,
  lenVec2,
  newVec2,
  normVec2,
  perpendicular,
  perpendicularCCW,
  perpendicularCW,
  scaleAddVec2,
  subVec2
} from './2d'
import { type Area, Bounds2D, type Length, radiansToDegrees } from './basic'
import { type Line2D, type LineSegment2D, lineIntersection, projectPointOntoLine } from './line'

const COLINEAR_EPSILON = 1e-9
const SIMPLIFY_TOLERANCE = 0.01

export interface Polygon2D {
  points: Vec2[]
}

export interface PolygonWithHoles2D {
  outer: Polygon2D
  holes: Polygon2D[]
}

export interface Polygon3D {
  points: vec3[]
}

export interface PolygonWithHoles3D {
  outer: Polygon3D
  holes: Polygon3D[]
}

export function calculatePolygonArea(polygon: Polygon2D): Area {
  const path = createPathD(polygon.points)
  try {
    return Math.abs(getClipperModule().AreaPathD(path))
  } finally {
    path.delete()
  }
}

export const calculatePolygonWithHolesArea = (polygon: PolygonWithHoles2D): Area => {
  const outerArea = calculatePolygonArea(polygon.outer)
  const holesArea = polygon.holes.reduce((sum, hole) => sum + calculatePolygonArea(hole), 0)
  return outerArea - holesArea
}

export function polygonIsClockwise(polygon: Polygon2D): boolean {
  const path = createPathD(polygon.points)
  try {
    return !getClipperModule().IsPositiveD(path)
  } finally {
    path.delete()
  }
}

export function ensurePolygonIsClockwise(polygon: Polygon2D): Polygon2D {
  if (!polygonIsClockwise(polygon)) {
    return { points: [...polygon.points].reverse() }
  }
  return polygon
}

export function ensurePolygonIsCounterClockwise(polygon: Polygon2D): Polygon2D {
  if (polygonIsClockwise(polygon)) {
    return { points: [...polygon.points].reverse() }
  }
  return polygon
}

export function polygonPerimeter(polygon: Polygon2D): number {
  if (polygon.points.length < 2) return 0
  let total = 0
  for (let i = 0; i < polygon.points.length; i++) {
    const current = polygon.points[i]
    const next = polygon.points[(i + 1) % polygon.points.length]
    total += distVec2(current, next)
  }
  return total
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

export function isPointStrictlyInPolygon(point: Vec2, polygon: Polygon2D): boolean {
  const testPoint = createPointD(point)
  const path = createPathD(polygon.points)
  try {
    const module = getClipperModule()
    const result = module.PointInPolygonD(testPoint, path)
    return result.value === module.PointInPolygonResult.IsInside.value
  } finally {
    testPoint.delete()
    path.delete()
  }
}

export function wouldPolygonSelfIntersect(existingPoints: Vec2[], newPoint: Vec2): boolean {
  if (existingPoints.some(p => eqVec2(p, newPoint))) {
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

export function intersectPolygon(polygon1: PolygonWithHoles2D, polygon2: PolygonWithHoles2D): PolygonWithHoles2D[] {
  const module = getClipperModule()
  const pathsA = polygonToPathsD(polygon1)
  const pathsB = polygonToPathsD(polygon2)

  const clipper = new module.ClipperD()
  const polyTree = new module.PolyPathD()

  try {
    clipper.AddSubject(pathsA)
    clipper.AddClip(pathsB)
    clipper.ExecutePoly(module.ClipType.Intersection, module.FillRule.NonZero, polyTree)
    return collectPolygonsWithHolesFromPolyTree(polyTree)
  } finally {
    clipper.delete()
    polyTree.delete()
    for (let i = 0; i < pathsA.size(); i++) {
      pathsA.get(i).delete()
    }
    pathsA.delete()
    for (let i = 0; i < pathsB.size(); i++) {
      pathsB.get(i).delete()
    }
    pathsB.delete()
  }
}

export function intersectPolygons(subjects: Polygon2D[], clips: Polygon2D[]): Polygon2D[] {
  const module = getClipperModule()
  const subjectPaths = createPathsD(subjects.map(s => createPathD(s.points)))
  const clipPaths = createPathsD(clips.map(c => createPathD(c.points)))

  try {
    const intersectResult = module.IntersectD(subjectPaths, clipPaths, module.FillRule.NonZero, 2)
    try {
      const result: Polygon2D[] = []
      for (let i = 0; i < intersectResult.size(); i++) {
        const path = intersectResult.get(i)
        result.push({ points: pathDToPoints(path) })
      }
      return result
    } finally {
      intersectResult.delete()
    }
  } finally {
    for (let i = 0; i < subjectPaths.size(); i++) {
      subjectPaths.get(i).delete()
    }
    subjectPaths.delete()
    for (let i = 0; i < clipPaths.size(); i++) {
      clipPaths.get(i).delete()
    }
    clipPaths.delete()
  }
}

export function unionPolygons(polygons: Polygon2D[]): Polygon2D[] {
  if (polygons.length === 0) return []
  if (polygons.length === 1) return polygons

  const module = getClipperModule()
  const paths = polygons.map(p => createPathD(p.points))
  const pathsD = createPathsD(paths)

  try {
    const unionResult = module.UnionSelfD(pathsD, module.FillRule.NonZero, 2)
    try {
      const result: Polygon2D[] = []
      for (let i = 0; i < unionResult.size(); i++) {
        const path = unionResult.get(i)
        result.push({ points: pathDToPoints(path) })
      }
      return result
    } finally {
      unionResult.delete()
    }
  } finally {
    pathsD.delete()
    for (const path of paths) {
      path.delete()
    }
  }
}

const pathDToPolygon = (path: ReturnType<typeof createPathD>): Polygon2D => {
  const points = pathDToPoints(path)
  path.delete()
  return { points }
}

const polygonToPathsD = (polygon: PolygonWithHoles2D): PathsD => {
  return createPathsD([
    createPathD(polygon.outer.points, true),
    ...polygon.holes.map(hole => createPathD(hole.points, false))
  ])
}

export const collectPolygonsWithHolesFromPolyTree = (root: PolyPathD): PolygonWithHoles2D[] => {
  const result: PolygonWithHoles2D[] = []

  const processNode = (node: PolyPathD, depth: number, currentOuter: PolygonWithHoles2D | null) => {
    const polygon = pathDToPolygon(node.polygon())
    if (depth % 2 === 1) {
      const outer = normaliseOrientation(polygon, true)
      const entry: PolygonWithHoles2D = { outer, holes: [] }
      result.push(entry)
      const childCount = node.count()
      for (let i = 0; i < childCount; i += 1) {
        processNode(node.child(i), depth + 1, entry)
      }
      return
    }

    if (currentOuter) {
      const hole = normaliseOrientation(polygon, false)
      currentOuter.holes.push(hole)
    }

    const childCount = node.count()
    for (let i = 0; i < childCount; i += 1) {
      processNode(node.child(i), depth + 1, null)
    }
  }

  processNode(root, 0, null)

  return result
}

export function subtractPolygons(subject: Polygon2D[], clips: Polygon2D[]): PolygonWithHoles2D[] {
  if (subject.length === 0) {
    return []
  }

  const module = getClipperModule()
  const subjectPaths = subject.map(polygon => createPathD(polygon.points))
  const clipPaths = clips.map(polygon => createPathD(polygon.points))
  const subjectPathsD = createPathsD(subjectPaths)
  const clipPathsD = createPathsD(clipPaths)
  const clipper = new module.ClipperD()
  const polyTree = new module.PolyPathD()

  try {
    clipper.AddSubject(subjectPathsD)
    clipper.AddClip(clipPathsD)
    clipper.ExecutePoly(module.ClipType.Difference, module.FillRule.NonZero, polyTree)
    return collectPolygonsWithHolesFromPolyTree(polyTree)
  } finally {
    clipper.delete()
    polyTree.delete()
    subjectPathsD.delete()
    clipPathsD.delete()
    subjectPaths.forEach(path => path.delete())
    clipPaths.forEach(path => path.delete())
  }
}

export interface PolygonSide {
  polygon: Polygon2D
  side: 'left' | 'right'
}

/**
 * Split a simple polygon by an infinite line defined by a segment.
 * Left side is perpendicular CCW from line direction, right side is perpendicular CW.
 * @param polygon - Simple polygon (no holes)
 * @param line - Line defining the split
 * @returns Array of polygon pieces with side tags
 */
export function splitPolygonByLine(polygon: Polygon2D, line: Line2D): PolygonSide[] {
  if (polygon.points.length < 3) {
    return []
  }

  const polygonCW = ensurePolygonIsClockwise(polygon)

  // Get line direction and perpendiculars
  const perpLeft = perpendicularCCW(line.direction)
  const perpRight = perpendicularCW(line.direction)

  // Create a large bounding size
  const bounds = Bounds2D.fromPoints(polygon.points)
  const basePoint = projectPointOntoLine(bounds.min, line)
  const largeSize = Math.max(bounds.width, bounds.height) * 3

  // Create two half-plane rectangles on either side of the line
  // Left half-plane (CCW perpendicular from line)
  const leftP1 = scaleAddVec2(basePoint, line.direction, -largeSize)
  const leftP2 = scaleAddVec2(basePoint, line.direction, largeSize)
  const leftP3 = scaleAddVec2(leftP2, perpLeft, largeSize)
  const leftP4 = scaleAddVec2(leftP1, perpLeft, largeSize)

  // Right half-plane (CW perpendicular from line)
  const rightP1 = scaleAddVec2(basePoint, line.direction, -largeSize)
  const rightP2 = scaleAddVec2(basePoint, line.direction, largeSize)
  const rightP3 = scaleAddVec2(rightP2, perpRight, largeSize)
  const rightP4 = scaleAddVec2(rightP1, perpRight, largeSize)

  const leftHalfPlane: Polygon2D = ensurePolygonIsClockwise({ points: [leftP1, leftP2, leftP3, leftP4] })
  const rightHalfPlane: Polygon2D = ensurePolygonIsClockwise({ points: [rightP1, rightP2, rightP3, rightP4] })

  // Use subtract to get the right side (polygon - left half-plane)
  const rightResults = intersectPolygon({ outer: polygonCW, holes: [] }, { outer: rightHalfPlane, holes: [] })

  // Use subtract to get the left side (polygon - right half-plane)
  const leftResults = intersectPolygon({ outer: polygonCW, holes: [] }, { outer: leftHalfPlane, holes: [] })

  // Collect all pieces with side tags
  const result: PolygonSide[] = []

  for (const poly of leftResults) {
    result.push({ polygon: poly.outer, side: 'left' })
  }

  for (const poly of rightResults) {
    result.push({ polygon: poly.outer, side: 'right' })
  }

  return result
}

export function unionPolygonsWithHoles(polygons: Polygon2D[]): PolygonWithHoles2D[] {
  if (polygons.length === 0) {
    return []
  }

  const module = getClipperModule()
  const paths = polygons.map(polygon => createPathD(polygon.points))
  const pathsD = createPathsD(paths)
  const clipper = new module.ClipperD()
  const polyTree = new module.PolyPathD()

  try {
    clipper.AddSubject(pathsD)
    clipper.ExecutePoly(module.ClipType.Union, module.FillRule.NonZero, polyTree)
    return collectPolygonsWithHolesFromPolyTree(polyTree)
  } finally {
    clipper.delete()
    polyTree.delete()
    pathsD.delete()
    paths.forEach(path => path.delete())
  }
}

export function polygonEdgeOffset(polygon: Polygon2D, offsets: Length[]): Polygon2D {
  const offsetLines = polygon.points.map((point, index) => {
    const dir = direction(point, polygon.points[(index + 1) % polygon.points.length])
    const outside = perpendicular(dir)
    const offsetDistance = offsets[index]
    const offsetPoint = scaleAddVec2(point, outside, offsetDistance)
    return { point: offsetPoint, direction: dir }
  })

  const points = offsetLines.map((line, index) => {
    const prevIndex = (index - 1 + offsetLines.length) % offsetLines.length
    const prevLine = offsetLines[prevIndex]
    const intersection = lineIntersection(prevLine, line)
    if (intersection) {
      return intersection
    }

    const fallbackDistance = (offsets[prevIndex] + offsets[index]) / 2
    // For colinear walls fall back to moving the inside corner along the outward normal.
    return scaleAddVec2(polygon.points[index], perpendicular(line.direction), fallbackDistance)
  })

  return { points }
}

const normaliseOrientation = (polygon: Polygon2D, clockwise: boolean): Polygon2D => {
  const isClockwise = polygonIsClockwise(polygon)
  if (clockwise === isClockwise) {
    return polygon
  }
  return {
    points: [...polygon.points].reverse()
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

// Convex hull

const CONVEX_HULL_EPSILON = 1e-9

const vectorCross = (origin: Vec2, a: Vec2, b: Vec2) => {
  return (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0])
}

const pointsEqual = (a: Vec2, b: Vec2) =>
  Math.abs(a[0] - b[0]) < CONVEX_HULL_EPSILON && Math.abs(a[1] - b[1]) < CONVEX_HULL_EPSILON

const signedArea = (points: Vec2[]): number => {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    sum += current[0] * next[1] - next[0] * current[1]
  }
  return sum * 0.5
}

const ensureCounterClockwiseOrder = (points: Vec2[]): Vec2[] => {
  if (points.length <= 2) return [...points]
  const area = signedArea(points)
  if (area < 0) {
    return [...points].reverse()
  }
  return [...points]
}

const advanceIndex = (index: number, n: number) => (index + 1) % n
const retreatIndex = (index: number, n: number) => (index - 1 + n) % n

const buildChain = (chainPoints: Vec2[], keepRightTurns: boolean) => {
  const chain: Vec2[] = []
  for (const point of chainPoints) {
    while (chain.length >= 2) {
      const cross = vectorCross(chain[chain.length - 2], chain[chain.length - 1], point)
      const shouldRemove =
        keepRightTurns && cross < -CONVEX_HULL_EPSILON
          ? true
          : !keepRightTurns && cross > CONVEX_HULL_EPSILON
            ? true
            : Math.abs(cross) <= CONVEX_HULL_EPSILON
      if (shouldRemove) {
        chain.pop()
      } else {
        break
      }
    }
    if (chain.length === 0 || !pointsEqual(chain[chain.length - 1], point)) {
      chain.push(point)
    }
  }
  return chain
}

// Linear-time convex hull for simple polygons (Yao & Graham, 1982)
function convexHullOfSimplePolygon(points: Vec2[]): Vec2[] {
  const n = points.length
  if (n <= 3) {
    return ensureCounterClockwiseOrder(points)
  }

  const orderedPoints = ensureCounterClockwiseOrder(points)

  let leftIndex = 0
  let rightIndex = 0
  for (let i = 1; i < orderedPoints.length; i++) {
    const current = orderedPoints[i]
    const left = orderedPoints[leftIndex]
    const right = orderedPoints[rightIndex]
    if (current[0] < left[0] || (Math.abs(current[0] - left[0]) < CONVEX_HULL_EPSILON && current[1] < left[1])) {
      leftIndex = i
    }
    if (current[0] > right[0] || (Math.abs(current[0] - right[0]) < CONVEX_HULL_EPSILON && current[1] > right[1])) {
      rightIndex = i
    }
  }

  if (pointsEqual(orderedPoints[leftIndex], orderedPoints[rightIndex])) {
    return [orderedPoints[leftIndex]]
  }

  const upperChainPoints: Vec2[] = []
  let index = leftIndex
  while (true) {
    upperChainPoints.push(orderedPoints[index])
    if (index === rightIndex) break
    index = advanceIndex(index, orderedPoints.length)
  }

  const lowerChainPoints: Vec2[] = []
  index = leftIndex
  while (true) {
    lowerChainPoints.push(orderedPoints[index])
    if (index === rightIndex) break
    index = retreatIndex(index, orderedPoints.length)
  }

  const upperHull = buildChain(upperChainPoints, true)
  const lowerHull = buildChain(lowerChainPoints, false)

  const combined = [...upperHull]
  for (let i = 1; i < lowerHull.length - 1; i++) {
    combined.push(lowerHull[i])
  }

  return combined
}

export function convexHullOfPolygon(polygon: Polygon2D): Polygon2D {
  const hullPoints = convexHullOfSimplePolygon(polygon.points)
  return { points: hullPoints }
}

export function convexHullOfPolygonWithHoles(polygon: PolygonWithHoles2D): Polygon2D {
  const hullPoints = convexHullOfSimplePolygon(polygon.outer.points)
  return { points: hullPoints }
}

// Minimum bounding box

export interface MinimumBoundingBox {
  size: Vec2
  angle: number
  smallestDirection: Vec2
}

function minimumAreaBoundingBoxFromPoints(points: Vec2[]): MinimumBoundingBox {
  if (points.length < 3) throw new Error('Polygon requires at least 3 points')

  // Use a robust convex hull (Andrew / monotone chain) instead of hull-for-simple-polygons
  const hull = convexHullAndrew(points)
  if (hull.length < 3) throw new Error('Convex hull of polygon requires at least 3 points')

  let bestArea = Infinity
  let bestSize = ZERO_VEC2
  let bestAngle = 0
  let bestDirection = ZERO_VEC2

  const rotatePoint = (point: Vec2, sinAngle: number, cosAngle: number) => {
    const x = point[0] * cosAngle - point[1] * sinAngle
    const y = point[0] * sinAngle + point[1] * cosAngle
    return newVec2(x, y)
  }

  for (let i = 0; i < hull.length; i++) {
    const current = hull[i]
    const next = hull[(i + 1) % hull.length]
    const edgeX = next[0] - current[0]
    const edgeY = next[1] - current[1]
    if (Math.abs(edgeX) < CONVEX_HULL_EPSILON && Math.abs(edgeY) < CONVEX_HULL_EPSILON) {
      continue
    }

    const angle = Math.atan2(edgeY, edgeX)
    const sinAngle = Math.sin(-angle)
    const cosAngle = Math.cos(-angle)

    const rotatedHull = hull.map(p => rotatePoint(p, sinAngle, cosAngle))
    const bounds = Bounds2D.fromPoints(rotatedHull)

    const size = bounds.size
    const area = size[0] * size[1]

    if (area < bestArea) {
      bestArea = area
      bestSize = size
      bestAngle = angle

      const edgeDir = normVec2(newVec2(edgeX, edgeY))
      // size[0] is along the edge direction, size[1] is perpendicular to it
      if (size[0] < size[1]) {
        bestDirection = edgeDir
      } else {
        bestDirection = perpendicularCCW(edgeDir)
      }
    }
  }

  return { size: bestSize, angle: bestAngle, smallestDirection: bestDirection }
}

export function minimumAreaBoundingBox(polygon: Polygon2D): MinimumBoundingBox {
  return minimumAreaBoundingBoxFromPoints(polygon.points)
}

/**
 * Compute a canonical (rotation/translation/start-index/mirror) invariant key
 * for a simple polygon whose vertices are given in boundary order.
 *
 * @param points Boundary-ordered polygon vertices; last vertex is NOT repeated.
 * @throws Error if polygon has <3 unique points or an edge is (near-)degenerate.
 */
export function canonicalPolygonKey(points: Vec2[]): string {
  const minEdge = 1e-12
  const n = points.length

  if (n < 3) throw new Error('Need at least 3 vertices.')
  // Build edge vectors and lengths
  const e: Vec2[] = new Array(n)
  const L: number[] = new Array(n)

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const ev = subVec2(points[j], points[i])
    const len = lenVec2(ev)
    if (!(len > minEdge)) {
      throw new Error(`Degenerate or near-zero length edge at index ${i}.`)
    }
    e[i] = ev
    L[i] = len
  }

  // Turn angles alpha_i between e_i and e_{i+1}
  const A: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const a = e[i]
    const b = e[(i + 1) % n]
    const cross = a[0] * b[1] - a[1] * b[0]
    const dot = a[0] * b[0] + a[1] * b[1]
    const angle = Math.atan2(cross, dot) // in (-pi, pi]
    A[i] = radiansToDegrees(angle)
  }

  // Build paired sequence S = [(L0, A0), ..., (L_{n-1}, A_{n-1})]
  const S: Pair[] = new Array(n)
  for (let i = 0; i < n; i++) {
    S[i] = {
      l: Math.round(L[i]),
      a: Math.round(A[i])
    }
  }

  // Reversed-orientation sequence: rev(S) = [(L_{n-1}, -A_{n-1}), ..., (L_0, -A_0)]
  const R: Pair[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const k = n - 1 - i
    R[i] = {
      l: Math.round(L[k]),
      a: Math.round(-A[k])
    }
  }

  // Mirrored sequence M = [(L0, -A0), ..., (L_{n-1}, -A_{n-1})]
  const M: Pair[] = new Array(n)
  for (let i = 0; i < n; i++) {
    M[i] = {
      l: Math.round(L[i]),
      a: Math.round(-A[i])
    }
  }

  // Canonicalize each by minimal cyclic rotation (Booth)
  const Sstar = minimalRotationPairs(S)
  const Rstar = minimalRotationPairs(R)
  const Mstar = minimalRotationPairs(M)

  // Serialize all; choose lexicographically smallest
  const s1 = Sstar.map(p => `${p.l},${p.a}`).join(';')
  const s2 = Rstar.map(p => `${p.l},${p.a}`).join(';')
  const s3 = Mstar.map(p => `${p.l},${p.a}`).join(';')
  return [s1, s2, s3].sort()[0]
}

/** Pair of (edge length, turn angle). */
interface Pair {
  l: number
  a: number
}

/** Lexicographic comparator for Pair. */
function cmpPair(x: Pair, y: Pair): number {
  if (x.l < y.l) return -1
  if (x.l > y.l) return 1
  if (x.a < y.a) return -1
  if (x.a > y.a) return 1
  return 0
}

/**
 * Booth's algorithm for minimal rotation over an array of Pair.
 * Returns a rotated copy that is lexicographically minimal among all rotations.
 * Runs in O(n).
 */
function minimalRotationPairs(arr: Pair[]): Pair[] {
  const n = arr.length
  if (n === 0) return []
  // Compare arr[i+k] vs arr[j+k] cyclically
  let i = 0
  let j = 1
  let k = 0
  while (i < n && j < n && k < n) {
    const ai = arr[(i + k) % n]
    const aj = arr[(j + k) % n]
    const c = cmpPair(ai, aj)
    if (c === 0) {
      k++
    } else if (c < 0) {
      // rotation at i is better; skip conflicting block after j
      j = j + k + 1
      if (j === i) j++
      k = 0
    } else {
      // rotation at j is better
      i = i + k + 1
      if (i === j) i++
      k = 0
    }
  }
  const start = Math.min(i, j)
  return rotatePairs(arr, start)
}

function rotatePairs(arr: Pair[], start: number): Pair[] {
  const n = arr.length
  const out = new Array<Pair>(n)
  for (let t = 0; t < n; t++) {
    out[t] = arr[(start + t) % n]
  }
  return out
}

export function polygonDiameterInDirection(polygon: Polygon2D, direction: Vec2): Length {
  const dir = normVec2(direction)

  let minProj = Infinity
  let maxProj = -Infinity

  for (const p of polygon.points) {
    const proj = dotVec2(p, dir)

    if (proj < minProj) minProj = proj
    if (proj > maxProj) maxProj = proj
  }

  return maxProj - minProj
}

// Add a robust convex hull implementation (Andrew / monotone chain)
function convexHullAndrew(points: Vec2[]): Vec2[] {
  if (points.length <= 3) return ensureCounterClockwiseOrder([...points])

  // Sort by x, then y
  const pts = [...points].sort((a, b) => {
    if (a[0] === b[0]) return a[1] - b[1]
    return a[0] - b[0]
  })

  // Remove duplicates (within epsilon)
  const uniq: Vec2[] = []
  for (const p of pts) {
    if (uniq.length === 0 || !pointsEqual(uniq[uniq.length - 1], p)) {
      uniq.push(p)
    }
  }

  if (uniq.length <= 3) return ensureCounterClockwiseOrder(uniq)

  const cross = (a: Vec2, b: Vec2, c: Vec2) => {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  }

  const lower: Vec2[] = []
  for (const p of uniq) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= CONVEX_HULL_EPSILON) {
      lower.pop()
    }
    lower.push(p)
  }

  const upper: Vec2[] = []
  for (let i = uniq.length - 1; i >= 0; i--) {
    const p = uniq[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= CONVEX_HULL_EPSILON) {
      upper.pop()
    }
    upper.push(p)
  }

  // Concatenate lower and upper removing duplicate endpoints
  lower.pop()
  upper.pop()
  const hull = lower.concat(upper)
  return ensureCounterClockwiseOrder(hull)
}

/**
 * Represents a segment where a line intersects a polygon
 */
export interface LinePolygonIntersection {
  segments: {
    tStart: number // 0-1 position along line where it enters polygon
    tEnd: number // 0-1 position along line where it exits polygon
  }[]
}

/**
 * Find all segments where a line segment intersects with a polygon.
 * Returns normalized t values (0-1) along the line segment.
 */
export function intersectLineSegmentWithPolygon(
  line: LineSegment2D,
  polygon: Polygon2D
): LinePolygonIntersection | null {
  if (polygon.points.length < 3) {
    return null
  }

  polygon = simplifyPolygon(polygon)

  const lineDir = direction(line.start, line.end)
  const lineLength = distVec2(line.start, line.end)

  if (lineLength === 0) {
    // Degenerate line - just check if point is inside
    return isPointInPolygon(line.start, polygon) ? { segments: [{ tStart: 0, tEnd: 0 }] } : null
  }

  // Find all intersection points with polygon edges
  interface Intersection {
    t: number
    crossing: boolean // true if actually crossing (not tangent)
  }

  const intersections: Intersection[] = []

  // Check each edge of the polygon
  for (let i = 0; i < polygon.points.length; i++) {
    const p1 = polygon.points[i]
    const p2 = polygon.points[(i + 1) % polygon.points.length]

    // Solve for intersection: line.start + t * lineDir = p1 + s * (p2 - p1)
    const edgeDir = direction(p1, p2)
    const edgeLength = distVec2(p1, p2)

    if (edgeLength === 0) continue

    // Use lineIntersection to find intersection point
    const lineDef: Line2D = { point: line.start, direction: lineDir }
    const edgeDef: Line2D = { point: p1, direction: edgeDir }

    const intersection = lineIntersection(lineDef, edgeDef)

    if (intersection) {
      // Calculate t along the line segment
      const toIntersection = subVec2(intersection, line.start)
      const t = dotVec2(toIntersection, lineDir) / lineLength

      // Calculate s along the edge
      const toIntersectionFromEdge = subVec2(intersection, p1)
      const s = dotVec2(toIntersectionFromEdge, edgeDir) / edgeLength

      // Only count if intersection is on both segments (with small epsilon for endpoints)
      const epsilon = 1e-9
      if (t >= -epsilon && t <= 1 + epsilon && s >= -epsilon && s <= 1 + epsilon) {
        // Clamp t to valid range
        const clampedT = Math.max(0, Math.min(1, t))

        // Check if this is a real crossing (not just tangent)
        // We determine this by checking if the line crosses from one side to the other
        const crossing = true // Simplified for now - could improve by checking side change

        intersections.push({ t: clampedT, crossing })
      }
    }
  }

  // Remove duplicate intersections (can happen at vertices)
  const uniqueIntersections: Intersection[] = []
  for (const int of intersections) {
    const isDuplicate = uniqueIntersections.some(existing => Math.abs(existing.t - int.t) < 1e-9)
    if (!isDuplicate) {
      uniqueIntersections.push(int)
    }
  }

  // Sort by t value
  uniqueIntersections.sort((a, b) => a.t - b.t)

  // Build segments based on start/end inside status and crossings
  const segments: { tStart: number; tEnd: number }[] = []

  if (uniqueIntersections.length === 0) {
    // No edge crossings
    if (isPointInPolygon(line.start, polygon) && isPointInPolygon(line.end, polygon)) {
      // Entire line is inside
      return { segments: [{ tStart: 0, tEnd: 1 }] }
    }
    // Entire line is outside
    return null
  }

  // Build segments by tracking inside/outside status
  let inside = isPointStrictlyInPolygon(line.start, polygon)
  let segmentStart: number | null = inside ? 0 : null

  for (const intersection of uniqueIntersections) {
    if (inside) {
      // We're inside, this intersection is an exit
      if (segmentStart !== null) {
        segments.push({ tStart: segmentStart, tEnd: intersection.t })
      }
      inside = false
      segmentStart = null
    } else {
      // We're outside, this intersection is an entry
      inside = true
      segmentStart = intersection.t
    }
  }

  // Close final segment if we end inside
  if (inside && segmentStart !== null) {
    segments.push({ tStart: segmentStart, tEnd: 1 })
  }

  return segments.length > 0 ? { segments } : null
}

export function intersectLineWithPolygon(line: Line2D, polygon: Polygon2D): LineSegment2D[] {
  if (polygon.points.length < 3) {
    return []
  }

  const intersections: {
    t: number
    p: Vec2
  }[] = []

  // Test each polygon edge
  for (const edge of polygonEdges(polygon)) {
    const edgeLength = distVec2(edge.start, edge.end)
    if (edgeLength < 1e-5) continue

    const intersection = lineSegmentIntersect(line, edge)

    if (!intersection) continue

    // Compute t on infinite line
    const toIntersection = subVec2(intersection, line.point)
    const t = dotVec2(toIntersection, line.direction)
    intersections.push({ t, p: intersection })
  }

  if (intersections.length === 0) {
    return []
  }

  intersections.sort((a, b) => a.t - b.t)

  const lines: LineSegment2D[] = []

  for (let i = 1; i < intersections.length; i += 2) {
    const start = intersections[i - 1].p
    const end = intersections[i].p
    if (distSqrVec2(start, end) > 1) {
      lines.push({ start, end })
    }
  }

  return lines
}

export function polygonEdgeCount(polygon: Polygon3D) {
  return vec3.equals(polygon.points[0], polygon.points[polygon.points.length - 1])
    ? polygon.points.length - 1
    : polygon.points.length
}

export function simplifyPolygonWithHoles(polygon: PolygonWithHoles2D) {
  const outer = simplifyPolygon(polygon.outer, 0.1)
  if (outer.points.length < 3 || calculatePolygonArea(outer) < 10) return null
  return {
    outer,
    holes: polygon.holes
      .map(h => simplifyPolygon(h, 0.1))
      .filter(p => p.points.length > 2 && calculatePolygonArea(p) >= 10)
  }
}
