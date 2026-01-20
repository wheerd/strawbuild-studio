import type { PerimeterWallWithGeometry } from '@/building/model'
import { WallConstructionArea } from '@/construction/geometry'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import type { ConstructionResult } from '@/construction/results'
import { resultsToModel } from '@/construction/results'
import type { StoreyContext } from '@/construction/storeys/context'
import { TAG_INFILL_CONSTRUCTION } from '@/construction/tags'
import type { PrefabModulesWallConfig } from '@/construction/walls'
import { BaseWallAssembly } from '@/construction/walls/base'
import { constructWallLayers } from '@/construction/walls/layers'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'

export class PrefabModulesWallAssembly extends BaseWallAssembly<PrefabModulesWallConfig> {
  construct(wall: PerimeterWallWithGeometry, storeyContext: StoreyContext): ConstructionModel {
    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        storeyContext,
        this.config.layers,
        this.moduleWallArea.bind(this),
        this.moduleSubWallArea.bind(this),
        this.config.openingAssemblyId,
        false
      )
    )

    const baseModel = resultsToModel(allResults)
    const layerModel = constructWallLayers(wall, storeyContext, this.config.layers)

    return mergeModels(baseModel, layerModel)
  }

  private *moduleWallArea(
    _area: WallConstructionArea,
    _startsWithStand = false,
    _endsWithStand = false,
    _startAtEnd = false
  ): Generator<ConstructionResult> {
    yield* []
  }

  private *moduleSubWallArea(
    _area: WallConstructionArea,
    _startsWithStand = false,
    _endsWithStand = false,
    _startAtEnd = false
  ): Generator<ConstructionResult> {
    yield* []
  }

  readonly tag = TAG_INFILL_CONSTRUCTION
}
