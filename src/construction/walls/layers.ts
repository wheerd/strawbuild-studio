import { vec2 } from 'gl-matrix'

import type { Perimeter, PerimeterWall } from '@/building/model/model'
import type { GroupOrElement } from '@/construction/elements'
import { IDENTITY } from '@/construction/geometry'
import { LAYER_CONSTRUCTIONS } from '@/construction/layers'
import type { LayerConfig, MonolithicLayerConfig, StripedLayerConfig } from '@/construction/layers/types'
import { type ConstructionModel, createConstructionGroup } from '@/construction/model'
import { type ConstructionResult, aggregateResults } from '@/construction/results'
import { TAG_LAYERS, TAG_WALL_LAYER_INSIDE, TAG_WALL_LAYER_OUTSIDE, createTag } from '@/construction/tags'
import { Bounds3D, type Length, type Plane3D, type PolygonWithHoles2D } from '@/shared/geometry'

import { getWallContext } from './corners/corners'
import { computeLayerSpan, createLayerPolygon, subtractWallOpenings } from './polygons'
import type { WallStoreyContext } from './segmentation'
import type { WallLayersConfig } from './types'

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
  layer: LayerConfig,
  layerDirection: vec2
): ConstructionResult[] => {
  if (layer.type === 'monolithic') {
    const construction = LAYER_CONSTRUCTIONS.monolithic as (typeof LAYER_CONSTRUCTIONS)['monolithic']
    return Array.from(
      construction.construct(clonePolygon(polygon), offset, plane, layer as MonolithicLayerConfig, layerDirection)
    )
  }
  if (layer.type === 'striped') {
    const construction = LAYER_CONSTRUCTIONS.striped as (typeof LAYER_CONSTRUCTIONS)['striped']
    return Array.from(
      construction.construct(clonePolygon(polygon), offset, plane, layer as StripedLayerConfig, layerDirection)
    )
  }
  throw new Error(`Unsupported layer type: ${(layer as { type: string }).type}`)
}

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

  const wallDirection = vec2.signedAngle(wall.direction, vec2.fromValues(1, 0))
  const layerDirection = wallDirection < 0 ? vec2.fromValues(0, 1) : vec2.fromValues(0, -1)

  if (layers.insideLayers.length > 0) {
    let insideOffset: Length = 0
    let cumulativeInside: Length = 0
    let previousSpan = baseInsideSpan

    const insideLayers = [...layers.insideLayers].reverse()
    insideLayers.forEach(layer => {
      cumulativeInside = (cumulativeInside + layer.thickness) as Length
      const span = computeLayerSpan('inside', cumulativeInside, wall, context)
      const start = Math.min(span.start, previousSpan.start)
      const end = Math.max(span.end, previousSpan.end)
      const bottom = storeyContext.floorTopConstructionOffset
      const top = totalConstructionHeight - storeyContext.floorTopConstructionOffset
      const polygon = createLayerPolygon(start, end, bottom, top)
      const polygonsWithHoles = subtractWallOpenings(
        polygon,
        start,
        end,
        bottom,
        top,
        wall,
        storeyContext.floorTopOffset
      )
      const results = polygonsWithHoles.flatMap(p =>
        runLayerConstruction(p, insideOffset, WALL_LAYER_PLANE, layer, layerDirection)
      )
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
      const polygonsWithHoles = subtractWallOpenings(
        polygon,
        start,
        end,
        bottom,
        top,
        wall,
        storeyContext.floorTopOffset
      )
      const results = polygonsWithHoles.flatMap(p =>
        runLayerConstruction(p, outsideOffset, WALL_LAYER_PLANE, layer, layerDirection)
      )
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
