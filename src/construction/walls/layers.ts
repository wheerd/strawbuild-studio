import { vec2 } from 'gl-matrix'

import type { Perimeter, PerimeterWall } from '@/building/model/model'
import type { GroupOrElement } from '@/construction/elements'
import { IDENTITY } from '@/construction/geometry'
import { LAYER_CONSTRUCTIONS } from '@/construction/layers'
import type { LayerConfig, MonolithicLayerConfig, StripedLayerConfig } from '@/construction/layers/types'
import { type ConstructionModel, createConstructionGroup } from '@/construction/model'
import { type ConstructionResult, aggregateResults } from '@/construction/results'
import { TAG_LAYERS, TAG_WALL_LAYER_INSIDE, TAG_WALL_LAYER_OUTSIDE, createTag } from '@/construction/tags'
import {
  Bounds3D,
  type Length,
  type Plane3D,
  type PolygonWithHoles2D,
  ensurePolygonIsClockwise,
  ensurePolygonIsCounterClockwise,
  simplifyPolygon
} from '@/shared/geometry'
import { lineFromSegment, lineIntersection } from '@/shared/geometry/line'

import { getWallContext } from './corners/corners'
import type { WallStoreyContext } from './segmentation'
import type { WallLayersConfig } from './types'

type LayerSide = 'inside' | 'outside'

const WALL_LAYER_PLANE: Plane3D = 'xz'

const clonePolygon = (polygon: PolygonWithHoles2D): PolygonWithHoles2D => ({
  outer: {
    points: polygon.outer.points.map(point => vec2.fromValues(point[0], point[1]))
  },
  holes: polygon.holes.map(hole => ({
    points: hole.points.map(point => vec2.fromValues(point[0], point[1]))
  }))
})

const runLayerConstruction = (
  polygon: PolygonWithHoles2D,
  offset: Length,
  plane: Plane3D,
  layer: LayerConfig
): ConstructionResult[] => {
  if (layer.type === 'monolithic') {
    const construction = LAYER_CONSTRUCTIONS.monolithic as (typeof LAYER_CONSTRUCTIONS)['monolithic']
    return Array.from(construction.construct(clonePolygon(polygon), offset, plane, layer as MonolithicLayerConfig))
  }
  if (layer.type === 'striped') {
    const construction = LAYER_CONSTRUCTIONS.striped as (typeof LAYER_CONSTRUCTIONS)['striped']
    return Array.from(construction.construct(clonePolygon(polygon), offset, plane, layer as StripedLayerConfig))
  }
  throw new Error(`Unsupported layer type: ${(layer as { type: string }).type}`)
}

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
  context: ReturnType<typeof getWallContext>
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

const computeLayerSpan = (
  side: LayerSide,
  depth: Length,
  wall: PerimeterWall,
  context: ReturnType<typeof getWallContext>
): { start: Length; end: Length } => {
  const startPoint = computeCornerIntersection('start', side, depth, wall, context)
  const endPoint = computeCornerIntersection('end', side, depth, wall, context)

  const startProjection = projectAlongWall(wall, startPoint)
  const endProjection = projectAlongWall(wall, endPoint)

  return startProjection <= endProjection
    ? { start: startProjection, end: endProjection }
    : { start: endProjection, end: startProjection }
}

const createLayerPolygon = (start: Length, end: Length, bottom: Length, top: Length): PolygonWithHoles2D => ({
  outer: ensurePolygonIsClockwise(
    simplifyPolygon({
      points: [
        vec2.fromValues(start, bottom),
        vec2.fromValues(start, top),
        vec2.fromValues(end, top),
        vec2.fromValues(end, bottom)
      ]
    })
  ),
  holes: []
})

const subtractOpenings = (
  polygon: PolygonWithHoles2D,
  start: Length,
  end: Length,
  bottom: Length,
  top: Length,
  wall: PerimeterWall,
  finishedFloorHeight: Length
): PolygonWithHoles2D => {
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

      return ensurePolygonIsCounterClockwise(
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
    return polygon
  }

  return {
    outer: polygon.outer,
    holes
  }
}

const normalizePolygonWithHoles = (polygon: PolygonWithHoles2D): PolygonWithHoles2D => ({
  outer: ensurePolygonIsClockwise(simplifyPolygon(polygon.outer)),
  holes: polygon.holes.map(hole => ensurePolygonIsCounterClockwise(simplifyPolygon(hole)))
})

const aggregateLayerResults = (results: ConstructionResult[]): ConstructionModel => {
  const aggregated = aggregateResults(results)
  return { ...aggregated, bounds: Bounds3D.merge(...aggregated.elements.map(element => element.bounds)) }
}

export function constructWallLayers(
  wall: PerimeterWall,
  perimeter: Perimeter,
  storeyContext: WallStoreyContext,
  layers: WallLayersConfig
): ConstructionModel {
  const context = getWallContext(wall, perimeter)

  const totalConstructionHeight =
    storeyContext.storeyHeight + storeyContext.floorTopOffset + storeyContext.ceilingBottomOffset

  const baseInsideSpan = computeLayerSpan('inside', 0 as Length, wall, context)
  const baseOutsideSpan = computeLayerSpan('outside', layers.outsideThickness, wall, context)

  const layerResults: ConstructionResult[] = []

  if (layers.insideLayers.length > 0) {
    let insideOffset: Length = 0
    let cumulativeInside: Length = 0
    let previousSpan = baseInsideSpan

    layers.insideLayers.forEach(layer => {
      cumulativeInside = (cumulativeInside + layer.thickness) as Length
      const span = computeLayerSpan('inside', cumulativeInside, wall, context)
      const start = Math.min(span.start, previousSpan.start)
      const end = Math.max(span.end, previousSpan.end)
      const bottom = storeyContext.floorTopConstructionOffset
      const top = totalConstructionHeight - storeyContext.floorTopConstructionOffset
      const polygon = createLayerPolygon(start, end, bottom, top)
      const polygonWithHoles = subtractOpenings(polygon, start, end, bottom, top, wall, storeyContext.floorTopOffset)
      const normalizedPolygon = normalizePolygonWithHoles(polygonWithHoles)
      const results = runLayerConstruction(normalizedPolygon, insideOffset, WALL_LAYER_PLANE, layer)
      const layerElements: GroupOrElement[] = []
      for (const result of results) {
        if (result.type === 'element') {
          layerElements.push(result.element)
        } else {
          layerResults.push(result)
        }
      }
      if (layerElements.length > 0) {
        const customTag = createTag('wall-layer', layer.name)
        const group = createConstructionGroup(layerElements, IDENTITY, [TAG_WALL_LAYER_INSIDE, TAG_LAYERS, customTag])
        layerResults.push({ type: 'element', element: group })
      }
      insideOffset = (insideOffset + layer.thickness) as Length
      previousSpan = span
    })
  }

  if (layers.outsideLayers.length > 0) {
    let outsideOffset: Length = (wall.thickness - layers.outsideThickness) as Length
    let remainingOutside: Length = layers.outsideThickness
    let previousSpan = baseOutsideSpan
    layers.outsideLayers.forEach(layer => {
      remainingOutside = (remainingOutside - layer.thickness) as Length
      const depth = Math.max(remainingOutside, 0) as Length
      const span = computeLayerSpan('outside', depth, wall, context)
      const start = Math.min(span.start, previousSpan.start)
      const end = Math.max(span.end, previousSpan.end)
      const bottom = -storeyContext.floorConstructionThickness
      const top = totalConstructionHeight
      const polygon = createLayerPolygon(start, end, bottom, top)
      const polygonWithHoles = subtractOpenings(polygon, start, end, bottom, top, wall, storeyContext.floorTopOffset)
      const normalizedPolygon = normalizePolygonWithHoles(polygonWithHoles)
      const results = runLayerConstruction(normalizedPolygon, outsideOffset, WALL_LAYER_PLANE, layer)
      const layerElements: GroupOrElement[] = []
      for (const result of results) {
        if (result.type === 'element') {
          layerElements.push(result.element)
        } else {
          layerResults.push(result)
        }
      }
      if (layerElements.length > 0) {
        const customTag = createTag('wall-layer', layer.name)
        const group = createConstructionGroup(layerElements, IDENTITY, [TAG_WALL_LAYER_OUTSIDE, TAG_LAYERS, customTag])
        layerResults.push({ type: 'element', element: group })
      }
      outsideOffset = (outsideOffset + layer.thickness) as Length
      previousSpan = span
    })
  }

  const rawModel = aggregateLayerResults(layerResults)
  return rawModel
}
