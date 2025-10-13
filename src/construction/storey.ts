import type { StoreyId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { constructPerimeter } from '@/construction/perimeter'
import { SLAB_CONSTRUCTION_METHODS } from '@/construction/slabs'
import { TAG_STOREY } from '@/construction/tags'

import { type ConstructionModel, mergeModels, transformModel } from './model'

export function constructStorey(storeyId: StoreyId): ConstructionModel {
  const { getPerimetersByStorey } = getModelActions()
  return mergeModels(...getPerimetersByStorey(storeyId).map(constructPerimeter))
}

export function constructModel(): ConstructionModel {
  const { getStoreysOrderedByLevel } = getModelActions()
  const { getSlabConstructionConfigById } = getConfigActions()
  const models: ConstructionModel[] = []
  let zOffset = 0
  for (const storey of getStoreysOrderedByLevel()) {
    const slab = getSlabConstructionConfigById(storey.slabConstructionConfigId)
    if (!slab) {
      throw new Error('Invalid slab config id')
    }
    const slabMethod = SLAB_CONSTRUCTION_METHODS[slab.type]
    zOffset += slabMethod.getBottomOffset(slab) + slabMethod.getConstructionThickness(slab)
    const model = constructStorey(storey.id)
    models.push(transformModel(model, { position: [0, 0, zOffset], rotation: [0, 0, 0] }, [TAG_STOREY]))
    zOffset += slab.layers.topThickness + slabMethod.getTopOffset(slab) + storey.height
  }
  return mergeModels(...models)
}
