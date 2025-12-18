import { vec2, vec3 } from 'gl-matrix'

import type { Perimeter, PerimeterWall } from '@/building/model'
import { getConfigActions } from '@/construction/config'
import { createConstructionElement } from '@/construction/elements'
import { WallConstructionArea, translate } from '@/construction/geometry'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import { type ConstructionResult, aggregateResults, yieldElement } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import type { NonStrawbaleWallConfig, WallAssembly } from '@/construction/walls'
import { calculateWallCornerInfo, getWallContext } from '@/construction/walls/corners/corners'
import { constructWallLayers } from '@/construction/walls/layers'
import { WALL_POLYGON_PLANE, createWallPolygonWithOpenings } from '@/construction/walls/polygons'
import { convertHeightLineToWallOffsets } from '@/construction/walls/roofIntegration'
import {
  type WallStoreyContext,
  getRoofHeightLineForWall,
  segmentedWallConstruction
} from '@/construction/walls/segmentation'
import { Bounds3D, type Length } from '@/shared/geometry'

function* noopWallSegment(
  _area: WallConstructionArea,
  _startsWithStand: boolean,
  _endsWithStand: boolean,
  _startAtEnd: boolean
): Generator<ConstructionResult> {
  // Intentionally empty - structural wall handled as a single extruded polygon
}

function* noopInfill(_area: WallConstructionArea): Generator<ConstructionResult> {
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
      storeyContext.ceilingHeight + storeyContext.floorTopOffset + storeyContext.ceilingBottomOffset
    const ceilingOffset = storeyContext.storeyHeight - totalConstructionHeight

    const structuralThickness = (wall.thickness -
      config.layers.insideThickness -
      config.layers.outsideThickness) as Length
    if (structuralThickness <= 0) {
      throw new Error('Non-strawbale wall structural thickness must be greater than 0')
    }

    const roofHeightLine = getRoofHeightLineForWall(
      perimeter.storeyId,
      cornerInfo,
      -ceilingOffset,
      storeyContext.perimeterContexts
    )

    // Convert roof height line to wall offsets
    let roofOffsets
    if (roofHeightLine) {
      roofOffsets = convertHeightLineToWallOffsets(roofHeightLine, cornerInfo.constructionLength)
    } else {
      roofOffsets = [vec2.fromValues(0, -ceilingOffset), vec2.fromValues(cornerInfo.constructionLength, -ceilingOffset)]
    }

    const wallArea = new WallConstructionArea(
      vec3.fromValues(-cornerInfo.extensionStart, 0, basePlateHeight),
      vec3.fromValues(cornerInfo.constructionLength, 0, storeyContext.storeyHeight - basePlateHeight - topPlateHeight),
      roofOffsets
    )

    const structuralPolygons = createWallPolygonWithOpenings(wallArea, wall, storeyContext.floorTopOffset, config)

    const structureShapes = structuralPolygons.map(p =>
      createExtrudedPolygon(p, WALL_POLYGON_PLANE, structuralThickness)
    )
    const structureTransform = translate(vec3.fromValues(0, config.layers.insideThickness, 0))
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
        noopInfill,
        config.openingAssemblyId
      )
    )

    const allResults = [...metadataResults, ...structureElements.flatMap(e => Array.from(yieldElement(e)))]
    const aggRes = aggregateResults(allResults)
    const baseModel: ConstructionModel = {
      bounds: Bounds3D.merge(...aggRes.elements.map(e => e.bounds)),
      elements: aggRes.elements,
      measurements: aggRes.measurements,
      areas: aggRes.areas,
      errors: aggRes.errors,
      warnings: aggRes.warnings
    }

    const layerModel = constructWallLayers(wall, perimeter, storeyContext, config.layers, config)

    return mergeModels(baseModel, layerModel)
  }
}
