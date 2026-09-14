import type {
  FloorOpening,
  InnerWallNodeWithGeometry,
  IntermediateWallId,
  IntermediateWallWithGeometry,
  PerimeterId,
  PerimeterWithGeometry
} from '@/building/model'
import { isIntermediateWallId } from '@/building/model/ids'
import { type WallNodeIncidentLine, computeNodeGeometry } from '@/building/model/wallNodeIntersections'
import { getModelActions } from '@/building/store'
import { getConfigActions, resolveLayerSetThickness } from '@/config/store'
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
  lineFromSegment,
  lineIntersection,
  negVec2,
  normVec2,
  offsetLine,
  perpendicular,
  polygonEdgeOffset,
  scaleAddVec2,
  subVec2,
  unionPolygons
} from '@/shared/geometry'
import { ensurePolygonIsClockwise } from '@/shared/geometry/polygon'

export interface PerimeterConstructionContext {
  outerLines: Line2D[]
  innerLines: Line2D[]
  outerPolygon: Polygon2D
  innerPolygon: Polygon2D
  floorOpenings: Polygon2D[]
  interiorWallAreas: Polygon2D[]
  wallFaceOffsets: WallFaceOffset[]

  outerFinishedPolygon: Polygon2D
  innerFinishedPolygon: Polygon2D
}

export interface WallFaceOffset {
  line: Line2D
  segment: LineSegment2D
  normal: Vec2
  distance: Length
  length: Length
}

export function computePerimeterConstructionPolygon(
  perimeter: PerimeterWithGeometry,
  outside = true
): { polygon: Polygon2D; lines: Line2D[] } {
  const { getPerimeterWallById } = getModelActions()
  const { getPerimeterWallAssemblyById } = getConfigActions()

  const walls = perimeter.wallIds.map(getPerimeterWallById)

  const offsets = walls.map(wall => {
    const assembly = getPerimeterWallAssemblyById(wall.wallAssemblyId)
    const layerThickness = Math.max(
      outside
        ? resolveLayerSetThickness(assembly?.outsideLayerSetId)
        : resolveLayerSetThickness(assembly?.insideLayerSetId),
      0
    )
    const distanceFromEdge = outside ? Math.min(-layerThickness, 0) : Math.max(layerThickness, 0)
    return distanceFromEdge
  })

  const offsetLines = walls.map((wall, index) => {
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
  perimeter: PerimeterWithGeometry,
  openings: FloorOpening[]
): PerimeterConstructionContext => {
  const inner = computePerimeterConstructionPolygon(perimeter, false)
  const outer = computePerimeterConstructionPolygon(perimeter, true)

  const holes = openings.map(opening => opening.area)
  const relevantHoles = holes.filter(hole => arePolygonsIntersecting(outer.polygon, hole))
  const wallFaces = createWallFaceOffsets([perimeter])
  const adjustedHoles = relevantHoles.map(hole => applyWallFaceOffsets(hole, wallFaces))
  const mergedHoles = unionPolygons(adjustedHoles)

  const interiorWallAreas = createInteriorWallPolygons(perimeter.id)

  return {
    innerLines: inner.lines,
    innerPolygon: inner.polygon,
    outerLines: outer.lines,
    outerPolygon: outer.polygon,
    floorOpenings: mergedHoles,
    interiorWallAreas,
    wallFaceOffsets: wallFaces,
    innerFinishedPolygon: perimeter.innerPolygon,
    outerFinishedPolygon: perimeter.outerPolygon
  }
}

const PARALLEL_EPSILON = 1e-6
const DISTANCE_EPSILON = 1e-3

export function createWallFaceOffsets(perimeters: PerimeterWithGeometry[]): WallFaceOffset[] {
  const { getPerimeterWallById, getPerimeterCornerById } = getModelActions()
  const { getPerimeterWallAssemblyById } = getConfigActions()
  const faces: WallFaceOffset[] = []

  for (const perimeter of perimeters) {
    const walls = perimeter.wallIds.map(getPerimeterWallById)
    for (const wall of walls) {
      const assembly = getPerimeterWallAssemblyById(wall.wallAssemblyId)
      if (!assembly) {
        continue
      }

      const startCorner = getPerimeterCornerById(wall.startCornerId)
      const endCorner = getPerimeterCornerById(wall.endCornerId)

      const inwardNormal = negVec2(wall.outsideDirection)

      const insideThickness = Math.max(resolveLayerSetThickness(assembly.insideLayerSetId), 0)
      if (insideThickness > 0) {
        const segment: LineSegment2D = {
          start: copyVec2(startCorner.insidePoint),
          end: copyVec2(endCorner.insidePoint)
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

      const outsideThickness = Math.max(resolveLayerSetThickness(assembly.outsideLayerSetId), 0)
      if (outsideThickness > 0) {
        const segment: LineSegment2D = {
          start: copyVec2(startCorner.outsidePoint),
          end: copyVec2(endCorner.outsidePoint)
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

export function createInteriorWallPolygons(perimeterId: PerimeterId): Polygon2D[] {
  const { getIntermediateWallsByPerimeter, getWallNodesByPerimeter, getPerimeterWallById } = getModelActions()
  const { getInteriorWallAssemblyById } = getConfigActions()
  const walls = getIntermediateWallsByPerimeter(perimeterId)
  const wallLines: Partial<Record<IntermediateWallId, CoreWallLines>> = {}
  const endpoints: Partial<Record<IntermediateWallId, WallEndpoints>> = {}
  const polygons: Polygon2D[] = []

  for (const wall of walls) {
    const config = getInteriorWallAssemblyById(wall.wallAssemblyId)
    if (!config) continue

    const layerThickness = resolveLayerSetThickness(config.layerSetId)
    wallLines[wall.id] = {
      left: offsetLine(lineFromSegment(wall.leftLine), layerThickness),
      right: offsetLine(lineFromSegment(wall.rightLine), -layerThickness)
    }
    endpoints[wall.id] = {}
  }

  for (const node of getWallNodesByPerimeter(perimeterId)) {
    if (node.type === 'perimeter') {
      const outsideLine = lineFromSegment(getPerimeterWallById(node.wallId).outsideLine)
      for (const wallId of node.connectedWallIds) {
        if (!isIntermediateWallId(wallId)) continue
        const lines = wallLines[wallId]
        const wall = walls.find(candidate => candidate.id === wallId)
        if (!lines || !wall) continue

        const left = lineIntersection(lines.left, outsideLine)
        const right = lineIntersection(lines.right, outsideLine)
        if (!left || !right) continue
        setWallEndpoint(
          endpoints[wallId],
          wall,
          node.id,
          wall.start.nodeId === node.id ? { left, right } : { right: left, left: right }
        )
      }
      continue
    }

    const innerResult = createInnerNodePolygons(node, walls, wallLines)
    polygons.push(...innerResult.polygons)
    for (const [wallId, endpoint] of Object.entries(innerResult.endpoints) as [IntermediateWallId, WallEndpoint][]) {
      const wall = walls.find(candidate => candidate.id === wallId)
      if (wall) setWallEndpoint(endpoints[wallId], wall, node.id, endpoint)
    }
  }

  for (const wall of walls) {
    const wallEndpoint = endpoints[wall.id]
    if (!wallEndpoint?.start || !wallEndpoint.end) continue
    polygons.push(
      ensurePolygonIsClockwise({
        points: [wallEndpoint.start.left, wallEndpoint.end.left, wallEndpoint.end.right, wallEndpoint.start.right]
      })
    )
  }

  return unionPolygons(polygons)
}

interface CoreWallLines {
  left: Line2D
  right: Line2D
}

interface WallEndpoint {
  left: Vec2
  right: Vec2
}

interface WallEndpoints {
  start?: WallEndpoint
  end?: WallEndpoint
}

function setWallEndpoint(
  endpoints: WallEndpoints | undefined,
  wall: IntermediateWallWithGeometry,
  nodeId: string,
  endpoint: WallEndpoint
): void {
  if (!endpoints) return
  if (wall.start.nodeId === nodeId) endpoints.start = endpoint
  if (wall.end.nodeId === nodeId) endpoints.end = { left: endpoint.right, right: endpoint.left }
}

function createInnerNodePolygons(
  node: InnerWallNodeWithGeometry,
  walls: IntermediateWallWithGeometry[],
  wallLines: Partial<Record<IntermediateWallId, CoreWallLines>>
): { polygons: Polygon2D[]; endpoints: Partial<Record<IntermediateWallId, WallEndpoint>> } {
  const incidents: WallNodeIncidentLine[] = node.connectedWallIds.flatMap(wallId => {
    const wall = walls.find(candidate => candidate.id === wallId)
    const lines = wall ? wallLines[wall.id] : undefined
    if (!wall || !lines) return []

    const atStart = wall.start.nodeId === node.id
    return [
      {
        wallId: wall.id,
        left: atStart ? lines.left : lines.right,
        right: atStart ? lines.right : lines.left,
        dir: atStart ? wall.direction : negVec2(wall.direction)
      }
    ]
  })

  if (incidents.length === 0) return { polygons: [], endpoints: {} }
  incidents.sort((a, b) => Math.atan2(b.dir[1], b.dir[0]) - Math.atan2(a.dir[1], a.dir[0]))

  const geometry = computeNodeGeometry(node, node.position, incidents)
  const endpoints: Partial<Record<IntermediateWallId, WallEndpoint>> = {}

  for (const incident of geometry.incidentWalls) {
    if (isIntermediateWallId(incident.id)) {
      endpoints[incident.id] = {
        left: incident.leftPoint,
        right: incident.rightPoint
      }
    }
  }

  return { polygons: geometry.boundary ? [geometry.boundary] : [], endpoints }
}
