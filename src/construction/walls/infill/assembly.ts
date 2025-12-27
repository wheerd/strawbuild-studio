import type { Perimeter, PerimeterWall } from '@/building/model/model'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import { aggregateResults } from '@/construction/results'
import type { StoreyContext } from '@/construction/storeys/context'
import { TAG_INFILL_CONSTRUCTION } from '@/construction/tags'
import type { InfillWallConfig } from '@/construction/walls'
import { BaseWallAssembly } from '@/construction/walls/base'
import { constructWallLayers } from '@/construction/walls/layers'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'
import { Bounds3D } from '@/shared/geometry'

import { infillWallArea } from './infill'

export class InfillWallAssembly extends BaseWallAssembly<InfillWallConfig> {
  construct(wall: PerimeterWall, perimeter: Perimeter, storeyContext: StoreyContext): ConstructionModel {
    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        perimeter,
        storeyContext,
        this.config.layers,
        (area, startsWithStand, endsWithStand, startAtEnd) =>
          infillWallArea(area, this.config, startsWithStand, endsWithStand, startAtEnd),
        area => infillWallArea(area, this.config),
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

  readonly tag = TAG_INFILL_CONSTRUCTION
}
