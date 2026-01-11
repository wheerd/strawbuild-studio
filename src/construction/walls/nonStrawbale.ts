import { type PerimeterWallWithGeometry, isOpeningId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { createConstructionElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import { type ConstructionResult, aggregateResults, yieldElement } from '@/construction/results'
import { resolveRingBeamAssembly } from '@/construction/ringBeams'
import { createExtrudedPolygon } from '@/construction/shapes'
import type { StoreyContext } from '@/construction/storeys/context'
import { TAG_NON_STRAWBALE_CONSTRUCTION } from '@/construction/tags'
import type { NonStrawbaleWallConfig } from '@/construction/walls'
import { BaseWallAssembly } from '@/construction/walls/base'
import { calculateWallCornerInfo, getWallContext } from '@/construction/walls/corners/corners'
import { constructWallLayers } from '@/construction/walls/layers'
import { WALL_POLYGON_PLANE, createWallPolygonWithOpenings } from '@/construction/walls/polygons'
import { convertHeightLineToWallOffsets, getRoofHeightLineForLines } from '@/construction/walls/roofIntegration'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'
import { Bounds3D, fromTrans, newVec2, newVec3 } from '@/shared/geometry'

export class NonStrawbaleWallAssembly extends BaseWallAssembly<NonStrawbaleWallConfig> {
  construct(wall: PerimeterWallWithGeometry, storeyContext: StoreyContext): ConstructionModel {
    const wallContext = getWallContext(wall)
    const cornerInfo = calculateWallCornerInfo(wall, wallContext)

    const { getRingBeamAssemblyById } = getConfigActions()
    // Get ring beam assemblies for THIS specific wall
    const basePlateAssembly = wall.baseRingBeamAssemblyId ? getRingBeamAssemblyById(wall.baseRingBeamAssemblyId) : null
    const topPlateAssembly = wall.topRingBeamAssemblyId ? getRingBeamAssemblyById(wall.topRingBeamAssemblyId) : null

    const basePlateHeight = basePlateAssembly ? resolveRingBeamAssembly(basePlateAssembly).height : 0
    const topPlateHeight = topPlateAssembly ? resolveRingBeamAssembly(topPlateAssembly).height : 0

    const totalConstructionHeight = storeyContext.wallTop - storeyContext.wallBottom
    const ceilingOffset = storeyContext.roofBottom - storeyContext.wallTop

    const structuralThickness =
      wall.thickness - this.config.layers.insideThickness - this.config.layers.outsideThickness
    if (structuralThickness <= 0) {
      throw new Error('Non-strawbale wall structural thickness must be greater than 0')
    }

    const roofHeightLine = getRoofHeightLineForLines(
      storeyContext.storeyId,
      [cornerInfo.constructionInsideLine, cornerInfo.constructionOutsideLine],
      -ceilingOffset,
      storeyContext.perimeterContexts
    )

    // Convert roof height line to wall offsets
    let roofOffsets
    if (roofHeightLine.length === 0) {
      roofOffsets = convertHeightLineToWallOffsets(roofHeightLine, cornerInfo.constructionLength)
    } else {
      roofOffsets = [newVec2(0, -ceilingOffset), newVec2(cornerInfo.constructionLength, -ceilingOffset)]
    }

    // Create overall wall construction area ONCE with roof offsets
    const wallArea = new WallConstructionArea(
      newVec3(-cornerInfo.extensionStart, 0, basePlateHeight),
      newVec3(
        cornerInfo.constructionLength,
        wall.thickness,
        totalConstructionHeight - basePlateHeight - topPlateHeight
      ),
      roofOffsets
    )

    const { getWallOpeningById } = getModelActions()
    const openings = wall.entityIds.filter(isOpeningId).map(getWallOpeningById)
    const finishedFloorZLevel = storeyContext.finishedFloorTop - storeyContext.wallBottom
    const structuralPolygons = createWallPolygonWithOpenings(wallArea, openings, finishedFloorZLevel)

    const structureShapes = structuralPolygons.map(p =>
      createExtrudedPolygon(p, WALL_POLYGON_PLANE, structuralThickness)
    )
    const structureTransform = fromTrans(newVec3(0, this.config.layers.insideThickness, 0))
    const structureElements = structureShapes.map(s =>
      createConstructionElement(this.config.material, s, structureTransform)
    )

    const metadataResults = Array.from(
      segmentedWallConstruction(
        wall,
        storeyContext,
        this.config.layers,
        this.noopWallSegment,
        this.noopInfill,
        this.config.openingAssemblyId
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

    const layerModel = constructWallLayers(wall, storeyContext, this.config.layers)

    return mergeModels(baseModel, layerModel)
  }

  private *noopWallSegment(
    this: void,
    _area: WallConstructionArea,
    _startsWithStand: boolean,
    _endsWithStand: boolean,
    _startAtEnd: boolean
  ): Generator<ConstructionResult> {
    // Intentionally empty - structural wall handled as a single extruded polygon
  }

  private *noopInfill(this: void, _area: WallConstructionArea): Generator<ConstructionResult> {
    // Intentionally empty - openings are handled by polygon holes
  }

  readonly tag = TAG_NON_STRAWBALE_CONSTRUCTION
}
