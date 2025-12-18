import { vec2, vec3 } from 'gl-matrix'

import type { StoreyId } from '@/building/model/ids'
import type { Perimeter, PerimeterWall } from '@/building/model/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import type { PerimeterConstructionContext } from '@/construction/context'
import type { GroupOrElement } from '@/construction/elements'
import { IDENTITY, WallConstructionArea } from '@/construction/geometry'
import { LAYER_CONSTRUCTIONS } from '@/construction/layers'
import type { LayerConfig, MonolithicLayerConfig, StripedLayerConfig } from '@/construction/layers/types'
import { type ConstructionModel, createConstructionGroup } from '@/construction/model'
import { type ConstructionResult, aggregateResults } from '@/construction/results'
import { resolveRoofAssembly } from '@/construction/roofs'
import type { HeightLine } from '@/construction/roofs/types'
import { TAG_LAYERS, TAG_WALL_LAYER_INSIDE, TAG_WALL_LAYER_OUTSIDE, createTag } from '@/construction/tags'
import {
  Bounds3D,
  type Length,
  type LineSegment2D,
  type Plane3D,
  type PolygonWithHoles2D,
  ensurePolygonIsClockwise,
  simplifyPolygon
} from '@/shared/geometry'

import { getWallContext } from './corners/corners'
import { computeLayerSpan, subtractWallOpenings } from './polygons'
import { type WallTopOffsets, convertHeightLineToWallOffsets, fillNullRegions } from './roofIntegration'
import type { WallStoreyContext } from './segmentation'
import type { WallConfig, WallLayersConfig } from './types'

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

/**
 * Query all roofs for a storey and get the height line for a specific layer line
 * Similar to getRoofHeightLineForWall but uses a single line query (no inside/outside merge)
 */
function getRoofHeightLineForLayer(
  storeyId: StoreyId,
  layerLine: LineSegment2D,
  wallLength: Length,
  ceilingBottomOffset: Length,
  perimeterContexts: PerimeterConstructionContext[]
): WallTopOffsets | undefined {
  const { getRoofsByStorey } = getModelActions()
  const { getRoofAssemblyById } = getConfigActions()

  const roofs = getRoofsByStorey(storeyId)

  const heightLine: HeightLine = []

  // Query each roof
  for (const roof of roofs) {
    const roofAssembly = getRoofAssemblyById(roof.assemblyId)
    if (!roofAssembly) continue

    const roofImpl = resolveRoofAssembly(roofAssembly)

    // Get height line for this layer's line
    const line = roofImpl.getBottomOffsets(roof, layerLine, perimeterContexts)
    heightLine.push(...line)
  }

  if (heightLine.length === 0) {
    return [vec2.fromValues(0, -ceilingBottomOffset), vec2.fromValues(wallLength, -ceilingBottomOffset)]
  }

  // STEP 1: Merge (sort by position)
  heightLine.sort((a, b) => a.position - b.position)

  // STEP 2: Fill null regions with ceiling offset
  const filled = fillNullRegions(heightLine, ceilingBottomOffset)

  // Convert to wall offsets
  return convertHeightLineToWallOffsets(filled, wallLength)
}

export function constructWallLayers(
  wall: PerimeterWall,
  perimeter: Perimeter,
  storeyContext: WallStoreyContext,
  layers: WallLayersConfig,
  config: WallConfig
): ConstructionModel {
  const context = getWallContext(wall, perimeter)

  const totalConstructionHeight =
    storeyContext.ceilingHeight + storeyContext.floorTopOffset + storeyContext.ceilingBottomOffset
  const ceilingOffset = storeyContext.storeyHeight - totalConstructionHeight

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
      const top = storeyContext.storeyHeight - storeyContext.floorTopConstructionOffset

      // Query roof for this layer's height line
      const layerTopOffsets = getRoofHeightLineForLayer(
        perimeter.storeyId,
        span.line,
        span.end - span.start,
        ceilingOffset,
        storeyContext.perimeterContexts
      )

      // Create WallConstructionArea with roof-adjusted top
      const layerArea = new WallConstructionArea(
        vec3.fromValues(start, 0, bottom),
        vec3.fromValues(end - start, 0, top - bottom),
        layerTopOffsets
      )

      // Extract polygon from area (handles roof slopes)
      const polygon = ensurePolygonIsClockwise(simplifyPolygon(layerArea.getSideProfilePolygon()))
      const polygonsWithHoles = subtractWallOpenings(
        polygon,
        start,
        end,
        bottom,
        top,
        wall,
        storeyContext.floorTopOffset,
        config
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
      const top = storeyContext.storeyHeight - storeyContext.floorTopConstructionOffset

      // Query roof for this layer's height line
      const layerTopOffsets = getRoofHeightLineForLayer(
        perimeter.storeyId,
        span.line,
        span.end - span.start,
        ceilingOffset,
        storeyContext.perimeterContexts
      )

      // Create WallConstructionArea with roof-adjusted top
      const layerArea = new WallConstructionArea(
        vec3.fromValues(start, 0, bottom),
        vec3.fromValues(end - start, 0, top - bottom),
        layerTopOffsets
      )

      // Extract polygon from area (handles roof slopes)
      const polygon = ensurePolygonIsClockwise(simplifyPolygon(layerArea.getSideProfilePolygon()))
      const polygonsWithHoles = subtractWallOpenings(
        polygon,
        start,
        end,
        bottom,
        top,
        wall,
        storeyContext.floorTopOffset,
        config
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
