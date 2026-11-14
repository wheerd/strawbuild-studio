import type {
  FloorOpening,
  InnerWallNodeWithGeometry,
  IntermediateWallId,
  IntermediateWallWithGeometry,
  PerimeterWallId,
  PerimeterWithGeometry
} from '@/building/model'
import { type WallNodeId, isIntermediateWallId } from '@/building/model/ids'
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
  innerLinesById: Record<PerimeterWallId, Line2D>
  outerPolygon: Polygon2D
  innerPolygon: Polygon2D
  floorOpenings: Polygon2D[]
  interiorWallAreas: Polygon2D[]
  interiorWallGeometry: Map<IntermediateWallId, InteriorWallGeometry>
  interiorWallNodePolygons: Map<WallNodeId, Polygon2D>
  wallFaceOffsets: WallFaceOffset[]

  outerFinishedPolygon: Polygon2D
  innerFinishedPolygon: Polygon2D
}

export interface InteriorWallEndpoint {
  nodeId: WallNodeId
  left: Vec2
  right: Vec2
}

export interface InteriorWallGeometry {
  coreLines: CoreWallLines
  start?: InteriorWallEndpoint
  end?: InteriorWallEndpoint
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
): { polygon: Polygon2D; lines: Line2D[]; linesByWallId: Partial<Record<PerimeterWallId, Line2D>> } {
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
    return { wallId: wall.id, line: { point: offsetPoint, direction: wall.direction } }
  })

  const filteredLines = offsetLines.filter(
    (entry, i) =>
      !eqVec2(entry.line.direction, offsetLines[(i - 1 + offsetLines.length) % offsetLines.length].line.direction)
  )

  const points = filteredLines
    .map((entry, index) => {
      const prevIndex = (index - 1 + filteredLines.length) % filteredLines.length
      const prevLine = filteredLines[prevIndex].line
      return lineIntersection(prevLine, entry.line)
    })
    .filter(p => p != null)

  return {
    polygon: { points },
    lines: filteredLines.map(entry => entry.line),
    linesByWallId: Object.fromEntries(offsetLines.map(entry => [entry.wallId, entry.line]))
  }
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

  const interiorWallResult = createInteriorWallGeometry(perimeter, inner.linesByWallId)

  const innerLinesById = inner.linesByWallId as Record<PerimeterWallId, Line2D>

  return {
    innerLines: inner.lines,
    innerLinesById,
    innerPolygon: inner.polygon,
    outerLines: outer.lines,
    outerPolygon: outer.polygon,
    floorOpenings: mergedHoles,
    interiorWallAreas: interiorWallResult.areas,
    interiorWallGeometry: interiorWallResult.wallGeometry,
    interiorWallNodePolygons: interiorWallResult.nodePolygons,
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

export function createInteriorWallGeometry(
  perimeter: PerimeterWithGeometry,
  linesByWallId: Partial<Record<PerimeterWallId, Line2D>>
): {
  areas: Polygon2D[]
  wallGeometry: Map<IntermediateWallId, InteriorWallGeometry>
  nodePolygons: Map<WallNodeId, Polygon2D>
} {
  const { getIntermediateWallsByPerimeter, getWallNodesByPerimeter } = getModelActions()
  const { getInteriorWallAssemblyById } = getConfigActions()
  const walls = getIntermediateWallsByPerimeter(perimeter.id)
  const nodes = getWallNodesByPerimeter(perimeter.id)
  const nodesById = new Map(nodes.map(node => [node.id, node]))
  const wallGeometry = new Map<IntermediateWallId, InteriorWallGeometry>()
  const nodePolygons = new Map<WallNodeId, Polygon2D>()
  const polygons: Polygon2D[] = []

  for (const wall of walls) {
    const config = getInteriorWallAssemblyById(wall.wallAssemblyId)
    if (!config) continue

    const layerThickness = resolveLayerSetThickness(config.layerSetId)
    wallGeometry.set(wall.id, {
      coreLines: {
        left: offsetLine(lineFromSegment(wall.leftLine), layerThickness),
        right: offsetLine(lineFromSegment(wall.rightLine), -layerThickness)
      }
    })
  }

  for (const node of nodes) {
    if (node.type === 'perimeter') {
      const insideLine = linesByWallId[node.wallId]
      if (!insideLine) continue
      for (const wallId of node.connectedWallIds) {
        if (!isIntermediateWallId(wallId)) continue
        const geometry = wallGeometry.get(wallId)
        const wall = walls.find(candidate => candidate.id === wallId)
        if (!geometry || !wall) continue

        const left = lineIntersection(geometry.coreLines.left, insideLine)
        const right = lineIntersection(geometry.coreLines.right, insideLine)
        if (!left || !right) continue
        setWallEndpoint(
          geometry,
          wall,
          node.id,
          wall.start.nodeId === node.id
            ? { nodeId: node.id, left, right }
            : { nodeId: node.id, right: left, left: right }
        )
      }
      continue
    }

    const innerResult = createInnerNodePolygons(node, walls, wallGeometry)
    polygons.push(...innerResult.polygons)
    if (innerResult.nodePolygon) {
      nodePolygons.set(node.id, innerResult.nodePolygon)
    }
    for (const [wallId, endpoint] of Object.entries(innerResult.endpoints) as [IntermediateWallId, WallEndpoint][]) {
      const wall = walls.find(candidate => candidate.id === wallId)
      const geometry = wallGeometry.get(wallId)
      if (wall && geometry) setWallEndpoint(geometry, wall, node.id, endpoint)
    }
  }

  for (const wall of walls) {
    const wallEndpoint = wallGeometry.get(wall.id)
    if (!wallEndpoint?.start || !wallEndpoint.end) continue

    const config = getInteriorWallAssemblyById(wall.wallAssemblyId)
    const layerThickness = resolveLayerSetThickness(config?.layerSetId)
    const startNode = nodesById.get(wall.start.nodeId)
    const endNode = nodesById.get(wall.end.nodeId)
    const start =
      startNode?.incidentWalls.length === 1
        ? shortenTerminalEndpoint(wallEndpoint.start, wall, layerThickness, 'start')
        : wallEndpoint.start
    const end =
      endNode?.incidentWalls.length === 1
        ? shortenTerminalEndpoint(wallEndpoint.end, wall, layerThickness, 'end')
        : wallEndpoint.end

    polygons.push(
      ensurePolygonIsClockwise({
        points: [start.left, end.left, end.right, start.right]
      })
    )
  }

  return {
    areas: unionPolygons(polygons),
    wallGeometry,
    nodePolygons
  }
}

export interface CoreWallLines {
  left: Line2D
  right: Line2D
}

interface WallEndpoint {
  nodeId: WallNodeId
  left: Vec2
  right: Vec2
}

function shortenTerminalEndpoint(
  endpoint: WallEndpoint,
  wall: IntermediateWallWithGeometry,
  layerThickness: Length,
  side: 'start' | 'end'
): WallEndpoint {
  const distance = side === 'start' ? layerThickness : -layerThickness
  return {
    ...endpoint,
    left: scaleAddVec2(endpoint.left, wall.direction, distance),
    right: scaleAddVec2(endpoint.right, wall.direction, distance)
  }
}

function setWallEndpoint(
  geometry: InteriorWallGeometry,
  wall: IntermediateWallWithGeometry,
  nodeId: WallNodeId,
  endpoint: WallEndpoint
): void {
  const positionedEndpoint = { ...endpoint, nodeId }
  if (wall.start.nodeId === nodeId) geometry.start = positionedEndpoint
  if (wall.end.nodeId === nodeId) {
    geometry.end = { ...positionedEndpoint, left: endpoint.right, right: endpoint.left }
  }
}

function createInnerNodePolygons(
  node: InnerWallNodeWithGeometry,
  walls: IntermediateWallWithGeometry[],
  wallGeometry: Map<IntermediateWallId, InteriorWallGeometry>
): {
  polygons: Polygon2D[]
  nodePolygon?: Polygon2D
  endpoints: Partial<Record<IntermediateWallId, WallEndpoint>>
} {
  const incidents: WallNodeIncidentLine[] = node.connectedWallIds.flatMap(wallId => {
    const wall = walls.find(candidate => candidate.id === wallId)
    const geometry = wall ? wallGeometry.get(wall.id) : undefined
    if (!wall || !geometry) return []

    const atStart = wall.start.nodeId === node.id
    return [
      {
        wallId: wall.id,
        left: atStart ? geometry.coreLines.left : geometry.coreLines.right,
        right: atStart ? geometry.coreLines.right : geometry.coreLines.left,
        dir: atStart ? wall.direction : negVec2(wall.direction),
        side: atStart ? 'start' : 'end'
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
        nodeId: node.id,
        left: incident.leftPoint,
        right: incident.rightPoint
      }
    }
  }

  return {
    polygons: geometry.boundary ? [geometry.boundary] : [],
    nodePolygon: geometry.boundary,
    endpoints
  }
}
