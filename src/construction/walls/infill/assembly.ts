import type { PerimeterWallWithGeometry } from '@/building/model'
import { getConfigActions } from '@/construction/config'
import { getMaterialById } from '@/construction/materials/store'
import { type ThicknessRange, addThickness, getMaterialThickness } from '@/construction/materials/thickness'
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
  construct(wall: PerimeterWallWithGeometry, storeyContext: StoreyContext): ConstructionModel {
    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
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

    const layerModel = constructWallLayers(wall, storeyContext, this.config.layers)

    return mergeModels(baseModel, layerModel)
  }

  get thicknessRange(): ThicknessRange {
    const strawMaterialId = this.config.strawMaterial ?? getConfigActions().getDefaultStrawMaterial()
    const strawMaterial = getMaterialById(strawMaterialId)
    const layerThickness = this.config.layers.insideThickness + this.config.layers.outsideThickness
    return addThickness(strawMaterial ? getMaterialThickness(strawMaterial) : undefined, layerThickness)
  }

  readonly tag = TAG_INFILL_CONSTRUCTION
}
