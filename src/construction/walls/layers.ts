import { type PerimeterWallWithGeometry, isOpeningId } from '@/building/model'
import type { LayerSetId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { resolveLayerSetLayers, resolveLayerSetThickness } from '@/construction/config'
import { getRoofHeightLineCached } from '@/construction/derived'
import type { GroupOrElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import { LAYER_CONSTRUCTIONS } from '@/construction/layers'
import type { LayerConfig } from '@/construction/layers/types'
import { type ConstructionModel, createConstructionGroup } from '@/construction/model'
import { type ConstructionResult, aggregateResults, assignDeterministicIdsToResults } from '@/construction/results'
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
import { assertUnreachable } from '@/shared/utils'

import { getWallContext } from './corners/corners'
import { computeLayerSpan, subtractWallOpenings } from './polygons'
import { convertHeightLineToWallOffsets } from './roofIntegration'

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
  switch (layer.type) {
    case 'monolithic': {
      const construction = LAYER_CONSTRUCTIONS.monolithic
      return Array.from(construction.construct(clonePolygon(polygon), offset, plane, layer, layerDirection))
    }
    case 'striped': {
      const construction = LAYER_CONSTRUCTIONS.striped
      return Array.from(construction.construct(clonePolygon(polygon), offset, plane, layer, layerDirection))
    }
    default:
      assertUnreachable(layer, 'Unsupported layer type')
  }
}

const aggregateLayerResults = (results: ConstructionResult[]): ConstructionModel => {
  const aggregated = aggregateResults(results)
  return { ...aggregated, bounds: Bounds3D.merge(...aggregated.elements.map(element => element.bounds)) }
}

export interface WallLayerSetIds {
  insideLayerSetId?: LayerSetId
  outsideLayerSetId?: LayerSetId
}

export function constructWallLayers(
  wall: PerimeterWallWithGeometry,
  storeyContext: StoreyContext,
  layerSetIds: WallLayerSetIds
): ConstructionModel {
  const context = getWallContext(wall)

  const insideLayers = resolveLayerSetLayers(layerSetIds.insideLayerSetId)
  const outsideLayers = resolveLayerSetLayers(layerSetIds.outsideLayerSetId)
  const outsideThickness = resolveLayerSetThickness(layerSetIds.outsideLayerSetId)

  const baseInsideSpan = computeLayerSpan('inside', 0 as Length, wall, context)
  const baseOutsideSpan = computeLayerSpan('outside', outsideThickness, wall, context)

  const layerResults: ConstructionResult[] = []

  const wallDirection = signedAngleVec2(wall.direction, newVec2(1, 0))
  const layerDirection = wallDirection < 0 ? newVec2(0, 1) : newVec2(0, -1)

  const { getWallOpeningById } = getModelActions()
  const openings = wall.entityIds.filter(isOpeningId).map(getWallOpeningById)

  if (insideLayers.length > 0) {
    let insideOffset: Length = 0
    let previousSpan = baseInsideSpan

    const bottom = storeyContext.floorConstructionTop - storeyContext.wallBottom
    const top = storeyContext.ceilingConstructionBottom - storeyContext.wallBottom
    const zAdjustment = storeyContext.finishedFloorTop - storeyContext.wallBottom

    const reversedInsideLayers = [...insideLayers].reverse()

    reversedInsideLayers.forEach((layer, layerIndex) => {
      const cumulativeInside = insideOffset + layer.thickness
      const span = computeLayerSpan('inside', cumulativeInside, wall, context)
      const start = Math.min(span.start, previousSpan.start)
      const end = Math.max(span.end, previousSpan.end)

      const heightLine = getRoofHeightLineCached(storeyContext.storeyId, [span.line])
      const layerTopOffsets = convertHeightLineToWallOffsets(heightLine, span.end - span.start)

      // Create WallConstructionArea with roof-adjusted top
      const layerArea = new WallConstructionArea(
        newVec3(start, 0, bottom),
        newVec3(end - start, 0, top - bottom),
        layerTopOffsets
      )

      // Extract polygon from area (handles roof slopes)
      const polygon = ensurePolygonIsClockwise(simplifyPolygon(layerArea.getSideProfilePolygon()))
      const polygonsWithHoles = subtractWallOpenings(polygon, start, end, bottom, top, openings, zAdjustment)
      const results = polygonsWithHoles.flatMap(p =>
        runLayerConstruction(p, insideOffset, WALL_LAYER_PLANE, layer, layerDirection)
      )
      assignDeterministicIdsToResults(results, `${wall.id}_in_${layerIndex}`)
      const layerElements: GroupOrElement[] = []
      for (const result of results) {
        if (result.type === 'element') {
          layerElements.push(result.element)
        } else {
          layerResults.push(result)
        }
      }
      if (layerElements.length > 0) {
        const nameKey = layer.nameKey
        const customTag = createTag(
          'wall-layer',
          layer.name,
          nameKey != null ? t => t(nameKey, { ns: 'config' }) : layer.name
        )
        const group = createConstructionGroup(layerElements, IDENTITY, [TAG_WALL_LAYER_INSIDE, TAG_LAYERS, customTag])
        layerResults.push({ type: 'element', element: group })
      }
      if (!layer.overlap) {
        insideOffset = insideOffset + layer.thickness
        previousSpan = span
      }
    })
  }

  if (outsideLayers.length > 0) {
    const bottom = storeyContext.floorBottom - storeyContext.wallBottom
    const top = storeyContext.wallTop - storeyContext.wallBottom
    const zAdjustment = storeyContext.finishedFloorTop - storeyContext.wallBottom

    let outsideOffset: Length = wall.thickness - outsideThickness
    let previousSpan = baseOutsideSpan
    outsideLayers.forEach((layer, layerIndex) => {
      const remainingOutside = wall.thickness - outsideOffset - layer.thickness
      const depth = Math.max(remainingOutside, 0)
      const span = computeLayerSpan('outside', depth, wall, context)
      const start = Math.min(span.start, previousSpan.start)
      const end = Math.max(span.end, previousSpan.end)

      const heightLine = getRoofHeightLineCached(storeyContext.storeyId, [span.line])
      const layerTopOffsets = convertHeightLineToWallOffsets(heightLine, span.end - span.start)

      // Create WallConstructionArea with roof-adjusted top
      const layerArea = new WallConstructionArea(
        newVec3(start, 0, bottom),
        newVec3(end - start, 0, top - bottom),
        layerTopOffsets
      )

      // Extract polygon from area (handles roof slopes)
      const polygon = ensurePolygonIsClockwise(simplifyPolygon(layerArea.getSideProfilePolygon()))
      const polygonsWithHoles = subtractWallOpenings(polygon, start, end, bottom, top, openings, zAdjustment)
      const results = polygonsWithHoles.flatMap(p =>
        runLayerConstruction(p, outsideOffset, WALL_LAYER_PLANE, layer, layerDirection)
      )
      assignDeterministicIdsToResults(results, `${wall.id}_out_${layerIndex}`)
      const layerElements: GroupOrElement[] = []
      for (const result of results) {
        if (result.type === 'element') {
          layerElements.push(result.element)
        } else {
          layerResults.push(result)
        }
      }
      if (layerElements.length > 0) {
        const nameKey = layer.nameKey
        const customTag = createTag(
          'wall-layer',
          layer.name,
          nameKey != null ? t => t(nameKey, { ns: 'config' }) : layer.name
        )
        const group = createConstructionGroup(layerElements, IDENTITY, [TAG_WALL_LAYER_OUTSIDE, TAG_LAYERS, customTag])
        layerResults.push({ type: 'element', element: group })
      }
      if (!layer.overlap) {
        outsideOffset = outsideOffset + layer.thickness
        previousSpan = span
      }
    })
  }

  const rawModel = aggregateLayerResults(layerResults)
  return rawModel
}
