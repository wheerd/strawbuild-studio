import { vec2 } from 'gl-matrix'

import type { FloorAssemblyConfigBase, FloorLayersConfig } from '@/construction/floors/types'
import { LAYER_CONSTRUCTIONS } from '@/construction/layers'
import type { LayerConfig, MonolithicLayerConfig, StripedLayerConfig } from '@/construction/layers/types'
import { type ConstructionModel } from '@/construction/model'
import { type ConstructionResult, aggregateResults, yieldAsGroup } from '@/construction/results'
import { TAG_FLOOR_LAYER_BOTTOM, TAG_FLOOR_LAYER_TOP, TAG_LAYERS, createTag } from '@/construction/tags'
import {
  Bounds3D,
  type Length,
  type Polygon2D,
  type PolygonWithHoles2D,
  ensurePolygonIsClockwise,
  ensurePolygonIsCounterClockwise,
  simplifyPolygon,
  subtractPolygons
} from '@/shared/geometry'

interface FloorLayerOptions {
  finishedPolygon: Polygon2D
  topHoles: Polygon2D[]
  ceilingHoles: Polygon2D[]
  currentFloorConfig: FloorAssemblyConfigBase
  nextFloorConfig: FloorAssemblyConfigBase | null
  floorTopOffset: Length
  ceilingStartHeight: Length
}

const normalizePolygon = (polygon: Polygon2D, clockwise: boolean): Polygon2D =>
  clockwise
    ? ensurePolygonIsClockwise(simplifyPolygon(polygon))
    : ensurePolygonIsCounterClockwise(simplifyPolygon(polygon))

const clonePolygonWithHoles = (polygon: PolygonWithHoles2D): PolygonWithHoles2D => ({
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
  config: LayerConfig
): Generator<ConstructionResult> => {
  if (config.type === 'monolithic') {
    const construction = LAYER_CONSTRUCTIONS.monolithic as (typeof LAYER_CONSTRUCTIONS)['monolithic']
    return construction.construct(clonePolygonWithHoles(polygon), offset, 'xy', config as MonolithicLayerConfig)
  }

  if (config.type === 'striped') {
    const construction = LAYER_CONSTRUCTIONS.striped as (typeof LAYER_CONSTRUCTIONS)['striped']
    return construction.construct(clonePolygonWithHoles(polygon), offset, 'xy', config as StripedLayerConfig)
  }

  throw new Error('Unsupported layer type')
}

const buildPolygonWithHoles = (outer: Polygon2D, holes: Polygon2D[]): PolygonWithHoles2D[] =>
  subtractPolygons(
    [normalizePolygon(outer, true)],
    holes.map(hole => normalizePolygon(hole, false))
  )

function* constructTopLayers(
  basePolygons: PolygonWithHoles2D[],
  layers: FloorLayersConfig,
  floorTopOffset: Length
): Generator<ConstructionResult> {
  if (layers.topLayers.length === 0 || layers.topThickness <= 0) {
    return
  }

  const offset = (floorTopOffset - layers.topThickness) as Length
  let cumulative = 0 as Length

  for (const layer of layers.topLayers) {
    cumulative = (cumulative + layer.thickness) as Length
    const currentOffset = (offset + (cumulative - layer.thickness)) as Length
    const customTag = createTag('floor-layer', layer.name)
    for (const polygon of basePolygons) {
      yield* yieldAsGroup(runLayerConstruction(polygon, currentOffset, layer), [
        TAG_FLOOR_LAYER_TOP,
        TAG_LAYERS,
        customTag
      ])
    }
  }
}

function* constructCeilingLayers(
  basePolygons: PolygonWithHoles2D[],
  layers: FloorLayersConfig,
  ceilingStartHeight: Length
): Generator<ConstructionResult> {
  if (layers.bottomLayers.length === 0 || layers.bottomThickness <= 0) {
    return null
  }

  let cumulative = 0 as Length

  for (const layer of layers.bottomLayers) {
    cumulative = (cumulative + layer.thickness) as Length
    const offset = (ceilingStartHeight - cumulative) as Length
    const customTag = createTag('floor-layer', layer.name)
    for (const polygon of basePolygons) {
      yield* yieldAsGroup(runLayerConstruction(polygon, offset, layer), [TAG_FLOOR_LAYER_BOTTOM, TAG_LAYERS, customTag])
    }
  }
}

export function* constructFloorLayers({
  finishedPolygon,
  topHoles,
  ceilingHoles,
  currentFloorConfig,
  nextFloorConfig,
  floorTopOffset,
  ceilingStartHeight
}: FloorLayerOptions): Generator<ConstructionResult> {
  const topPolygon = buildPolygonWithHoles(finishedPolygon, topHoles)
  yield* constructTopLayers(topPolygon, currentFloorConfig.layers, floorTopOffset)

  if (nextFloorConfig) {
    const ceilingPolygon = buildPolygonWithHoles(finishedPolygon, ceilingHoles)
    yield* constructCeilingLayers(ceilingPolygon, nextFloorConfig.layers, ceilingStartHeight)
  }
}

export function constructFloorLayerModel(options: FloorLayerOptions): ConstructionModel | null {
  const floorLayersConstruction = Array.from(constructFloorLayers(options))

  if (floorLayersConstruction.length === 0) {
    return null
  }

  const results = aggregateResults(floorLayersConstruction)

  if (results.elements.length === 0) {
    return null
  }

  return {
    ...results,
    bounds: Bounds3D.merge(...results.elements.map(element => element.bounds))
  }
}
