import type { PerimeterWallWithGeometry } from '@/building/model'
import { getConfigActions, resolveLayerSetThickness } from '@/config/store'
import { BaseWallAssembly } from '@/construction/assemblies/perimeterWalls/base'
import { infillWallArea } from '@/construction/assemblies/perimeterWalls/infill/infill'
import { type WallLayerSetIds, constructWallLayers } from '@/construction/assemblies/perimeterWalls/layers'
import { segmentedWallConstruction } from '@/construction/assemblies/perimeterWalls/segmentation'
import type { ModulesWallConfig } from '@/construction/assemblies/perimeterWalls/types'
import { type PhysicsSeries } from '@/construction/assemblies/physics'
import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { StoreyContext } from '@/construction/context/storeys'
import type { ConstructionModel } from '@/construction/model/model'
import { mergeModels } from '@/construction/model/model'
import type { ConstructionResult } from '@/construction/model/results'
import { assignDeterministicIdsToResults, resultsToModel } from '@/construction/model/results'
import { TAG_MODULE_CONSTRUCTION } from '@/construction/model/tags'
import { getMaterialById } from '@/materials/store'
import { type ThicknessRange, addThickness, getMaterialThickness } from '@/materials/thickness'
import type { Length } from '@/shared/geometry'

import { constructModule, getModulePhysicsPaths } from './modules'

export class ModulesWallAssembly extends BaseWallAssembly<ModulesWallConfig> {
  construct(wall: PerimeterWallWithGeometry, storeyContext: StoreyContext): ConstructionModel {
    const layerSetIds: WallLayerSetIds = {
      insideLayerSetId: this.config.insideLayerSetId,
      outsideLayerSetId: this.config.outsideLayerSetId
    }

    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        storeyContext,
        layerSetIds,
        this.moduleWallArea.bind(this),
        area => infillWallArea(area, this.config.infill),
        this.config.openingAssemblyId,
        false
      )
    )

    assignDeterministicIdsToResults(allResults, wall.id)

    const baseModel = resultsToModel(allResults)
    const layerModel = constructWallLayers(wall, storeyContext, layerSetIds)

    return mergeModels(baseModel, layerModel)
  }

  private *moduleWallArea(
    area: WallConstructionArea,
    startsWithStand = false,
    endsWithStand = false,
    startAtEnd = false
  ): Generator<ConstructionResult> {
    const { module, infill } = this.config
    const infillMaterial = infill.infillMaterial ?? infill.strawMaterial

    let remainingArea = area
    while (remainingArea.size[0] >= module.minWidth) {
      const [a, b] = remainingArea.splitInX(startAtEnd ? remainingArea.size[0] - module.maxWidth : module.maxWidth)
      remainingArea = startAtEnd ? a : b
      const moduleArea = startAtEnd ? b : a
      yield* constructModule(moduleArea, module, infillMaterial)
    }
    if (remainingArea.size[0] > 0) {
      yield* infillWallArea(remainingArea, infill, startsWithStand, endsWithStand, startAtEnd)
    }
  }

  get thicknessRange(): ThicknessRange {
    const { module, infill } = this.config
    const strawMaterialId = module.strawMaterial ?? infill.strawMaterial ?? getConfigActions().getDefaultStrawMaterial()
    const strawMaterial = getMaterialById(strawMaterialId)
    const insideThickness = resolveLayerSetThickness(this.config.insideLayerSetId)
    const outsideThickness = resolveLayerSetThickness(this.config.outsideLayerSetId)
    const layerThickness = insideThickness + outsideThickness
    return addThickness(strawMaterial ? getMaterialThickness(strawMaterial) : undefined, layerThickness)
  }

  getCorePhysicsStructure(coreThickness: Length, height: Length): PhysicsSeries[] {
    const { module } = this.config

    return getModulePhysicsPaths(module, 1, module.maxWidth, height, coreThickness)
  }

  readonly tag = TAG_MODULE_CONSTRUCTION
}
