import type { Perimeter, PerimeterWall } from '@/building/model/model'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import { aggregateResults } from '@/construction/results'
import type { StoreyContext } from '@/construction/storeys/context'
import type { InfillWallConfig, WallAssembly } from '@/construction/walls'
import { constructWallLayers } from '@/construction/walls/layers'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'
import { Bounds3D } from '@/shared/geometry'

import { infillWallArea } from './infill'

export class InfillWallAssembly implements WallAssembly<InfillWallConfig> {
  construct(
    wall: PerimeterWall,
    perimeter: Perimeter,
    storeyContext: StoreyContext,
    config: InfillWallConfig
  ): ConstructionModel {
    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        perimeter,
        storeyContext,
        config.layers,
        (area, startsWithStand, endsWithStand, startAtEnd) =>
          infillWallArea(area, config, startsWithStand, endsWithStand, startAtEnd),
        area => infillWallArea(area, config),
        config.openingAssemblyId
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

    const layerModel = constructWallLayers(wall, perimeter, storeyContext, config.layers)

    return mergeModels(baseModel, layerModel)
  }
}
