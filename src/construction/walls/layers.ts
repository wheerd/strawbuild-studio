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
  type Polygon2D,
  type PolygonWithHoles2D,
  ensurePolygonIsClockwise,
  ensurePolygonIsCounterClockwise,
  mergeBounds,
  subtractPolygons
} from '@/shared/geometry'

import { calculateWallCornerInfo, getWallContext } from './corners/corners'
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

const rectangle = (start: Length, end: Length, bottom: Length, top: Length): Polygon2D => ({
  points: [
    vec2.fromValues(start, bottom),
    vec2.fromValues(start, top),
    vec2.fromValues(end, top),
    vec2.fromValues(end, bottom)
  ]
})

const clampInterval = (start: Length, end: Length, min: Length, max: Length): [Length, Length] | null => {
  const clampedStart = Math.max(start, min)
  const clampedEnd = Math.min(end, max)

  if (clampedEnd <= clampedStart) {
    return null
  }

  return [clampedStart, clampedEnd]
}

const createLayerPolygons = (
  wall: PerimeterWall,
  side: LayerSide,
  context: ReturnType<typeof getWallContext>,
  cornerInfo: ReturnType<typeof calculateWallCornerInfo>,
  bottom: Length,
  top: Length
): PolygonWithHoles2D[] => {
  const { getWallAssemblyById } = getConfigActions()

  const previousAssembly = getWallAssemblyById(context.previousWall.wallAssemblyId)
  const nextAssembly = getWallAssemblyById(context.nextWall.wallAssemblyId)

  if (!previousAssembly || !nextAssembly) {
    throw new Error('Unable to resolve neighbouring wall assemblies for layer construction')
  }

  const startDistance =
    side === 'inside'
      ? vec2.distance(wall.insideLine.start, context.startCorner.insidePoint)
      : vec2.distance(wall.outsideLine.start, context.startCorner.outsidePoint)

  const endDistance =
    side === 'inside'
      ? vec2.distance(wall.insideLine.end, context.endCorner.insidePoint)
      : vec2.distance(wall.outsideLine.end, context.endCorner.outsidePoint)

  const previousThickness =
    side === 'inside' ? previousAssembly.layers.insideThickness : previousAssembly.layers.outsideThickness
  const nextThickness = side === 'inside' ? nextAssembly.layers.insideThickness : nextAssembly.layers.outsideThickness

  const startDelta = startDistance - previousThickness
  const endDelta = endDistance - nextThickness

  const constructsStart = cornerInfo.startCorner.constructedByThisWall
  const constructsEnd = cornerInfo.endCorner.constructedByThisWall

  const startOffset = constructsStart ? Math.max(startDelta, 0) : Math.min(startDelta, 0)
  const endOffset = constructsEnd ? Math.max(endDelta, 0) : Math.min(endDelta, 0)

  const baseLength = side === 'inside' ? wall.insideLength : wall.outsideLength
  const startPosition = -startOffset
  const endPosition = baseLength + endOffset

  if (endPosition <= startPosition || top <= bottom) {
    return []
  }

  const cutouts = wall.openings
    .map(opening => {
      const openingStart = opening.offsetFromStart
      const openingEnd = openingStart + opening.width
      const horizontal = clampInterval(openingStart, openingEnd, startPosition, endPosition)
      if (!horizontal) return null

      const sill = opening.sillHeight ?? 0
      const openingBottom = bottom + sill
      const openingTop = openingBottom + opening.height
      const vertical = clampInterval(openingBottom, openingTop, bottom, top)
      if (!vertical) return null

      return ensurePolygonIsCounterClockwise(rectangle(horizontal[0], horizontal[1], vertical[0], vertical[1]))
    })
    .filter((polygon): polygon is Polygon2D => polygon !== null)

  const outer = ensurePolygonIsClockwise(rectangle(startPosition, endPosition, bottom, top))

  if (cutouts.length === 0) {
    return [
      {
        outer,
        holes: []
      }
    ]
  }

  const subtracted = subtractPolygons([outer], cutouts)
  return subtracted.length > 0 ? subtracted : []
}

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
  const cornerInfo = calculateWallCornerInfo(wall, context)

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

  const insidePolygons = createLayerPolygons(wall, 'inside', context, cornerInfo, bottom, top)
  const outsidePolygons = createLayerPolygons(wall, 'outside', context, cornerInfo, bottom, top)

  const layerResults: ConstructionResult[] = []

  if (insidePolygons.length > 0 && layers.insideLayers.length > 0) {
    let insideOffset: Length = 0
    for (const layer of layers.insideLayers) {
      for (const polygon of insidePolygons) {
        layerResults.push(...runLayerConstruction(polygon, insideOffset, WALL_LAYER_PLANE, layer))
      }
      insideOffset = (insideOffset + layer.thickness) as Length
    }
  }

  if (outsidePolygons.length > 0 && layers.outsideLayers.length > 0) {
    let outsideOffset: Length = (wall.thickness - layers.outsideThickness) as Length
    for (const layer of layers.outsideLayers) {
      for (const polygon of outsidePolygons) {
        layerResults.push(...runLayerConstruction(polygon, outsideOffset, WALL_LAYER_PLANE, layer))
      }
      outsideOffset = (outsideOffset + layer.thickness) as Length
    }
  }

  const rawModel = aggregateLayerResults(layerResults)
  return rawModel
}
