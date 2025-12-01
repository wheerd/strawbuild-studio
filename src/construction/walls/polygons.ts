import { vec2 } from 'gl-matrix'

import type { PerimeterWall } from '@/building/model/model'
import {
  type Length,
  type LineSegment2D,
  type Plane3D,
  type Polygon2D,
  type PolygonWithHoles2D,
  ensurePolygonIsClockwise,
  simplifyPolygon,
  subtractPolygons
} from '@/shared/geometry'
import { lineFromSegment, lineIntersection } from '@/shared/geometry/line'

import type { WallContext } from './corners/corners'

export type LayerSide = 'inside' | 'outside'

export const WALL_POLYGON_PLANE: Plane3D = 'xz'

const shiftPoint = (point: vec2, direction: vec2, distance: Length): vec2 => {
  return vec2.scaleAndAdd(vec2.create(), point, direction, distance)
}

const computeOffsetLine = (start: vec2, end: vec2, normal: vec2, distance: Length) => {
  const offsetStart = shiftPoint(start, normal, distance)
  const offsetEnd = shiftPoint(end, normal, distance)
  return lineFromSegment({ start: offsetStart, end: offsetEnd })
}

const projectAlongWall = (wall: PerimeterWall, point: vec2): Length => {
  const direction = vec2.normalize(
    vec2.create(),
    vec2.subtract(vec2.create(), wall.insideLine.end, wall.insideLine.start)
  )
  const relative = vec2.subtract(vec2.create(), point, wall.insideLine.start)
  return vec2.dot(relative, direction)
}

const computeCornerIntersection = (
  corner: 'start' | 'end',
  side: LayerSide,
  depth: Length,
  wall: PerimeterWall,
  context: WallContext
): vec2 => {
  const baseSegment = side === 'inside' ? wall.insideLine : wall.outsideLine
  const referenceWall = corner === 'start' ? context.previousWall : context.nextWall
  const referenceSegment = side === 'inside' ? referenceWall.insideLine : referenceWall.outsideLine

  const offsetDistance = (side === 'inside' ? 1 : -1) * depth

  const baseLine = computeOffsetLine(baseSegment.start, baseSegment.end, wall.outsideDirection, offsetDistance)
  const referenceLine = computeOffsetLine(
    referenceSegment.start,
    referenceSegment.end,
    referenceWall.outsideDirection,
    offsetDistance
  )

  if (baseLine && referenceLine) {
    const intersection = lineIntersection(baseLine, referenceLine)
    if (intersection) {
      return intersection
    }
  }

  return corner === 'start'
    ? shiftPoint(baseSegment.start, wall.outsideDirection, offsetDistance)
    : shiftPoint(baseSegment.end, wall.outsideDirection, offsetDistance)
}

export const computeLayerSpan = (
  side: LayerSide,
  depth: Length,
  wall: PerimeterWall,
  context: WallContext
): { start: Length; end: Length; line: LineSegment2D } => {
  const startPoint = computeCornerIntersection('start', side, depth, wall, context)
  const endPoint = computeCornerIntersection('end', side, depth, wall, context)

  const startProjection = projectAlongWall(wall, startPoint)
  const endProjection = projectAlongWall(wall, endPoint)

  return startProjection <= endProjection
    ? { start: startProjection, end: endProjection, line: { start: startPoint, end: endPoint } }
    : { start: endProjection, end: startProjection, line: { start: endPoint, end: startPoint } }
}

export const createLayerPolygon = (start: Length, end: Length, bottom: Length, top: Length): Polygon2D =>
  ensurePolygonIsClockwise(
    simplifyPolygon({
      points: [
        vec2.fromValues(start, bottom),
        vec2.fromValues(start, top),
        vec2.fromValues(end, top),
        vec2.fromValues(end, bottom)
      ]
    })
  )

export const subtractWallOpenings = (
  polygon: Polygon2D,
  start: Length,
  end: Length,
  bottom: Length,
  top: Length,
  wall: PerimeterWall,
  finishedFloorHeight: Length
): PolygonWithHoles2D[] => {
  const holes = wall.openings
    .map(opening => {
      const openingStart = opening.offsetFromStart
      const openingEnd = openingStart + opening.width
      const clampedStart = Math.max(openingStart, start)
      const clampedEnd = Math.min(openingEnd, end)
      if (clampedEnd <= clampedStart) {
        return null
      }

      const sill = opening.sillHeight ?? 0
      const openingBottom = finishedFloorHeight + sill
      const openingTop = openingBottom + opening.height
      const clampedBottom = Math.max(openingBottom, bottom)
      const clampedTop = Math.min(openingTop, top)
      if (clampedTop <= clampedBottom) {
        return null
      }

      return ensurePolygonIsClockwise(
        simplifyPolygon({
          points: [
            vec2.fromValues(clampedStart, clampedBottom),
            vec2.fromValues(clampedStart, clampedTop),
            vec2.fromValues(clampedEnd, clampedTop),
            vec2.fromValues(clampedEnd, clampedBottom)
          ]
        })
      )
    })
    .filter((hole): hole is { points: vec2[] } => hole !== null)

  if (holes.length === 0) {
    return [{ outer: polygon, holes: [] }]
  }

  return subtractPolygons([polygon], holes)
}

export interface WallPolygonBounds {
  start: Length
  end: Length
  bottom: Length
  top: Length
}

export const createWallPolygonWithOpenings = (
  bounds: WallPolygonBounds,
  wall: PerimeterWall,
  finishedFloorHeight: Length
): PolygonWithHoles2D[] => {
  const polygon = createLayerPolygon(bounds.start, bounds.end, bounds.bottom, bounds.top)
  return subtractWallOpenings(polygon, bounds.start, bounds.end, bounds.bottom, bounds.top, wall, finishedFloorHeight)
}
