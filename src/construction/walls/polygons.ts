import type { OpeningWithGeometry, PerimeterWallWithGeometry } from '@/building/model'
import type { WallConstructionArea } from '@/construction/geometry'
import {
  type Length,
  type LineSegment2D,
  type Plane3D,
  type Polygon2D,
  type PolygonWithHoles2D,
  type Vec2,
  direction,
  dotVec2,
  ensurePolygonIsClockwise,
  newVec2,
  scaleAddVec2,
  simplifyPolygon,
  subVec2,
  subtractPolygons
} from '@/shared/geometry'
import { lineFromSegment, lineIntersection } from '@/shared/geometry/line'

import type { WallContext } from './corners/corners'

export type LayerSide = 'inside' | 'outside'

export const WALL_POLYGON_PLANE: Plane3D = 'xz'

const shiftPoint = (point: Vec2, direction: Vec2, distance: Length): Vec2 => {
  return scaleAddVec2(point, direction, distance)
}

const computeOffsetLine = (start: Vec2, end: Vec2, normal: Vec2, distance: Length) => {
  const offsetStart = shiftPoint(start, normal, distance)
  const offsetEnd = shiftPoint(end, normal, distance)
  return lineFromSegment({ start: offsetStart, end: offsetEnd })
}

const projectAlongWall = (wall: PerimeterWallWithGeometry, point: Vec2): Length => {
  const dir = direction(wall.insideLine.start, wall.insideLine.end)
  const relative = subVec2(point, wall.insideLine.start)
  return dotVec2(relative, dir)
}

const computeCornerIntersection = (
  corner: 'start' | 'end',
  side: LayerSide,
  depth: Length,
  wall: PerimeterWallWithGeometry,
  context: WallContext
): Vec2 => {
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
  wall: PerimeterWallWithGeometry,
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
      points: [newVec2(start, bottom), newVec2(start, top), newVec2(end, top), newVec2(end, bottom)]
    })
  )

export const subtractWallOpenings = (
  polygon: Polygon2D,
  start: Length,
  end: Length,
  bottom: Length,
  top: Length,
  openings: OpeningWithGeometry[],
  finishedFloorHeight: Length
): PolygonWithHoles2D[] => {
  const holes = openings
    .map(opening => {
      // Calculate left edge from center position
      const openingStart = opening.centerOffsetFromWallStart - opening.width / 2
      const openingEnd = opening.centerOffsetFromWallStart + opening.width / 2
      const clampedStart = Math.max(openingStart, start)
      const clampedEnd = Math.min(openingEnd, end)
      if (clampedEnd <= clampedStart) {
        return null
      }

      const sill = Math.max(opening.sillHeight ?? 0, 0)
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
            newVec2(clampedStart, clampedBottom),
            newVec2(clampedStart, clampedTop),
            newVec2(clampedEnd, clampedTop),
            newVec2(clampedEnd, clampedBottom)
          ]
        })
      )
    })
    .filter((hole): hole is { points: Vec2[] } => hole !== null)

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
  area: WallConstructionArea,
  openings: OpeningWithGeometry[],
  finishedFloorHeight: Length
): PolygonWithHoles2D[] =>
  subtractWallOpenings(
    area.getSideProfilePolygon(),
    area.position[0],
    area.position[0] + area.size[0],
    area.position[2],
    area.position[2] + area.size[2],
    openings,
    finishedFloorHeight
  )
