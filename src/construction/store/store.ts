import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'

import { getModelActions, subscribeToModelChanges } from '@/building/store'
import { subscribeToConfigChanges } from '@/config/store'
import { createPerimeterMeasurementsModel } from '@/construction/assemblies/perimeters/construction'
import { constructBasePlate, constructTopPlate } from '@/construction/assemblies/ringBeams/construction'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model/model'
import { subscribeToMaterials } from '@/materials/store'
import { subscribeToProjectChanges } from '@/projects/store'
import { IDENTITY } from '@/shared/geometry'

import {
  buildBuildingComposite,
  buildColinearWallComposite,
  buildFloorCoreModel,
  buildFullPerimeterComposite,
  buildIntermediateWallCoreModel,
  buildPerimeterComposite,
  buildRoofCoreModel,
  buildStoreyComposite,
  buildWallCoreModel,
  findColinearWallGroups,
  findExplicitIntermediateColinearGroups
} from './builders'
import {
  BUILDING_ID,
  type ColinearWallId,
  type CompositeModel,
  type ConstructionStore,
  type ConstructionStoreState,
  type ModelEntry,
  type ModelId
} from './types'
import {
  createBasePlateId,
  createColinearWallId,
  createFloorId,
  createFullPerimeterId,
  createPerimeterMeasurementsId,
  createTopPlateId
} from './utils'

export const useConstructionStore = create<ConstructionStore>()(
  subscribeWithSelector((set, get) => ({
    conlinearMapping: {},
    models: {},
    cache: {},
    generatedAt: 0,
    lastSourceChange: Date.now(),
    hasModel: false,
    rebuilding: false,

    actions: {
      rebuildModel(): void {
        set(state => ({ ...state, hasModel: false, rebuilding: true }))

        const { models, conlinearMapping } = rebuildModel()

        set(state => ({
          ...state,
          models,
          conlinearMapping,
          cache: {},
          generatedAt: Date.now(),
          hasModel: true,
          rebuilding: false
        }))
      },

      getModel(modelId: ModelId): ConstructionModel {
        const state = get()

        const cached = state.cache[modelId]
        if (cached) {
          return cached
        }

        const entry = state.models[modelId]
        if (!entry) {
          throw new Error(`Model ${modelId} not found. Call rebuildModel() first.`)
        }

        const result = 'model' in entry ? entry.model : composeComposite(entry, state.models, state.cache)

        set(state => ({
          ...state,
          cache: { ...state.cache, [modelId]: result }
        }))

        return result
      },

      isOutdated(): boolean {
        const { generatedAt, lastSourceChange } = get()
        return generatedAt < lastSourceChange
      },

      clearCache(): void {
        set(state => ({
          ...state,
          cache: {}
        }))
      }
    }
  }))
)

function rebuildModel(): {
  models: Partial<Record<ModelId, ModelEntry>>
  conlinearMapping: Record<string, ColinearWallId>
} {
  const { getStoreysOrderedByLevel, getPerimetersByStorey, getRoofsByStorey } = getModelActions()

  const models: ConstructionStoreState['models'] = {}
  const conlinearMapping: Record<string, ColinearWallId> = {}

  const storeys = getStoreysOrderedByLevel()

  for (const storey of storeys) {
    const perimeters = getPerimetersByStorey(storey.id)

    for (const perimeter of perimeters) {
      for (const wallId of perimeter.wallIds) {
        models[wallId] = buildWallCoreModel(wallId)
      }

      const intermediateWalls = getModelActions().getIntermediateWallsByPerimeter(perimeter.id)
      for (const wall of intermediateWalls) models[wall.id] = buildIntermediateWallCoreModel(wall.id)
      for (const group of findExplicitIntermediateColinearGroups(intermediateWalls)) {
        const colinearId = createColinearWallId(group.wallIds[0])
        models[colinearId] = buildColinearWallComposite(group)
        for (const wallId of group.wallIds) conlinearMapping[wallId] = colinearId
      }

      const colinearGroups = findColinearWallGroups(perimeter)
      for (const group of colinearGroups) {
        const colinearId = createColinearWallId(group.wallIds[0])
        models[colinearId] = buildColinearWallComposite(group)
        for (const wallId of group.wallIds) {
          conlinearMapping[wallId] = colinearId
        }
      }

      models[createFloorId(perimeter.id)] = buildFloorCoreModel(perimeter.id)
      models[createBasePlateId(perimeter.id)] = { model: constructBasePlate(perimeter.id) }
      models[createTopPlateId(perimeter.id)] = { model: constructTopPlate(perimeter.id) }
      models[createPerimeterMeasurementsId(perimeter.id)] = { model: createPerimeterMeasurementsModel(perimeter) }

      models[perimeter.id] = buildPerimeterComposite(perimeter)

      models[createFullPerimeterId(perimeter.id)] = buildFullPerimeterComposite(perimeter.id)
    }

    const roofs = getRoofsByStorey(storey.id)
    for (const roof of roofs) {
      models[roof.id] = buildRoofCoreModel(roof.id)
    }
  }

  for (const storey of storeys) {
    models[storey.id] = buildStoreyComposite(storey.id)
  }

  models[BUILDING_ID] = buildBuildingComposite()
  return { models, conlinearMapping }
}

function composeComposite(
  composite: CompositeModel,
  models: ConstructionStoreState['models'],
  cache: ConstructionStoreState['cache']
): ConstructionModel {
  const childModels = composite.models.map(({ id, transform }) => {
    const cachedChild = cache[id]
    if (cachedChild) return transformModel(cachedChild, transform)

    const entry = models[id]
    if (!entry) {
      throw new Error(`Model ${id} not found in models`)
    }

    const child = 'model' in entry ? entry.model : composeComposite(entry, models, cache)
    return transformModel(child, transform, entry.tags, entry.partInfo, entry.sourceId)
  })

  return transformModel(mergeModels(...childModels), IDENTITY, composite.tags, undefined, composite.sourceId)
}

export function getConstructionActions() {
  return useConstructionStore.getState().actions
}

export function ensureConstructionLoaded() {
  const state = useConstructionStore.getState()
  if (!state.hasModel && !state.rebuilding) {
    state.actions.rebuildModel()
  }
  setupSubscriptions()
}

export function getConstructionModel() {
  ensureConstructionLoaded()
  return useConstructionStore.getState().actions.getModel(BUILDING_ID)
}

export const subscribeToConstructionModelChanges = (cb: () => void) =>
  useConstructionStore.subscribe(state => state.generatedAt, cb)

let subscribed = false
function setupSubscriptions() {
  if (!subscribed) {
    subscribeToModelChanges(
      state => {
        const { activeStoreyId: _activeStoreyId, ...modelState } = state
        return modelState
      },
      updateLastSourceChange,
      { equalityFn: shallow }
    )
    subscribeToConfigChanges(updateLastSourceChange)
    subscribeToMaterials(updateLastSourceChange)
    subscribeToProjectChanges(() => {
      useConstructionStore.getState().actions.rebuildModel()
    })
    subscribed = true
  }
}

function updateLastSourceChange() {
  useConstructionStore.setState({ lastSourceChange: Date.now() })
}
