import { type PerimeterWallWithGeometry, isOpeningId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions, resolveLayerSetThickness } from '@/config/store'
import { BaseWallAssembly } from '@/construction/assemblies/perimeterWalls/base'
import { calculateWallCornerInfo, getWallContext } from '@/construction/assemblies/perimeterWalls/corners/corners'
import { type WallLayerSetIds, constructWallLayers } from '@/construction/assemblies/perimeterWalls/layers'
import { WALL_POLYGON_PLANE, createWallPolygonWithOpenings } from '@/construction/assemblies/perimeterWalls/polygons'
import { convertHeightLineToWallOffsets } from '@/construction/assemblies/perimeterWalls/roofIntegration'
import { segmentedWallConstruction } from '@/construction/assemblies/perimeterWalls/segmentation'
import type { NonStrawbaleWallConfig } from '@/construction/assemblies/perimeterWalls/types'
import { type PhysicsSeries, materialToPhysicsSeriesItem } from '@/construction/assemblies/physics'
import { resolveRingBeamAssembly } from '@/construction/assemblies/ringBeams'
import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import { getRoofHeightLineCached } from '@/construction/context/roofHeightLineCache'
import type { StoreyContext } from '@/construction/context/storeys'
import { createConstructionElement } from '@/construction/model/elements'
import type { ConstructionModel } from '@/construction/model/model'
import { mergeModels } from '@/construction/model/model'
import {
  type ConstructionResult,
  aggregateResults,
  assignDeterministicIdsToResults,
  yieldElement
} from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import { TAG_NON_STRAWBALE_CONSTRUCTION } from '@/construction/model/tags'
import { getMaterialById } from '@/materials/store'
import { type ThicknessRange, addThickness, getMaterialThickness } from '@/materials/thickness'
import { Bounds3D, type Length, fromTrans, newVec2, newVec3 } from '@/shared/geometry'

export class NonStrawbaleWallAssembly extends BaseWallAssembly<NonStrawbaleWallConfig> {
  construct(wall: PerimeterWallWithGeometry, storeyContext: StoreyContext): ConstructionModel {
    const wallContext = getWallContext(wall)
    const cornerInfo = calculateWallCornerInfo(wall, wallContext)

    const { getRingBeamAssemblyById } = getConfigActions()
    const basePlateAssembly = wall.baseRingBeamAssemblyId ? getRingBeamAssemblyById(wall.baseRingBeamAssemblyId) : null
    const topPlateAssembly = wall.topRingBeamAssemblyId ? getRingBeamAssemblyById(wall.topRingBeamAssemblyId) : null

    const basePlateHeight = basePlateAssembly ? resolveRingBeamAssembly(basePlateAssembly).height : 0
    const topPlateHeight = topPlateAssembly ? resolveRingBeamAssembly(topPlateAssembly).height : 0

    const totalConstructionHeight = storeyContext.wallTop - storeyContext.wallBottom
    const ceilingOffset = storeyContext.roofBottom - storeyContext.wallTop

    const insideThickness = resolveLayerSetThickness(this.config.insideLayerSetId)
    const outsideThickness = resolveLayerSetThickness(this.config.outsideLayerSetId)

    const structuralThickness = wall.thickness - insideThickness - outsideThickness
    if (structuralThickness <= 0) {
      throw new Error('Non-strawbale wall structural thickness must be greater than 0')
    }

    const roofHeightLine = getRoofHeightLineCached(storeyContext.storeyId, [
      cornerInfo.constructionInsideLine,
      cornerInfo.constructionOutsideLine
    ])

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
    const structureTransform = fromTrans(newVec3(0, insideThickness, 0))
    const structureElements = structureShapes.map(s =>
      createConstructionElement(this.config.material, s, structureTransform)
    )

    const layerSetIds: WallLayerSetIds = {
      insideLayerSetId: this.config.insideLayerSetId,
      outsideLayerSetId: this.config.outsideLayerSetId
    }

    const metadataResults = Array.from(
      segmentedWallConstruction(
        wall,
        storeyContext,
        layerSetIds,
        this.noopWallSegment,
        this.noopInfill,
        this.config.openingAssemblyId
      )
    )

    const allResults = [
      ...metadataResults.filter(r => r.type !== 'element'),
      ...structureElements.flatMap(e => Array.from(yieldElement(e)))
    ]
    assignDeterministicIdsToResults(allResults, wall.id)
    const aggRes = aggregateResults(allResults)
    const baseModel: ConstructionModel = {
      bounds: Bounds3D.merge(...aggRes.elements.map(e => e.bounds)),
      elements: aggRes.elements,
      measurements: aggRes.measurements,
      areas: aggRes.areas,
      errors: aggRes.errors,
      warnings: aggRes.warnings
    }

    const layerModel = constructWallLayers(wall, storeyContext, layerSetIds)

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

  get thicknessRange(): ThicknessRange {
    const material = getMaterialById(this.config.material)
    const insideThickness = resolveLayerSetThickness(this.config.insideLayerSetId)
    const outsideThickness = resolveLayerSetThickness(this.config.outsideLayerSetId)
    const layerThickness = insideThickness + outsideThickness
    return addThickness(material ? getMaterialThickness(material) : undefined, layerThickness)
  }

  getCorePhysicsStructure(coreThickness: Length): PhysicsSeries[] {
    const item = materialToPhysicsSeriesItem(this.config.material, coreThickness)
    return [
      {
        items: item ? [item] : [],
        areaFraction: 1,
        label: t => t($ => $.physics.breakdown.wall, { ns: 'config' })
      }
    ]
  }

  readonly tag = TAG_NON_STRAWBALE_CONSTRUCTION
}
