import { vec2 } from 'gl-matrix'

import type { RawMeasurement } from '@/construction/measurements'
import {
  type Area,
  type Length,
  type Line2D,
  type LineSegment2D,
  type Plane3D,
  type Polygon2D,
  type PolygonWithHoles2D,
  calculatePolygonArea,
  calculatePolygonWithHolesArea,
  direction,
  ensurePolygonIsClockwise,
  intersectPolygon,
  lineIntersection,
  offsetPolygon,
  perpendicular,
  perpendicularCW,
  point2DTo3D,
  simplifyPolygon
} from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatting'

import { createConstructionElement } from './elements'
import type { MaterialId } from './materials/material'
import { type InitialPartInfo } from './parts'
import { type ConstructionResult, yieldElement, yieldWarning } from './results'
import { createExtrudedPolygon } from './shapes'
import type { Tag } from './tags'

export function polygonFromLineIntersections(lines: Line2D[]): Polygon2D {
  const points: vec2[] = []
  for (let i = 0; i < lines.length; i++) {
    const prev = lines[(i - 1 + lines.length) % lines.length]
    const current = lines[i]
    const intersection = lineIntersection(prev, current)
    if (intersection) {
      points.push(intersection)
    }
  }
  return { points }
}

export function infiniteBeamPolygon(
  line: Line2D,
  clipStart: Line2D,
  clipEnd: Line2D,
  thicknessLeft: Length,
  thicknessRight: Length
): Polygon2D | null {
  const leftDir = perpendicularCW(line.direction)
  const lineLeft: Line2D = {
    point: vec2.scaleAndAdd(vec2.create(), line.point, leftDir, thicknessLeft),
    direction: line.direction
  }
  const lineRight: Line2D = {
    point: vec2.scaleAndAdd(vec2.create(), line.point, leftDir, -thicknessRight),
    direction: line.direction
  }
  const p1 = lineIntersection(lineLeft, clipStart)
  const p2 = lineIntersection(lineRight, clipStart)
  const p3 = lineIntersection(lineRight, clipEnd)
  const p4 = lineIntersection(lineLeft, clipEnd)

  if (!p1 || !p2 || !p3 || !p4) return null

  const beamPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
  return ensurePolygonIsClockwise(beamPolygon)
}

export function* infiniteBeam(
  line: Line2D,
  clipPolygon: PolygonWithHoles2D,
  thicknessLeft: Length,
  thicknessRight: Length,
  height: Length,
  material: MaterialId,
  partInfo?: InitialPartInfo,
  tags?: Tag[]
): Generator<ConstructionResult> {
  const leftDir = perpendicularCW(line.direction)
  const lineStart = vec2.scaleAndAdd(vec2.create(), line.point, line.direction, 1e6)
  const lineEnd = vec2.scaleAndAdd(vec2.create(), line.point, line.direction, -1e6)
  const p1 = vec2.scaleAndAdd(vec2.create(), lineStart, leftDir, thicknessLeft)
  const p2 = vec2.scaleAndAdd(vec2.create(), lineStart, leftDir, -thicknessRight)
  const p3 = vec2.scaleAndAdd(vec2.create(), lineEnd, leftDir, -thicknessRight)
  const p4 = vec2.scaleAndAdd(vec2.create(), lineEnd, leftDir, thicknessLeft)

  const beamPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
  const beamParts = intersectPolygon(clipPolygon, { outer: beamPolygon, holes: [] })

  for (const part of beamParts) {
    yield* yieldElement(
      createConstructionElement(material, createExtrudedPolygon(part, 'xy', height), undefined, tags, partInfo)
    )
  }
}

export function* beam(
  line: LineSegment2D,
  clipPolygon: PolygonWithHoles2D,
  thicknessLeft: Length,
  thicknessRight: Length,
  height: Length,
  material: MaterialId,
  partInfo?: InitialPartInfo,
  tags?: Tag[]
): Generator<ConstructionResult> {
  const leftDir = perpendicularCW(direction(line.start, line.end))
  const p1 = vec2.scaleAndAdd(vec2.create(), line.start, leftDir, thicknessLeft)
  const p2 = vec2.scaleAndAdd(vec2.create(), line.start, leftDir, -thicknessRight)
  const p3 = vec2.scaleAndAdd(vec2.create(), line.end, leftDir, -thicknessRight)
  const p4 = vec2.scaleAndAdd(vec2.create(), line.end, leftDir, thicknessLeft)

  const beamPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
  const beamParts = intersectPolygon(clipPolygon, { outer: beamPolygon, holes: [] })

  for (const part of beamParts) {
    yield* yieldElement(
      createConstructionElement(material, createExtrudedPolygon(part, 'xy', height), undefined, tags, partInfo)
    )
  }
}

export function* stripesPolygons(
  polygon: PolygonWithHoles2D,
  direction: vec2,
  thickness: Length,
  spacing: Length,
  startOffset: Length = 0,
  endOffset: Length = 0,
  minimumArea: Area = 0
): Generator<PolygonWithHoles2D> {
  const perpDir = perpendicular(direction)

  const dots = polygon.outer.points.map(p => vec2.dot(p, perpDir))
  const stripeStart = polygon.outer.points[dots.indexOf(Math.min(...dots))]
  const totalSpan = Math.max(...dots) - Math.min(...dots)

  const dots2 = polygon.outer.points.map(p => vec2.dot(p, direction))
  const stripeMin = polygon.outer.points[dots2.indexOf(Math.min(...dots2))]
  const stripeLength = Math.max(...dots2) - Math.min(...dots2)

  const stripeLine: Line2D = { point: stripeStart, direction }
  const perpLine: Line2D = { point: stripeMin, direction: perpDir }

  const intersection = lineIntersection(stripeLine, perpLine)

  if (!intersection) {
    return
  }

  const stepWidth = thickness + spacing
  const end = totalSpan + spacing - endOffset
  for (let offset = startOffset; offset <= end; offset += stepWidth) {
    const clippedOffset = Math.min(offset, totalSpan - thickness - endOffset)
    const p1 = vec2.scaleAndAdd(vec2.create(), intersection, perpDir, clippedOffset)
    const p2 = vec2.scaleAndAdd(vec2.create(), p1, perpDir, thickness)
    const p3 = vec2.scaleAndAdd(vec2.create(), p2, direction, stripeLength)
    const p4 = vec2.scaleAndAdd(vec2.create(), p1, direction, stripeLength)

    const stripePolygon: Polygon2D = { points: [p1, p2, p3, p4] }
    const stripeParts = intersectPolygon(polygon, { outer: stripePolygon, holes: [] })

    yield* stripeParts.filter(p => calculatePolygonArea(p.outer) > minimumArea)
  }
}

export interface RotatedRect {
  dir: vec2
  perpDir: vec2
  dirExtent: Length
  perpExtent: Length
  minPoint: vec2
}

export function rotatedRectFromPolygon(polygon: Polygon2D, direction: vec2) {
  const dir = vec2.normalize(vec2.create(), direction)
  const perpDir = perpendicular(dir)

  const perpDots = polygon.points.map(p => vec2.dot(p, perpDir))
  const perpMinPoint = polygon.points[perpDots.indexOf(Math.min(...perpDots))]
  const perpExtent = Math.max(...perpDots) - Math.min(...perpDots)

  const dirDots = polygon.points.map(p => vec2.dot(p, dir))
  const dirMinPoint = polygon.points[dirDots.indexOf(Math.min(...dirDots))]
  const extent = Math.max(...dirDots) - Math.min(...dirDots)

  const dirLine: Line2D = { point: perpMinPoint, direction: dir }
  const perpLine: Line2D = { point: dirMinPoint, direction: perpDir }

  const intersection = lineIntersection(dirLine, perpLine)

  if (!intersection) {
    throw new Error('Could not determine intersection due to parallel lines.')
  }

  return {
    dir,
    perpDir,
    dirExtent: extent,
    perpExtent,
    minPoint: intersection
  }
}

const EXTENT_EPSILON = 1e-2

export class PolygonWithBoundingRect {
  readonly polygon: PolygonWithHoles2D
  readonly dir: vec2
  readonly perpDir: vec2
  readonly dirExtent: Length
  readonly perpExtent: Length
  readonly minPoint: vec2

  constructor(
    polygon: PolygonWithHoles2D,
    dir: vec2,
    dirExtent: Length,
    perpDir: vec2,
    perExtent: Length,
    minPoint: vec2
  ) {
    this.polygon = polygon
    this.dir = dir
    this.perpDir = perpDir
    this.dirExtent = dirExtent
    this.perpExtent = perExtent
    this.minPoint = minPoint
  }

  public static fromPolygon(polygon: PolygonWithHoles2D, direction: vec2): PolygonWithBoundingRect {
    const dir = vec2.normalize(vec2.create(), direction)
    const perpDir = perpendicular(dir)

    const perpDots = polygon.outer.points.map(p => vec2.dot(p, perpDir))
    const perpMinPoint = polygon.outer.points[perpDots.indexOf(Math.min(...perpDots))]
    const perpExtent = Math.max(...perpDots) - Math.min(...perpDots)

    const dirDots = polygon.outer.points.map(p => vec2.dot(p, dir))
    const dirMinPoint = polygon.outer.points[dirDots.indexOf(Math.min(...dirDots))]
    const dirExtent = Math.max(...dirDots) - Math.min(...dirDots)

    const dirLine: Line2D = { point: perpMinPoint, direction: dir }
    const perpLine: Line2D = { point: dirMinPoint, direction: perpDir }

    const intersection = lineIntersection(dirLine, perpLine)

    if (!intersection) {
      throw new Error('Could not determine intersection due to parallel lines.')
    }

    return new PolygonWithBoundingRect(polygon, dir, dirExtent, perpDir, perpExtent, intersection)
  }

  public *tiled(dirStep: Length, perpStep: Length): Generator<PolygonWithBoundingRect> {
    for (let offsetDir = 0; offsetDir < this.dirExtent; offsetDir += dirStep) {
      const clippedLengthDir = Math.min(dirStep, this.dirExtent - offsetDir)
      const base = vec2.scaleAndAdd(vec2.create(), this.minPoint, this.dir, offsetDir)
      for (let offsetPerp = 0; offsetPerp < this.perpExtent; offsetPerp += perpStep) {
        const clippedLengthPerp = Math.min(perpStep, this.perpExtent - offsetPerp)
        const p1 = vec2.scaleAndAdd(vec2.create(), base, this.perpDir, offsetPerp)
        const p2 = vec2.scaleAndAdd(vec2.create(), p1, this.perpDir, clippedLengthPerp)
        const p3 = vec2.scaleAndAdd(vec2.create(), p2, this.dir, clippedLengthDir)
        const p4 = vec2.scaleAndAdd(vec2.create(), p1, this.dir, clippedLengthDir)

        const rectPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
        for (const clippedRect of intersectPolygon(this.polygon, { outer: rectPolygon, holes: [] })) {
          yield PolygonWithBoundingRect.fromPolygon(clippedRect, this.dir)
        }
      }
    }
  }

  private *fixedOffsets(
    start: number,
    end: number,
    spacing: number,
    minSpacing: number,
    thickness: number
  ): Generator<number> {
    if (end - start < spacing) {
      yield end
      return
    }
    const offsetEnd = end - thickness - minSpacing
    let offset = start + spacing
    for (; offset < offsetEnd; offset += spacing) {
      yield offset
    }
    if (offset < end) {
      yield offsetEnd
    }
    yield end
  }

  private *equalOffsets(start: number, end: number, maxSpacing: number, thickness: number): Generator<number> {
    const span = end - start - maxSpacing
    if (span <= 0) {
      yield end
      return
    }
    const offsetCount = Math.ceil(span / (maxSpacing + thickness))
    const adjustedSpacing = (end - start - offsetCount * thickness) / (offsetCount + 1)
    const offsetStart = start + adjustedSpacing
    for (let i = 0; i < offsetCount; i++) {
      yield offsetStart + i * (adjustedSpacing + thickness)
    }
    yield end
  }

  public perpProjectionOffsets(points: vec2[], eps = 1e-6) {
    const rawOffsets = points.map(p => vec2.dot(vec2.subtract(vec2.create(), p, this.minPoint), this.perpDir))
    const sorted = rawOffsets.filter(o => o >= 0 && o <= this.perpExtent).sort((a, b) => a - b)
    const results: number[] = []
    let lastOffset = -1
    for (let offset of sorted) {
      if (offset - lastOffset > eps) {
        results.push(offset)
        lastOffset = offset
      }
    }
    return results
  }

  public *stripes({
    thickness,
    spacing,
    equalSpacing = false,
    minSpacing = 0,
    stripeAtMin = true,
    stripeAtMax = true,
    minimumArea = 0,
    requiredStripeMidpoints
  }: {
    thickness: Length
    spacing: Length
    equalSpacing?: boolean
    minSpacing?: Length
    stripeAtMin?: boolean
    stripeAtMax?: boolean
    minimumArea?: Area
    requiredStripeMidpoints?: vec2[]
  }): Generator<PolygonWithBoundingRect> {
    let midpoints = this.perpProjectionOffsets(requiredStripeMidpoints ?? [])
    const halfThickness = thickness / 2
    if (stripeAtMin) {
      const start = thickness + halfThickness
      midpoints = [halfThickness, ...midpoints.filter(p => p > start)]
    }
    if (stripeAtMax) {
      const end = this.perpExtent - thickness - halfThickness
      midpoints = [...midpoints.filter(p => p > end), this.perpExtent - halfThickness]
    }

    for (let i = 0; i <= midpoints.length; i++) {
      const start = i === 0 ? 0 : midpoints[i - 1] + halfThickness
      const end = i === midpoints.length ? this.perpExtent : midpoints[i] - halfThickness

      const offsets = equalSpacing
        ? this.equalOffsets(start, end, spacing, thickness)
        : this.fixedOffsets(start, end, spacing, minSpacing, thickness)

      for (const offset of offsets) {
        const p1 = vec2.scaleAndAdd(vec2.create(), this.minPoint, this.perpDir, offset)
        const p2 = vec2.scaleAndAdd(vec2.create(), p1, this.perpDir, thickness)
        const p3 = vec2.scaleAndAdd(vec2.create(), p2, this.dir, this.dirExtent)
        const p4 = vec2.scaleAndAdd(vec2.create(), p1, this.dir, this.dirExtent)

        const stripePolygon: Polygon2D = { points: [p1, p2, p3, p4] }

        for (const clippedStripe of intersectPolygon(this.polygon, { outer: stripePolygon, holes: [] })) {
          if (calculatePolygonWithHolesArea(clippedStripe) > minimumArea) {
            yield PolygonWithBoundingRect.fromPolygon(clippedStripe, this.dir)
          }
        }
      }
    }
  }

  public dirMeasurement(
    plane: Plane3D,
    thickness?: Length,
    tags?: Tag[],
    offset?: Length,
    useMin = true
  ): RawMeasurement | null {
    if (this.dirExtent <= 0) return null

    const maxInPerp = vec2.scaleAndAdd(vec2.create(), this.minPoint, this.perpDir, this.perpExtent)
    const start2D = useMin ? this.minPoint : maxInPerp
    const end2D = vec2.scaleAndAdd(vec2.create(), start2D, this.dir, this.dirExtent)
    const extent2D = useMin ? maxInPerp : this.minPoint

    const startPoint = point2DTo3D(start2D, plane, 0)
    const endPoint = point2DTo3D(end2D, plane, 0)
    const extend1 = point2DTo3D(extent2D, plane, 0)
    const extend2 = thickness != null ? point2DTo3D(start2D, plane, thickness) : undefined
    return {
      startPoint,
      endPoint,
      extend1,
      extend2,
      label: offset ? formatLength(this.dirExtent) : undefined,
      tags,
      offset
    }
  }

  public perpMeasurement(
    plane: Plane3D,
    thickness?: Length,
    tags?: Tag[],
    offset?: Length,
    useMin = true
  ): RawMeasurement | null {
    if (this.perpExtent <= 0) return null

    const maxInDir = vec2.scaleAndAdd(vec2.create(), this.minPoint, this.dir, this.dirExtent)
    const start2D = useMin ? this.minPoint : maxInDir
    const end2D = vec2.scaleAndAdd(vec2.create(), start2D, this.perpDir, this.perpExtent)
    const extent2D = useMin ? maxInDir : this.minPoint

    const startPoint = point2DTo3D(start2D, plane, 0)
    const endPoint = point2DTo3D(end2D, plane, 0)
    const extend1 = point2DTo3D(extent2D, plane, 0)
    const extend2 = thickness != null ? point2DTo3D(start2D, plane, thickness) : undefined
    return {
      startPoint,
      endPoint,
      extend1,
      extend2,
      label: offset ? formatLength(this.perpExtent) : undefined,
      tags,
      offset
    }
  }

  public *extrude(
    materialId: MaterialId,
    thickness: Length,
    plane: Plane3D,
    tags?: Tag[],
    partInfo?: InitialPartInfo
  ): Generator<ConstructionResult> {
    if (this.isEmpty) {
      return
    }
    yield* yieldElement(
      createConstructionElement(
        materialId,
        createExtrudedPolygon(this.polygon, plane, thickness),
        undefined,
        tags,
        partInfo
      )
    )
  }

  get size2D() {
    return vec2.fromValues(this.dirExtent, this.perpExtent)
  }

  public size3D(plane: Plane3D, thickness: Length) {
    return point2DTo3D(this.size2D, plane, thickness)
  }

  get rectArea() {
    return this.dirExtent * this.perpExtent
  }

  get area() {
    return calculatePolygonWithHolesArea(this.polygon)
  }

  get isEmpty() {
    return this.dirExtent <= EXTENT_EPSILON || this.perpExtent <= EXTENT_EPSILON || this.polygon.outer.points.length < 3
  }
}

export function* simpleStripes(
  polygon: PolygonWithHoles2D,
  direction: vec2,
  thickness: Length,
  height: Length,
  spacing: Length,
  material: MaterialId,
  partInfo?: InitialPartInfo,
  tags?: Tag[]
): Generator<ConstructionResult> {
  try {
    const {
      dirExtent: stripeLength,
      perpExtent: totalSpan,
      perpDir,
      minPoint
    } = rotatedRectFromPolygon(polygon.outer, direction)

    // Used to filter out tiny stripe pieces (which are probably not needed)
    const minRelevantArea = (thickness * thickness) / 2

    const stepWidth = thickness + spacing
    const end = totalSpan + spacing
    for (let offset = 0; offset <= end; offset += stepWidth) {
      const clippedOffset = Math.min(offset, totalSpan - thickness)
      const p1 = vec2.scaleAndAdd(vec2.create(), minPoint, perpDir, clippedOffset)
      const p2 = vec2.scaleAndAdd(vec2.create(), p1, perpDir, thickness)
      const p3 = vec2.scaleAndAdd(vec2.create(), p2, direction, stripeLength)
      const p4 = vec2.scaleAndAdd(vec2.create(), p1, direction, stripeLength)

      const stripePolygon: Polygon2D = { points: [p1, p2, p3, p4] }
      const stripeParts = intersectPolygon(polygon, { outer: stripePolygon, holes: [] })

      for (const part of stripeParts) {
        if (calculatePolygonArea(part.outer) < minRelevantArea) continue
        yield* yieldElement(
          createConstructionElement(material, createExtrudedPolygon(part, 'xy', height), undefined, tags, partInfo)
        )
      }
    }
  } catch (error) {
    yield yieldWarning(error instanceof Error ? error.message : String(error), [])
  }
}

export function* tiledRectPolygons(
  basePoint: vec2,
  direction: vec2,
  dirExtent: Length,
  dirStep: Length,
  perpDir: vec2,
  perpExtent: Length,
  perpStep: Length,
  clipPolygon: PolygonWithHoles2D
): Generator<PolygonWithHoles2D> {
  for (let offsetDir = 0; offsetDir < dirExtent; offsetDir += dirStep) {
    const clippedLengthDir = Math.min(dirStep, dirExtent - offsetDir)
    const base = vec2.scaleAndAdd(vec2.create(), basePoint, direction, offsetDir)
    for (let offsetPerp = 0; offsetPerp < perpExtent; offsetPerp += perpStep) {
      const clippedLengthPerp = Math.min(perpStep, perpExtent - offsetPerp)
      const p1 = vec2.scaleAndAdd(vec2.create(), base, perpDir, offsetPerp)
      const p2 = vec2.scaleAndAdd(vec2.create(), p1, perpDir, clippedLengthPerp)
      const p3 = vec2.scaleAndAdd(vec2.create(), p2, direction, clippedLengthDir)
      const p4 = vec2.scaleAndAdd(vec2.create(), p1, direction, clippedLengthDir)

      const rectPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
      yield* intersectPolygon(clipPolygon, { outer: rectPolygon, holes: [] })
    }
  }
}

export function* simplePolygonFrame(
  polygon: Polygon2D,
  thickness: Length,
  height: Length,
  material: MaterialId,
  clipPolygon?: Polygon2D,
  partInfo?: InitialPartInfo,
  tags?: Tag[],
  inside = true
): Generator<ConstructionResult> {
  polygon = ensurePolygonIsClockwise(polygon)
  const outerPolygon = inside ? polygon : offsetPolygon(polygon, thickness)
  const innerPolygon = inside ? offsetPolygon(polygon, -thickness) : polygon

  if (outerPolygon.points.length === innerPolygon.points.length) {
    const l = outerPolygon.points.length
    for (let i0 = 0; i0 < l; i0++) {
      const i1 = (i0 + 1) % l
      const innerStart = innerPolygon.points[i0]
      const innerEnd = innerPolygon.points[i1]
      const outsideStart = closestPoint(innerStart, outerPolygon.points)
      const outsideEnd = closestPoint(innerEnd, outerPolygon.points)

      const elementPolygon: PolygonWithHoles2D = {
        outer: {
          // points: [outerPolygon.points[i0], outerPolygon.points[i1], innerPolygon.points[i1], innerPolygon.points[i0]]
          points: [innerStart, innerEnd, outsideEnd, outsideStart]
        },
        holes: []
      }
      const clipped = clipPolygon
        ? intersectPolygon(elementPolygon, { outer: clipPolygon, holes: [] })
        : [elementPolygon]

      for (const clip of clipped) {
        yield* yieldElement(
          createConstructionElement(material, createExtrudedPolygon(clip, 'xy', height), undefined, tags, partInfo)
        )
      }
    }
  }
}

export function closestPoint(reference: vec2, points: vec2[]): vec2 {
  if (points.length === 0) {
    throw new Error("closestPoint: 'points' array must not be empty.")
  }

  let closest = points[0]
  let minDistSq = vec2.sqrDist(reference, closest)

  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    const distSq = vec2.sqrDist(reference, p)
    if (distSq < minDistSq) {
      minDistSq = distSq
      closest = p
    }
  }

  return vec2.clone(closest)
}

export function* polygonEdges(polygon: Polygon2D): Generator<LineSegment2D> {
  for (let i0 = 0; i0 < polygon.points.length; i0++) {
    const i1 = (i0 + 1) % polygon.points.length
    yield {
      start: polygon.points[i0],
      end: polygon.points[i1]
    }
  }
}

const EPSILON = 1e-5

export function lineSegmentIntersect(line: Line2D, segment: LineSegment2D): vec2 | null {
  const segmentLine: Line2D = {
    point: segment.start,
    direction: direction(segment.start, segment.end)
  }

  const intersection = lineIntersection(line, segmentLine)
  if (!intersection) return null

  // Check if intersection is actually on the segment
  const segmentLength = vec2.distance(segment.start, segment.end)
  const distFromStart = vec2.distance(segment.start, intersection)
  const distFromEnd = vec2.distance(segment.end, intersection)

  // Point is on segment if distances sum to segment length (with epsilon tolerance)
  if (Math.abs(distFromStart + distFromEnd - segmentLength) < EPSILON) {
    return intersection
  }

  return null
}

export function splitPolygonAtIndices(
  polygon: Polygon2D,
  startIndex: number,
  endIndex: number,
  cutStart: vec2,
  cutEnd: vec2
): [Polygon2D, Polygon2D] {
  const points = polygon.points
  const n = points.length

  // cutStart lies on the edge from points[startIndex] to points[(startIndex+1)%n]
  // cutEnd lies on the edge from points[endIndex] to points[(endIndex+1)%n]

  // Build first polygon: cutStart -> points along polygon -> cutEnd
  const poly1Points: vec2[] = []

  // Add cutStart (unless it coincides with the next point we'll add)
  const nextAfterStart = points[(startIndex + 1) % n]
  if (vec2.distance(cutStart, nextAfterStart) > EPSILON) {
    poly1Points.push(vec2.clone(cutStart))
  }

  // Add all points from (startIndex+1) to endIndex (inclusive)
  let i = (startIndex + 1) % n
  while (true) {
    poly1Points.push(vec2.clone(points[i]))
    if (i === endIndex) break
    i = (i + 1) % n
  }

  // Add cutEnd (unless it coincides with the last point we added)
  if (vec2.distance(cutEnd, poly1Points[poly1Points.length - 1]) > EPSILON) {
    poly1Points.push(vec2.clone(cutEnd))
  }

  // Build second polygon: cutEnd -> points along polygon -> cutStart
  const poly2Points: vec2[] = []

  // Add cutEnd (unless it coincides with the next point we'll add)
  const nextAfterEnd = points[(endIndex + 1) % n]
  if (vec2.distance(cutEnd, nextAfterEnd) > EPSILON) {
    poly2Points.push(vec2.clone(cutEnd))
  }

  // Add all points from (endIndex+1) to startIndex (inclusive)
  i = (endIndex + 1) % n
  while (true) {
    poly2Points.push(vec2.clone(points[i]))
    if (i === startIndex) break
    i = (i + 1) % n
  }

  // Add cutStart (unless it coincides with the last point we added)
  if (vec2.distance(cutStart, poly2Points[poly2Points.length - 1]) > EPSILON) {
    poly2Points.push(vec2.clone(cutStart))
  }

  return [{ points: poly1Points }, { points: poly2Points }]
}

export function* partitionByAlignedEdges(polygon: Polygon2D, dir: vec2): Generator<Polygon2D> {
  // Optimization: polygons with less than 4 points cannot be split
  if (polygon.points.length < 4) {
    yield polygon
    return
  }

  const queue = [ensurePolygonIsClockwise(polygon)]
  let toSplit
  while ((toSplit = queue.pop())) {
    const pointCount = toSplit.points.length

    const area = calculatePolygonArea(toSplit)
    if (area < EPSILON) continue

    if (pointCount < 4) {
      yield toSplit
      continue
    }

    let splitFound = false

    for (let i = 0; i < pointCount; i++) {
      const start = toSplit.points[i]
      const end = toSplit.points[(i + 1) % pointCount]
      const prev = toSplit.points[(i - 1 + pointCount) % pointCount]
      const next = toSplit.points[(i + 2) % pointCount]
      const edgeDir = direction(start, end)

      // Check if edge is aligned with the direction (handles both dir and -dir)
      if (1 - Math.abs(vec2.dot(edgeDir, dir)) > EPSILON) continue

      const edgeLine: Line2D = { point: start, direction: dir }
      const perpDir = perpendicularCW(edgeDir)

      // Check if we can extend this edge in either direction
      const nextDir = direction(end, next)
      const nextPerpComponent = vec2.dot(nextDir, perpDir)
      const canExtendForward = nextPerpComponent < -EPSILON

      const prevDir = direction(prev, start)
      const prevPerpComponent = vec2.dot(prevDir, perpDir)
      const canExtendBackward = prevPerpComponent > EPSILON

      if (!canExtendForward && !canExtendBackward) continue

      let bestForwardIndex = -1
      let bestForwardPoint: vec2 | null = null
      let smallestForwardDistance = Infinity

      let bestBackwardIndex = -1
      let bestBackwardPoint: vec2 | null = null
      let smallestBackwardDistance = Infinity

      // Search for intersections (excluding current, next, and previous edges)
      for (let j = 2; j < pointCount - 1; j++) {
        // Forward search
        if (canExtendForward) {
          const candidateIndex = (i + j) % pointCount
          const candidateStart = toSplit.points[candidateIndex]
          const candidateEnd = toSplit.points[(candidateIndex + 1) % pointCount]
          const intersection = lineSegmentIntersect(edgeLine, { start: candidateStart, end: candidateEnd })

          if (intersection) {
            const distance = vec2.distance(end, intersection)
            if (distance > EPSILON && distance < smallestForwardDistance) {
              bestForwardIndex = candidateIndex
              bestForwardPoint = intersection
              smallestForwardDistance = distance
            }
          }
        }

        // Backward search
        if (canExtendBackward) {
          const candidateIndex = (i - j + pointCount) % pointCount
          const candidateStart = toSplit.points[candidateIndex]
          const candidateEnd = toSplit.points[(candidateIndex + 1) % pointCount]
          const intersection = lineSegmentIntersect(edgeLine, { start: candidateStart, end: candidateEnd })

          if (intersection) {
            const distance = vec2.distance(start, intersection)
            if (distance > EPSILON && distance < smallestBackwardDistance) {
              bestBackwardIndex = candidateIndex
              bestBackwardPoint = intersection
              smallestBackwardDistance = distance
            }
          }
        }
      }

      // If we found a valid split, perform it
      if (bestBackwardPoint || bestForwardPoint) {
        let cutStart = start
        let cutEnd = end
        let splitStartIndex = i
        let splitEndIndex = (i + 1) % pointCount

        if (bestBackwardPoint && bestForwardPoint) {
          if (bestBackwardIndex === bestForwardIndex) {
            // Same edge - choose the split with smaller distance
            if (smallestBackwardDistance < smallestForwardDistance) {
              cutEnd = bestBackwardPoint
              splitEndIndex = bestBackwardIndex
            } else {
              cutStart = bestForwardPoint
              splitStartIndex = bestForwardIndex
            }
          } else {
            // Different edges - only perform backward cut (arbitrary choice)
            // The forward ear will be discovered and cut in a subsequent iteration
            cutEnd = bestBackwardPoint
            splitEndIndex = bestBackwardIndex
          }
        } else if (bestBackwardPoint) {
          // Only backward cut found
          cutEnd = bestBackwardPoint
          splitEndIndex = bestBackwardIndex
        } else if (bestForwardPoint) {
          // Only forward cut found
          cutStart = bestForwardPoint
          splitStartIndex = bestForwardIndex
        }

        const [poly1, poly2] = splitPolygonAtIndices(toSplit, splitStartIndex, splitEndIndex, cutStart, cutEnd)

        queue.push(simplifyPolygon(poly1), simplifyPolygon(poly2))
        splitFound = true
        break // Move to next polygon in queue
      }
    }

    if (!splitFound) {
      // No valid splits found - this polygon is fully partitioned
      yield toSplit
    }
  }
}
