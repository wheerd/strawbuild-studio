import type { Perimeter, PerimeterWall } from '@/building/model'
import { getConfigActions } from '@/construction/config'
import { createConstructionElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import { type ConstructionResult, aggregateResults, yieldElement } from '@/construction/results'
import { resolveRingBeamAssembly } from '@/construction/ringBeams'
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
import { Bounds3D, type Length, fromTrans, newVec2, newVec3 } from '@/shared/geometry'

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
    // Get ring beam assemblies for THIS specific wall
    const basePlateAssembly = wall.baseRingBeamAssemblyId ? getRingBeamAssemblyById(wall.baseRingBeamAssemblyId) : null
    const topPlateAssembly = wall.topRingBeamAssemblyId ? getRingBeamAssemblyById(wall.topRingBeamAssemblyId) : null

    const basePlateHeight = basePlateAssembly ? resolveRingBeamAssembly(basePlateAssembly).height : 0
    const topPlateHeight = topPlateAssembly ? resolveRingBeamAssembly(topPlateAssembly).height : 0
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
      roofOffsets = [newVec2(0, -ceilingOffset), newVec2(cornerInfo.constructionLength, -ceilingOffset)]
    }

    const wallArea = new WallConstructionArea(
      newVec3(-cornerInfo.extensionStart, 0, basePlateHeight),
      newVec3(cornerInfo.constructionLength, 0, storeyContext.storeyHeight - basePlateHeight - topPlateHeight),
      roofOffsets
    )

    const structuralPolygons = createWallPolygonWithOpenings(wallArea, wall, storeyContext.floorTopOffset)

    const structureShapes = structuralPolygons.map(p =>
      createExtrudedPolygon(p, WALL_POLYGON_PLANE, structuralThickness)
    )
    const structureTransform = fromTrans(newVec3(0, config.layers.insideThickness, 0))
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

    const allResults = [
      ...metadataResults.filter(r => r.type !== 'element'),
      ...structureElements.flatMap(e => Array.from(yieldElement(e)))
    ]
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
