import type { Perimeter, PerimeterWall } from '@/building/model'
import type { GroupOrElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import { LAYER_CONSTRUCTIONS } from '@/construction/layers'
import type { LayerConfig, MonolithicLayerConfig, StripedLayerConfig } from '@/construction/layers/types'
import { type ConstructionModel, createConstructionGroup } from '@/construction/model'
import { type ConstructionResult, aggregateResults } from '@/construction/results'
import type { StoreyContext } from '@/construction/storeys/context'
import { TAG_LAYERS, TAG_WALL_LAYER_INSIDE, TAG_WALL_LAYER_OUTSIDE, createTag } from '@/construction/tags'
import {
  Bounds3D,
  IDENTITY,
  type Length,
  type Plane3D,
  type PolygonWithHoles2D,
  type Vec2,
  ensurePolygonIsClockwise,
  newVec2,
  newVec3,
  signedAngleVec2,
  simplifyPolygon
} from '@/shared/geometry'

import { getWallContext } from './corners/corners'
import { computeLayerSpan, subtractWallOpenings } from './polygons'
import { convertHeightLineToWallOffsets, getRoofHeightLineForLines } from './roofIntegration'
import type { WallLayersConfig } from './types'

const WALL_LAYER_PLANE: Plane3D = 'xz'

const clonePolygon = (polygon: PolygonWithHoles2D): PolygonWithHoles2D => ({
  outer: {
    points: polygon.outer.points.map(point => newVec2(point[0], point[1]))
  },
  holes: polygon.holes.map(hole => ({
    points: hole.points.map(point => newVec2(point[0], point[1]))
  }))
})

const runLayerConstruction = (
  polygon: PolygonWithHoles2D,
  offset: Length,
  plane: Plane3D,
  layer: LayerConfig,
  layerDirection: Vec2
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
  storeyContext: StoreyContext,
  layers: WallLayersConfig
): ConstructionModel {
  const context = getWallContext(wall, perimeter)

  const baseInsideSpan = computeLayerSpan('inside', 0 as Length, wall, context)
  const baseOutsideSpan = computeLayerSpan('outside', layers.outsideThickness, wall, context)

  const layerResults: ConstructionResult[] = []

  const wallDirection = signedAngleVec2(wall.direction, newVec2(1, 0))
  const layerDirection = wallDirection < 0 ? newVec2(0, 1) : newVec2(0, -1)

  if (layers.insideLayers.length > 0) {
    let insideOffset: Length = 0
    let previousSpan = baseInsideSpan

    const bottom = storeyContext.floorConstructionTop - storeyContext.wallBottom
    const top = storeyContext.ceilingConstructionBottom - storeyContext.wallBottom
    const ceilingOffset = storeyContext.roofBottom - storeyContext.ceilingConstructionBottom
    const zAdjustment = storeyContext.finishedFloorTop - storeyContext.wallBottom

    const insideLayers = [...layers.insideLayers].reverse()
    insideLayers.forEach(layer => {
      const cumulativeInside = (insideOffset + layer.thickness) as Length
      const span = computeLayerSpan('inside', cumulativeInside, wall, context)
      const start = Math.min(span.start, previousSpan.start)
      const end = Math.max(span.end, previousSpan.end)

      // Query roof for this layer's height line
      const heightLine = getRoofHeightLineForLines(
        perimeter.storeyId,
        [span.line],
        ceilingOffset,
        storeyContext.perimeterContexts
      )
      const layerTopOffsets = convertHeightLineToWallOffsets(heightLine, span.end - span.start)

      // Create WallConstructionArea with roof-adjusted top
      const layerArea = new WallConstructionArea(
        newVec3(start, 0, bottom),
        newVec3(end - start, 0, top - bottom),
        layerTopOffsets
      )

      // Extract polygon from area (handles roof slopes)
      const polygon = ensurePolygonIsClockwise(simplifyPolygon(layerArea.getSideProfilePolygon()))
      const polygonsWithHoles = subtractWallOpenings(polygon, start, end, bottom, top, wall, zAdjustment)
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
        const customTag = createTag('wall-layer', layer.name, layer.nameKey)
        const group = createConstructionGroup(layerElements, IDENTITY, [TAG_WALL_LAYER_INSIDE, TAG_LAYERS, customTag])
        layerResults.push({ type: 'element', element: group })
      }
      if (!layer.overlap) {
        insideOffset = (insideOffset + layer.thickness) as Length
        previousSpan = span
      }
    })
  }

  if (layers.outsideLayers.length > 0) {
    const bottom = storeyContext.floorBottom - storeyContext.wallBottom
    const top = storeyContext.wallTop - storeyContext.wallBottom
    const ceilingOffset = storeyContext.roofBottom - storeyContext.wallTop
    const zAdjustment = storeyContext.finishedFloorTop - storeyContext.wallBottom

    let outsideOffset: Length = (wall.thickness - layers.outsideThickness) as Length
    let previousSpan = baseOutsideSpan
    layers.outsideLayers.forEach(layer => {
      const remainingOutside = wall.thickness - outsideOffset - layer.thickness
      const depth = Math.max(remainingOutside, 0) as Length
      const span = computeLayerSpan('outside', depth, wall, context)
      const start = Math.min(span.start, previousSpan.start)
      const end = Math.max(span.end, previousSpan.end)

      // Query roof for this layer's height line
      const heightLine = getRoofHeightLineForLines(
        perimeter.storeyId,
        [span.line],
        -ceilingOffset,
        storeyContext.perimeterContexts
      )
      const layerTopOffsets = convertHeightLineToWallOffsets(heightLine, span.end - span.start)

      // Create WallConstructionArea with roof-adjusted top
      const layerArea = new WallConstructionArea(
        newVec3(start, 0, bottom),
        newVec3(end - start, 0, top - bottom),
        layerTopOffsets
      )

      // Extract polygon from area (handles roof slopes)
      const polygon = ensurePolygonIsClockwise(simplifyPolygon(layerArea.getSideProfilePolygon()))
      const polygonsWithHoles = subtractWallOpenings(polygon, start, end, bottom, top, wall, zAdjustment)
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
        const customTag = createTag('wall-layer', layer.name, layer.nameKey)
        const group = createConstructionGroup(layerElements, IDENTITY, [TAG_WALL_LAYER_OUTSIDE, TAG_LAYERS, customTag])
        layerResults.push({ type: 'element', element: group })
      }
      if (!layer.overlap) {
        outsideOffset = (outsideOffset + layer.thickness) as Length
        previousSpan = span
      }
    })
  }

  const rawModel = aggregateLayerResults(layerResults)
  return rawModel
}
