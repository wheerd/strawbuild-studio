import type { FloorOpening, Perimeter } from '@/building/model'
import { getConfigActions } from '@/construction/config'
import {
  type Length,
  type Line2D,
  type LineSegment2D,
  type Polygon2D,
  type Vec2,
  arePolygonsIntersecting,
  copyVec2,
  direction,
  distVec2,
  distanceToInfiniteLine,
  dotVec2,
  eqVec2,
  lineIntersection,
  negVec2,
  normVec2,
  perpendicular,
  polygonEdgeOffset,
  scaleAddVec2,
  subVec2,
  unionPolygons
} from '@/shared/geometry'

export interface PerimeterConstructionContext {
  outerLines: Line2D[]
  innerLines: Line2D[]
  outerPolygon: Polygon2D
  innerPolygon: Polygon2D
  floorOpenings: Polygon2D[]
  wallFaceOffsets: WallFaceOffset[]
}

export interface WallFaceOffset {
  line: Line2D
  segment: LineSegment2D
  normal: Vec2
  distance: Length
  length: Length
}

export function computePerimeterConstructionPolygon(
  perimeter: Perimeter,
  outside = true
): { polygon: Polygon2D; lines: Line2D[] } {
  const { getWallAssemblyById } = getConfigActions()

  const offsets = perimeter.walls.map(wall => {
    const assembly = getWallAssemblyById(wall.wallAssemblyId)
    const layerThickness = Math.max(
      (outside ? assembly?.layers.outsideThickness : assembly?.layers.insideThickness) ?? 0,
      0
    )
    const distanceFromEdge = outside ? Math.min(-layerThickness, 0) : Math.max(layerThickness, 0)
    return distanceFromEdge
  })

  const offsetLines = perimeter.walls.map((wall, index) => {
    const offsetDistance = offsets[index]
    const offsetPoint = scaleAddVec2(
      outside ? wall.outsideLine.start : wall.insideLine.start,
      wall.outsideDirection,
      offsetDistance
    )
    return { point: offsetPoint, direction: wall.direction }
  })

  const filteredLines = offsetLines.filter(
    (l, i) => !eqVec2(l.direction, offsetLines[(i - 1 + offsetLines.length) % offsetLines.length].direction)
  )

  const points = filteredLines
    .map((line, index) => {
      const prevIndex = (index - 1 + filteredLines.length) % filteredLines.length
      const prevLine = filteredLines[prevIndex]
      return lineIntersection(prevLine, line)
    })
    .filter(p => p != null)

  return { polygon: { points }, lines: filteredLines }
}

export const computePerimeterConstructionContext = (
  perimeter: Perimeter,
  openings: FloorOpening[]
): PerimeterConstructionContext => {
  const inner = computePerimeterConstructionPolygon(perimeter, false)
  const outer = computePerimeterConstructionPolygon(perimeter, true)

  const holes = openings.map(opening => opening.area)
  const relevantHoles = holes.filter(hole => arePolygonsIntersecting(outer.polygon, hole))
  const wallFaces = createWallFaceOffsets([perimeter])
  const adjustedHoles = relevantHoles.map(hole => applyWallFaceOffsets(hole, wallFaces))
  const mergedHoles = unionPolygons(adjustedHoles)

  return {
    innerLines: inner.lines,
    innerPolygon: inner.polygon,
    outerLines: outer.lines,
    outerPolygon: outer.polygon,
    floorOpenings: mergedHoles,
    wallFaceOffsets: wallFaces
  }
}

const PARALLEL_EPSILON = 1e-6
const DISTANCE_EPSILON = 1e-3

export function createWallFaceOffsets(perimeters: Perimeter[]): WallFaceOffset[] {
  const { getWallAssemblyById } = getConfigActions()
  const faces: WallFaceOffset[] = []

  for (const perimeter of perimeters) {
    for (let wallIndex = 0; wallIndex < perimeter.walls.length; wallIndex++) {
      const wall = perimeter.walls[wallIndex]
      const assembly = getWallAssemblyById(wall.wallAssemblyId)
      if (!assembly) {
        continue
      }

      const inwardNormal = negVec2(wall.outsideDirection)

      const insideThickness = Math.max(assembly.layers.insideThickness ?? 0, 0)
      if (insideThickness > 0) {
        const segment: LineSegment2D = {
          start: copyVec2(perimeter.corners[wallIndex].insidePoint),
          end: copyVec2(perimeter.corners[(wallIndex + 1) % perimeter.corners.length].insidePoint)
        }
        faces.push({
          line: {
            point: segment.start,
            direction: wall.direction
          },
          normal: copyVec2(wall.outsideDirection),
          segment,
          distance: insideThickness,
          length: distVec2(segment.start, segment.end)
        })
      }

      const outsideThickness = Math.max(assembly.layers.outsideThickness ?? 0, 0)
      if (outsideThickness > 0) {
        const segment: LineSegment2D = {
          start: copyVec2(perimeter.corners[wallIndex].outsidePoint),
          end: copyVec2(perimeter.corners[(wallIndex + 1) % perimeter.corners.length].outsidePoint)
        }
        faces.push({
          line: {
            point: segment.start,
            direction: wall.direction
          },
          normal: copyVec2(inwardNormal),
          segment,
          distance: outsideThickness,
          length: distVec2(segment.start, segment.end)
        })
      }
    }
  }

  return faces
}

export function applyWallFaceOffsets(polygon: Polygon2D, faces: WallFaceOffset[]): Polygon2D {
  if (faces.length === 0 || polygon.points.length < 3) {
    return polygon
  }

  const edgeOffsets = polygon.points.map(() => 0)
  let needsOffset = false

  for (let i = 0; i < polygon.points.length; i++) {
    const start = polygon.points[i]
    const end = polygon.points[(i + 1) % polygon.points.length]

    if (distVec2(start, end) < DISTANCE_EPSILON) {
      continue
    }

    const edgeDirection = direction(start, end)
    const edgeNormal = normVec2(perpendicular(edgeDirection))

    let selectedOffset = 0

    for (const face of faces) {
      if (face.length <= DISTANCE_EPSILON) {
        continue
      }

      const cross = edgeDirection[0] * face.line.direction[1] - edgeDirection[1] * face.line.direction[0]
      if (Math.abs(cross) > PARALLEL_EPSILON) {
        continue
      }

      const distanceStart = distanceToInfiniteLine(start, face.line)
      const distanceEnd = distanceToInfiniteLine(end, face.line)
      if (distanceStart > DISTANCE_EPSILON || distanceEnd > DISTANCE_EPSILON) {
        continue
      }

      if (!segmentsOverlap(start, end, face)) {
        continue
      }

      const alignment = dotVec2(edgeNormal, face.normal)
      if (Math.abs(alignment) < PARALLEL_EPSILON) {
        continue
      }

      const candidateOffset = face.distance * Math.sign(alignment)
      if (Math.abs(candidateOffset) > Math.abs(selectedOffset)) {
        selectedOffset = candidateOffset
      }
    }

    if (selectedOffset !== 0) {
      needsOffset = true
      edgeOffsets[i] = selectedOffset
    }
  }

  if (!needsOffset) {
    return polygon
  }

  return polygonEdgeOffset(polygon, edgeOffsets)
}

function segmentsOverlap(edgeStart: Vec2, edgeEnd: Vec2, face: WallFaceOffset): boolean {
  const toStart = subVec2(edgeStart, face.line.point)
  const toEnd = subVec2(edgeEnd, face.line.point)

  const edgeProjStart = dotVec2(toStart, face.line.direction)
  const edgeProjEnd = dotVec2(toEnd, face.line.direction)

  const edgeMin = Math.min(edgeProjStart, edgeProjEnd)
  const edgeMax = Math.max(edgeProjStart, edgeProjEnd)

  const faceMin = -DISTANCE_EPSILON
  const faceMax = face.length + DISTANCE_EPSILON

  if (edgeMax < faceMin || edgeMin > faceMax) {
    return false
  }

  const overlapStart = Math.max(edgeMin, 0)
  const overlapEnd = Math.min(edgeMax, face.length)

  return overlapEnd >= overlapStart - DISTANCE_EPSILON
}
