import { vec2, vec3 } from 'gl-matrix'

import type { Perimeter, PerimeterWall } from '@/building/model/model'
import { getConfigActions } from '@/construction/config'
import { LAYER_CONSTRUCTIONS } from '@/construction/layers'
import type { LayerConfig, MonolithicLayerConfig, StripedLayerConfig } from '@/construction/layers/types'
import { type ConstructionModel } from '@/construction/model'
import { type ConstructionResult, aggregateResults } from '@/construction/results'
import {
  type Bounds3D,
  type Length,
  type Plane3D,
  type PolygonWithHoles2D,
  ensurePolygonIsClockwise,
  ensurePolygonIsCounterClockwise,
  mergeBounds,
  simplifyPolygon
} from '@/shared/geometry'
import { lineFromSegment, lineIntersection } from '@/shared/geometry/line'

import { getWallContext } from './corners/corners'
import type { WallStoreyContext } from './segmentation'
import type { WallLayersConfig } from './types'

type LayerSide = 'inside' | 'outside'

const WALL_LAYER_PLANE: Plane3D = 'xz'

const ZERO_BOUNDS = {
  min: vec3.fromValues(0, 0, 0),
  max: vec3.fromValues(0, 0, 0)
} satisfies Bounds3D

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

  if (aggregated.elements.length === 0) {
    return {
      elements: [],
      measurements: aggregated.measurements,
      areas: aggregated.areas,
      errors: aggregated.errors,
      warnings: aggregated.warnings,
      bounds: ZERO_BOUNDS
    }
  }

  return {
    elements: aggregated.elements,
    measurements: aggregated.measurements,
    areas: aggregated.areas,
    errors: aggregated.errors,
    warnings: aggregated.warnings,
    bounds: mergeBounds(...aggregated.elements.map(element => element.bounds))
  }
}

export function constructWallLayers(
  wall: PerimeterWall,
  perimeter: Perimeter,
  storeyContext: WallStoreyContext,
  layers: WallLayersConfig
): ConstructionModel {
  const { getRingBeamAssemblyById } = getConfigActions()

  const context = getWallContext(wall, perimeter)
  const basePlateAssembly = perimeter.baseRingBeamAssemblyId
    ? getRingBeamAssemblyById(perimeter.baseRingBeamAssemblyId)
    : null
  const topPlateAssembly = perimeter.topRingBeamAssemblyId
    ? getRingBeamAssemblyById(perimeter.topRingBeamAssemblyId)
    : null

  const basePlateHeight = basePlateAssembly?.height ?? 0
  const topPlateHeight = topPlateAssembly?.height ?? 0

  const totalConstructionHeight =
    storeyContext.storeyHeight + storeyContext.floorTopOffset + storeyContext.ceilingBottomOffset

  const bottom = basePlateHeight
  const top = totalConstructionHeight - topPlateHeight

  const baseInsideSpan = computeLayerSpan('inside', 0 as Length, wall, context)
  const baseOutsideSpan = computeLayerSpan('outside', layers.outsideThickness, wall, context)

  const layerResults: ConstructionResult[] = []

  if (layers.insideLayers.length > 0) {
    let insideOffset: Length = 0
    let cumulativeInside: Length = 0
    let previousSpan = baseInsideSpan

    for (const layer of layers.insideLayers) {
      cumulativeInside = (cumulativeInside + layer.thickness) as Length
      const span = computeLayerSpan('inside', cumulativeInside, wall, context)
      const start = Math.min(span.start, previousSpan.start)
      const end = Math.max(span.end, previousSpan.end)
      const polygon = createLayerPolygon(start, end, bottom, top)
      const polygonWithHoles = subtractOpenings(
        polygon,
        start,
        end,
        bottom,
        top,
        wall,
        storeyContext.floorTopOffset
      )
      const normalizedPolygon = normalizePolygonWithHoles(polygonWithHoles)
      layerResults.push(...runLayerConstruction(normalizedPolygon, insideOffset, WALL_LAYER_PLANE, layer))
      insideOffset = (insideOffset + layer.thickness) as Length
      previousSpan = span
    }
  }

  if (layers.outsideLayers.length > 0) {
    let outsideOffset: Length = (wall.thickness - layers.outsideThickness) as Length
    let remainingOutside: Length = layers.outsideThickness
    let previousSpan = baseOutsideSpan

    for (const layer of layers.outsideLayers) {
      remainingOutside = (remainingOutside - layer.thickness) as Length
      const depth = Math.max(remainingOutside, 0) as Length
      const span = computeLayerSpan('outside', depth, wall, context)
      const start = Math.min(span.start, previousSpan.start)
      const end = Math.max(span.end, previousSpan.end)
      const polygon = createLayerPolygon(start, end, bottom, top)
      const polygonWithHoles = subtractOpenings(
        polygon,
        start,
        end,
        bottom,
        top,
        wall,
        storeyContext.floorTopOffset
      )
      const normalizedPolygon = normalizePolygonWithHoles(polygonWithHoles)
      layerResults.push(...runLayerConstruction(normalizedPolygon, outsideOffset, WALL_LAYER_PLANE, layer))
      outsideOffset = (outsideOffset + layer.thickness) as Length
      previousSpan = span
    }
  }

  const rawModel = aggregateLayerResults(layerResults)
  return rawModel
}
