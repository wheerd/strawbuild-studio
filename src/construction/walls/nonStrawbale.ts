import { vec3 } from 'gl-matrix'

import type { Opening, Perimeter, PerimeterWall } from '@/building/model'
import { getConfigActions } from '@/construction/config'
import { createConstructionElement } from '@/construction/elements'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import { type ConstructionResult, aggregateResults, yieldElement } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import type { NonStrawbaleWallConfig, WallAssembly } from '@/construction/walls'
import { calculateWallCornerInfo, getWallContext } from '@/construction/walls/corners/corners'
import { constructWallLayers } from '@/construction/walls/layers'
import { WALL_POLYGON_PLANE, createWallPolygonWithOpenings } from '@/construction/walls/polygons'
import { type WallStoreyContext, segmentedWallConstruction } from '@/construction/walls/segmentation'
import { Bounds3D, type Length } from '@/shared/geometry'

function* noopWallSegment(
  _position: vec3,
  _size: vec3,
  _startsWithStand: boolean,
  _endsWithStand: boolean,
  _startAtEnd: boolean
): Generator<ConstructionResult> {
  // Intentionally empty - structural wall handled as a single extruded polygon
}

function* noopOpeningSegment(
  _position: vec3,
  _size: vec3,
  _zOffset: Length,
  _openings: Opening[]
): Generator<ConstructionResult> {
  // Intentionally empty - openings are handled by polygon holes
}

export class NonStrawbaleWallAssembly implements WallAssembly<NonStrawbaleWallConfig> {
  construct(
    wall: PerimeterWall,
    perimeter: Perimeter,
    storeyContext: WallStoreyContext,
    config: NonStrawbaleWallConfig
  ): ConstructionModel {
    const wallContext = getWallContext(wall, perimeter)
    const cornerInfo = calculateWallCornerInfo(wall, wallContext)

    const { getRingBeamAssemblyById } = getConfigActions()
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

    const structuralThickness = (wall.thickness -
      config.layers.insideThickness -
      config.layers.outsideThickness) as Length
    if (structuralThickness <= 0) {
      throw new Error('Non-strawbale wall structural thickness must be greater than 0')
    }

    const polygonBounds = {
      start: -cornerInfo.extensionStart as Length,
      end: (cornerInfo.constructionLength - cornerInfo.extensionStart) as Length,
      bottom: basePlateHeight as Length,
      top: (totalConstructionHeight - topPlateHeight) as Length
    }

    const structuralPolygons = createWallPolygonWithOpenings(polygonBounds, wall, storeyContext.floorTopOffset)

    const structureShapes = structuralPolygons.map(p =>
      createExtrudedPolygon(p, WALL_POLYGON_PLANE, structuralThickness)
    )
    const structureTransform = {
      position: vec3.fromValues(0, config.layers.insideThickness, 0),
      rotation: vec3.fromValues(0, 0, 0)
    }
    const structureElements = structureShapes.map(s =>
      createConstructionElement(config.material, s, structureTransform)
    )

    const metadataResults = Array.from(
      segmentedWallConstruction(
        wall,
        perimeter,
        storeyContext,
        config.layers,
        noopWallSegment,
        noopOpeningSegment,
        config.openings.padding
      )
    )

    const allResults = [...metadataResults, ...structureElements.map(e => yieldElement(e))]
    const aggRes = aggregateResults(allResults)
    const baseModel: ConstructionModel = {
      bounds: Bounds3D.merge(...aggRes.elements.map(e => e.bounds)),
      elements: aggRes.elements,
      measurements: aggRes.measurements,
      areas: aggRes.areas,
      errors: aggRes.errors,
      warnings: aggRes.warnings
    }

    const layerModel = constructWallLayers(wall, perimeter, storeyContext, config.layers)

    return mergeModels(baseModel, layerModel)
  }
}
