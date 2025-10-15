import { vec3 } from 'gl-matrix'

import type { StoreyId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { FLOOR_ASSEMBLIES } from '@/construction/floors'
import { constructPerimeter } from '@/construction/perimeter'
import { TAG_STOREY } from '@/construction/tags'

import { type ConstructionModel, mergeModels, transformModel } from './model'

export function constructStorey(storeyId: StoreyId): ConstructionModel | null {
  const { getPerimetersByStorey } = getModelActions()
  const perimeters = getPerimetersByStorey(storeyId)
  if (perimeters.length === 0) {
    return null
  }
  return mergeModels(...perimeters.map(constructPerimeter))
}

export function constructModel(): ConstructionModel | null {
  const { getStoreysOrderedByLevel } = getModelActions()
  const { getFloorAssemblyConfigById } = getConfigActions()
  const models: ConstructionModel[] = []
  let zOffset = 0
  for (const storey of getStoreysOrderedByLevel()) {
    const floor = getFloorAssemblyConfigById(storey.floorAssemblyId)
    if (!floor) {
      throw new Error('Invalid floor assembly id')
    }
    const floorAssembly = FLOOR_ASSEMBLIES[floor.type]
    zOffset += floorAssembly.getBottomOffset(floor) + floorAssembly.getConstructionThickness(floor)
    const model = constructStorey(storey.id)
    if (model) {
      models.push(
        transformModel(model, { position: [0, 0, zOffset], rotation: vec3.fromValues(0, 0, 0) }, [TAG_STOREY])
      )
    }
    zOffset += floor.layers.topThickness + floorAssembly.getTopOffset(floor) + storey.height
  }
  return models.length > 0 ? mergeModels(...models) : null
}
