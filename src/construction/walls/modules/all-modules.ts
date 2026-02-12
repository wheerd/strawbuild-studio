import type { PerimeterWallWithGeometry } from '@/building/model'
import { getConfigActions } from '@/construction/config'
import { WallConstructionArea } from '@/construction/geometry'
import { getMaterialById } from '@/construction/materials/store'
import { type ThicknessRange, addThickness, getMaterialThickness } from '@/construction/materials/thickness'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import type { ConstructionResult } from '@/construction/results'
import { resultsToModel } from '@/construction/results'
import type { StoreyContext } from '@/construction/storeys/context'
import { TAG_MODULE_CONSTRUCTION } from '@/construction/tags'
import type { ModulesWallConfig } from '@/construction/walls'
import { BaseWallAssembly } from '@/construction/walls/base'
import { infillWallArea } from '@/construction/walls/infill/infill'
import { constructWallLayers } from '@/construction/walls/layers'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'

import { constructModule } from './modules'

export class ModulesWallAssembly extends BaseWallAssembly<ModulesWallConfig> {
  construct(wall: PerimeterWallWithGeometry, storeyContext: StoreyContext): ConstructionModel {
    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        storeyContext,
        this.config.layers,
        this.moduleWallArea.bind(this),
        area => infillWallArea(area, this.config.infill),
        this.config.openingAssemblyId,
        false
      )
    )

    const baseModel = resultsToModel(allResults)
    const layerModel = constructWallLayers(wall, storeyContext, this.config.layers)

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
    const { module, infill, layers } = this.config
    const strawMaterialId = module.strawMaterial ?? infill.strawMaterial ?? getConfigActions().getDefaultStrawMaterial()
    const strawMaterial = getMaterialById(strawMaterialId)
    const layerThickness = layers.insideThickness + layers.outsideThickness
    return addThickness(strawMaterial ? getMaterialThickness(strawMaterial) : undefined, layerThickness)
  }

  readonly tag = TAG_MODULE_CONSTRUCTION
}
