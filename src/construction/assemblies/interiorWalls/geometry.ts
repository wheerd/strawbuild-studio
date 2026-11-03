import { isIntermediateWallId } from '@/building/model'
import type { IntermediateWallWithGeometry, WallNodeIncidentWall, WallNodeWithGeometry } from '@/building/model'
import type {
  InteriorWallEndpoint,
  InteriorWallGeometry,
  PerimeterConstructionContext
} from '@/construction/context/perimeter'
import { transformManifold } from '@/construction/manifold/operations'
import { type ConstructionResult, yieldAndClip } from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import { intermediateWallTransform } from '@/construction/model/transforms'
import {
  type Length,
  type Line2D,
  type Polygon2D,
  type PolygonWithHoles2D,
  type Transform,
  type Vec2,
  type Vec3,
  addVec3,
  dotAbsVec2,
  dotVec2,
  dotVec3,
  ensurePolygonIsClockwise,
  fromTrans,
  invertTransform,
  lineFromSegment,
  lineIntersection,
  midpoint,
  negVec2,
  newVec2,
  newVec3,
  offsetPolygon,
  perpendicularCCW,
  perpendicularCW,
  polygonEdges,
  projectVec2,
  subVec2,
  subVec3,
  subtractPolygons,
  transform,
  vec2To3
} from '@/shared/geometry'

export interface ClippingPlane {
  normal: Vec3
  originOffset: Length
}

export interface LayerClipping {
  start?: ClippingPlane
  end?: ClippingPlane
}

export interface LayerExtension {
  startExtension: Length
  endExtension: Length
  startClipPlane?: ClippingPlane
  endClipPlane?: ClippingPlane
}

export interface InteriorWallClipping {
  startClipPolygon?: Polygon2D
  endClipPolygon?: Polygon2D
  startClipPlane?: ClippingPlane
  endClipPlane?: ClippingPlane
}

export interface WallExtension extends InteriorWallClipping {
  startExtension: Length
  endExtension: Length
  layerClipping: {
    left: LayerClipping
    right: LayerClipping
  }
}

export type InteriorWallLayerSide = 'left' | 'right'

export function computeWallExtensionAndClipping(
  wall: IntermediateWallWithGeometry,
  startNode: WallNodeWithGeometry,
  endNode: WallNodeWithGeometry,
  perimeterContext: PerimeterConstructionContext
): WallExtension {
  const layerClipping = computeLayerClipping(wall, startNode, endNode, perimeterContext)
  const geometry = perimeterContext.interiorWallGeometry.get(wall.id)
  const startNodePolygon = perimeterContext.interiorWallNodePolygons.get(startNode.id)
  const endNodePolygon = perimeterContext.interiorWallNodePolygons.get(endNode.id)
  if (!geometry?.start || !geometry.end) {
    return { startExtension: 0, endExtension: 0, layerClipping }
  }
  const corePolygon: Polygon2D = ensurePolygonIsClockwise({
    points: [geometry.start.left, geometry.end.left, geometry.end.right, geometry.start.right]
  })

  const startGeometry = computeWallEndpoints(geometry, geometry.start, startNode, perimeterContext)
  const baseStart = dotVec2(wall.entityReferenceLine.start, wall.direction)
  let startProjection = Math.min(
    dotVec2(startGeometry.left, wall.direction),
    dotVec2(startGeometry.right, wall.direction)
  )

  const endGeometry = computeWallEndpoints(geometry, geometry.end, endNode, perimeterContext)
  const baseEnd = dotVec2(wall.entityReferenceLine.end, wall.direction)
  let endProjection = Math.max(dotVec2(endGeometry.left, wall.direction), dotVec2(endGeometry.right, wall.direction))

  let startClipPolygon: Polygon2D | undefined
  let startClipPlane: ClippingPlane | undefined
  if (startNode.type === 'inner' && startNode.constructedBy === wall.id && startNodePolygon) {
    const nodeProjections = startNodePolygon.points.map(p => dotVec2(p, wall.direction))
    startProjection = Math.min(startProjection, ...nodeProjections)
    startClipPolygon = subtractPolygons(
      [offsetPolygon(startNodePolygon, wall.thickness)],
      [startNodePolygon, corePolygon]
    )[0].outer
  } else {
    startClipPolygon = undefined
    startClipPlane = computeNodeClipPlane(wall, startNode, 'start', perimeterContext)
  }

  let endClipPolygon: Polygon2D | undefined
  let endClipPlane: ClippingPlane | undefined
  if (endNode.type === 'inner' && endNode.constructedBy === wall.id && endNodePolygon) {
    const nodeProjections = endNodePolygon.points.map(p => dotVec2(p, wall.direction))
    endProjection = Math.max(endProjection, ...nodeProjections)
    endClipPolygon = subtractPolygons([offsetPolygon(endNodePolygon, wall.thickness)], [endNodePolygon, corePolygon])[0]
      .outer
  } else {
    endClipPolygon = undefined
    endClipPlane = computeNodeClipPlane(wall, endNode, 'end', perimeterContext)
  }

  const startExtension = Math.max(baseStart - startProjection, 0)
  const endExtension = Math.max(endProjection - baseEnd, 0)

  return {
    startExtension,
    endExtension,
    startClipPolygon,
    endClipPolygon,
    startClipPlane,
    endClipPlane,
    layerClipping
  }
}

function computeLayerClipping(
  wall: IntermediateWallWithGeometry,
  startNode: WallNodeWithGeometry,
  endNode: WallNodeWithGeometry,
  perimeterContext: PerimeterConstructionContext
): WallExtension['layerClipping'] {
  return {
    left: {
      start: computeNeighborLayerPlane(wall, startNode, 'start', 'left', perimeterContext),
      end: computeNeighborLayerPlane(wall, endNode, 'end', 'left', perimeterContext)
    },
    right: {
      start: computeNeighborLayerPlane(wall, startNode, 'start', 'right', perimeterContext),
      end: computeNeighborLayerPlane(wall, endNode, 'end', 'right', perimeterContext)
    }
  }
}

export function computeLayerExtension(
  wall: IntermediateWallWithGeometry,
  clipping: LayerClipping,
  band: { start: Length; end: Length }
): LayerExtension {
  const startPlane = clipping.start
  const endPlane = clipping.end
  const startLocalPlane = startPlane ? transformPlaneToWallCoordinates(startPlane, wall) : undefined
  const endLocalPlane = endPlane ? transformPlaneToWallCoordinates(endPlane, wall) : undefined

  return {
    startExtension: startLocalPlane ? extensionAtStart(startLocalPlane, band) : 0,
    endExtension: endLocalPlane ? extensionAtEnd(endLocalPlane, band, wall.wallLength) : 0,
    startClipPlane: startPlane,
    endClipPlane: endPlane
  }
}

function computeNeighborLayerPlane(
  wall: IntermediateWallWithGeometry,
  node: WallNodeWithGeometry,
  endpoint: 'start' | 'end',
  side: InteriorWallLayerSide,
  perimeterContext: PerimeterConstructionContext
): ClippingPlane | undefined {
  if (node.incidentWalls.length <= 1) return undefined

  const target = node.incidentWalls.find(incident => incident.id === wall.id)
  if (!target) return undefined

  const targetIndex = node.incidentWalls.indexOf(target)
  const targetUsesLeftBoundary = target.side === 'start' ? side === 'left' : side === 'right'
  const neighborIndex = targetUsesLeftBoundary
    ? (targetIndex + node.incidentWalls.length - 1) % node.incidentWalls.length
    : (targetIndex + 1) % node.incidentWalls.length
  const neighbor = node.incidentWalls[neighborIndex]

  const collinear = dotAbsVec2(target.direction, neighbor.direction) > 1 - 1e-6
  if (collinear) {
    const baseNormal = endpoint === 'start' ? wall.direction : negVec2(wall.direction)
    const nodePoint = node.type === 'perimeter' ? node.position : node.center
    return asClippingPlane(baseNormal, nodePoint)
  }

  const constructionLine = getConstructionBoundaryLine(
    neighbor,
    neighbor.side === 'start'
      ? targetUsesLeftBoundary
        ? 'right'
        : 'left'
      : targetUsesLeftBoundary
        ? 'left'
        : 'right',
    perimeterContext
  )
  if (!constructionLine) return undefined

  const point = constructionLine.point
  const normal = perpendicularCW(neighbor.direction)
  const orientedNormal =
    dotVec2(normal, wall.direction) * (endpoint === 'start' ? 1 : -1) > 1e-6 ? normal : negVec2(normal)
  return asClippingPlane(orientedNormal, point)
}

function getConstructionBoundaryLine(
  incident: WallNodeIncidentWall,
  side: 'left' | 'right',
  perimeterContext: PerimeterConstructionContext
): Line2D | undefined {
  if (isIntermediateWallId(incident.id)) {
    return perimeterContext.interiorWallGeometry.get(incident.id)?.coreLines[side]
  }
  return perimeterContext.innerLinesById[incident.id]
}

function extensionAtStart(plane: ClippingPlane, band: { start: Length; end: Length }): Length {
  const xs = planeLongitudinalPositions(plane, band)
  return xs ? Math.max(0, -Math.min(...xs)) : 0
}

function extensionAtEnd(plane: ClippingPlane, band: { start: Length; end: Length }, wallLength: Length): Length {
  const xs = planeLongitudinalPositions(plane, band)
  return xs ? Math.max(0, Math.max(...xs) - wallLength) : 0
}

function planeLongitudinalPositions(plane: ClippingPlane, band: { start: Length; end: Length }): number[] | undefined {
  const normalX = plane.normal[0]
  if (Math.abs(normalX) <= 1e-6) return undefined
  return [band.start, band.end].map(v => (plane.originOffset - plane.normal[1] * v) / normalX)
}

function computeNodeClipPlane(
  wall: IntermediateWallWithGeometry,
  node: WallNodeWithGeometry,
  endpoint: 'start' | 'end',
  perimeterContext: PerimeterConstructionContext
): ClippingPlane | undefined {
  const requiredSign = endpoint === 'start' ? 1 : -1

  if (node.type === 'perimeter') {
    const line = perimeterContext.innerLinesById[node.wallId]
    const baseNormal = perpendicularCCW(line.direction)
    const normal =
      dotVec2(baseNormal, wall.direction) * requiredSign > 1e-6 ? baseNormal : newVec2(-baseNormal[0], -baseNormal[1])
    return asClippingPlane(normal, line.point)
  }

  if (!node.constructedBy || node.constructedBy === wall.id || node.constructedWithColinear === wall.id) {
    return undefined
  }

  const constructing = perimeterContext.interiorWallGeometry.get(node.constructedBy)
  if (!constructing) return undefined

  const candidates = [
    { line: constructing.coreLines.left, normal: perpendicularCCW(constructing.coreLines.left.direction) },
    {
      line: constructing.coreLines.right,
      normal: newVec2(constructing.coreLines.right.direction[1], -constructing.coreLines.right.direction[0])
    }
  ]
  const candidate = candidates.find(({ normal }) => {
    const dot = normal[0] * wall.direction[0] + normal[1] * wall.direction[1]
    return dot * requiredSign > 1e-6
  })
  return candidate ? asClippingPlane(candidate.normal, candidate.line.point) : undefined
}

function asClippingPlane(normal: Vec2, point: Vec2): ClippingPlane {
  return {
    normal: vec2To3(normal),
    originOffset: dotVec2(normal, point)
  }
}

function computeWallEndpoints(
  wall: InteriorWallGeometry,
  endpoint: InteriorWallEndpoint,
  node: WallNodeWithGeometry,
  perimeterContext: PerimeterConstructionContext
): { left: Vec2; right: Vec2 } {
  if (node.type !== 'inner' || !node.constructedBy || !wall.start || !wall.end) return endpoint

  const geometry = perimeterContext.interiorWallGeometry.get(node.constructedBy)
  if (!geometry) return endpoint

  const left1 = lineIntersection(geometry.coreLines.left, wall.coreLines.left)
  const left2 = lineIntersection(geometry.coreLines.right, wall.coreLines.left)
  const right1 = lineIntersection(geometry.coreLines.left, wall.coreLines.right)
  const right2 = lineIntersection(geometry.coreLines.right, wall.coreLines.right)

  const dir = wall.coreLines.left.direction
  const midLeft = midpoint(wall.start.left, wall.end.left)
  const midRight = midpoint(wall.start.right, wall.end.right)

  if (!left1 || !left2 || !right1 || !right2) {
    const nodePolygon = perimeterContext.interiorWallNodePolygons.get(node.id)
    if (!nodePolygon) return endpoint

    const polygonLines = [...polygonEdges(nodePolygon)]
      .map(e => lineFromSegment(e))
      .filter(l => dotAbsVec2(l.direction, dir) < 0.9999)
    const leftPoints = polygonLines.map(l => lineIntersection(l, wall.coreLines.left)).filter(p => p != null)
    const rightPoints = polygonLines.map(l => lineIntersection(l, wall.coreLines.right)).filter(p => p != null)

    let leftDot = Infinity
    let left = endpoint.left
    for (const p of leftPoints) {
      const dot = Math.abs(projectVec2(midLeft, p, dir))
      if (dot < leftDot) {
        left = p
        leftDot = dot
      }
    }

    let rightDot = Infinity
    let right = endpoint.right
    for (const p of rightPoints) {
      const dot = Math.abs(projectVec2(midLeft, p, dir))
      if (dot < rightDot) {
        right = p
        rightDot = dot
      }
    }

    return { left, right }
  }

  const dotLeft1 = Math.abs(projectVec2(midLeft, left1, dir))
  const dotLeft2 = Math.abs(projectVec2(midLeft, left2, dir))
  const left = dotLeft1 < dotLeft2 ? left1 : left2

  const dotRight1 = Math.abs(projectVec2(midRight, right1, dir))
  const dotRight2 = Math.abs(projectVec2(midRight, right2, dir))
  const right = dotRight1 < dotRight2 ? right1 : right2

  return { left, right }
}

export function transformPolygonToWallCoordinates(polygon: Polygon2D, wall: IntermediateWallWithGeometry): Polygon2D {
  const origin = wall.entityReferenceLine.start
  const transverse = perpendicularCCW(wall.direction)
  const transformPoint = (point: Vec2): Vec2 => {
    const relative = subVec2(point, origin)
    return newVec2(dotVec2(relative, wall.direction), dotVec2(relative, transverse))
  }

  return { points: polygon.points.map(transformPoint) }
}

export function transformPlaneToWallCoordinates(
  plane: ClippingPlane,
  wall: IntermediateWallWithGeometry,
  wallBottom: Length = 0
): ClippingPlane {
  const wallInverse = invertTransform(intermediateWallTransform(wall, wallBottom))
  if (!wallInverse) throw new Error(`Unable to invert transform for intermediate wall ${wall.id}`)
  return transformPlane(plane, wallInverse)
}

function transformPlane(plane: ClippingPlane, transformMatrix: Transform): ClippingPlane {
  const normalLengthSquared = dotVec3(plane.normal, plane.normal)
  const point = newVec3(
    (plane.normal[0] * plane.originOffset) / normalLengthSquared,
    (plane.normal[1] * plane.originOffset) / normalLengthSquared,
    (plane.normal[2] * plane.originOffset) / normalLengthSquared
  )
  const transformedPoint = transform(point, transformMatrix)
  const transformedNormal = subVec3(transform(addVec3(point, plane.normal), transformMatrix), transformedPoint)

  return {
    normal: transformedNormal,
    originOffset: dotVec3(transformedNormal, transformedPoint)
  }
}

function* asResults(results: ConstructionResult[]): Generator<ConstructionResult> {
  yield* results
}

export function clipInteriorWallResults(
  results: ConstructionResult[],
  extension: InteriorWallClipping,
  wall: IntermediateWallWithGeometry,
  storeyHeight: Length,
  perimeterContext: PerimeterConstructionContext,
  wallTransform: Transform
): ConstructionResult[] {
  const geometry = perimeterContext.interiorWallGeometry.get(wall.id)
  if (!geometry) return results

  const clipPolygons = [extension.startClipPolygon, extension.endClipPolygon].filter(p => p != null)
  const clipPlanes = [extension.startClipPlane, extension.endClipPlane].filter(
    (plane): plane is ClippingPlane => plane != null
  )
  if (clipPolygons.length === 0 && clipPlanes.length === 0) return results

  const localPolygons = clipPolygons.map(p => transformPolygonToWallCoordinates(p, wall))
  const wallInverse = invertTransform(wallTransform)
  if (!wallInverse) throw new Error(`Unable to invert transform for intermediate wall ${wall.id}`)
  const localPlanes = clipPlanes.map(plane => transformPlane(plane, wallInverse))
  const clippingVolumes = localPolygons.map(p =>
    createExtrudedPolygon({ outer: p, holes: [] } satisfies PolygonWithHoles2D, 'xy', storeyHeight)
  )

  return Array.from(
    yieldAndClip(asResults(results), (manifold, item) => {
      const verticalOffset = fromTrans(newVec3(0, 0, item.transform[14]))
      const clipped = clippingVolumes.reduce(
        (current, clip) => current.subtract(transformManifold(clip.manifold, verticalOffset)),
        manifold
      )
      return localPlanes.reduce((current, plane) => {
        return current.trimByPlane([plane.normal[0], plane.normal[1], plane.normal[2]], plane.originOffset)
      }, clipped)
    })
  )
}
