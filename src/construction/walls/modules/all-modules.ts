import type { Perimeter, PerimeterWall } from '@/building/model/model'
import { WallConstructionArea } from '@/construction/geometry'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import type { ConstructionResult } from '@/construction/results'
import { aggregateResults } from '@/construction/results'
import type { StoreyContext } from '@/construction/storeys/context'
import { TAG_INFILL_CONSTRUCTION } from '@/construction/tags'
import type { ModulesWallConfig } from '@/construction/walls'
import { BaseWallAssembly } from '@/construction/walls/base'
import { infillWallArea } from '@/construction/walls/infill/infill'
import { constructWallLayers } from '@/construction/walls/layers'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'
import { Bounds3D } from '@/shared/geometry'

import { constructModule } from './modules'

export class ModulesWallAssembly extends BaseWallAssembly<ModulesWallConfig> {
  construct(wall: PerimeterWall, perimeter: Perimeter, storeyContext: StoreyContext): ConstructionModel {
    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        perimeter,
        storeyContext,
        this.config.layers,
        this.moduleWallArea.bind(this),
        area => infillWallArea(area, this.config.infill),
        this.config.openingAssemblyId
      )
    )

    const aggRes = aggregateResults(allResults)
    const baseModel: ConstructionModel = {
      bounds: Bounds3D.merge(...aggRes.elements.map(e => e.bounds)),
      elements: aggRes.elements,
      measurements: aggRes.measurements,
      areas: aggRes.areas,
      errors: aggRes.errors,
      warnings: aggRes.warnings
    }

    const layerModel = constructWallLayers(wall, perimeter, storeyContext, this.config.layers)

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

  readonly tag = TAG_INFILL_CONSTRUCTION
}
