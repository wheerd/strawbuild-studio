import { vec3 } from 'gl-matrix'

import type { StoreyId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { FLOOR_ASSEMBLIES } from '@/construction/floors'
import { constructPerimeter } from '@/construction/perimeter'
import { TAG_STOREY } from '@/construction/tags'
import { subtractPolygons } from '@/shared/geometry'

import { type ConstructionModel, mergeModels, transformModel } from './model'

export function constructStoreyFloor(storeyId: StoreyId): ConstructionModel[] {
  const { getPerimetersByStorey, getFloorAreasByStorey, getFloorOpeningsByStorey, getStoreyById } = getModelActions()
  const storey = getStoreyById(storeyId)
  if (!storey) {
    throw new Error('Invalid storey')
  }

  const { getFloorAssemblyById } = getConfigActions()
  const floorAssemblyConfig = getFloorAssemblyById(storey.floorAssemblyId)
  if (!floorAssemblyConfig) {
    throw new Error('Invalid floor assembly')
  }

  const perimeters = getPerimetersByStorey(storeyId)
  const perimeterPolygons = perimeters.map(p => ({
    // TODO: Properly determine the construction polygon based on offsets
    points: p.corners.map(c => c.outsidePoint)
  }))
  const floorAreas = getFloorAreasByStorey(storeyId).map(a => a.area)
  const openings = getFloorOpeningsByStorey(storeyId).map(o => o.area)
  const floorPolygons = subtractPolygons([...perimeterPolygons, ...floorAreas], openings)
  console.log('Floor polygons:', floorPolygons)
  const floorAssembly = FLOOR_ASSEMBLIES[floorAssemblyConfig.type]
  const floorModels = floorPolygons.map(p => floorAssembly.construct(p, floorAssemblyConfig))
  return floorModels
}

export function constructStorey(storeyId: StoreyId): ConstructionModel | null {
  const { getPerimetersByStorey } = getModelActions()
  const perimeters = getPerimetersByStorey(storeyId)
  if (perimeters.length === 0) {
    return null
  }
  const perimeterModels = perimeters.map(p => constructPerimeter(p, false))
  const floorModels = constructStoreyFloor(storeyId)
  return mergeModels(...perimeterModels, ...floorModels)
}

export function constructModel(): ConstructionModel | null {
  const { getStoreysOrderedByLevel } = getModelActions()
  const { getFloorAssemblyById } = getConfigActions()
  const models: ConstructionModel[] = []
  let zOffset = 0
  for (const storey of getStoreysOrderedByLevel()) {
    const floor = getFloorAssemblyById(storey.floorAssemblyId)
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
