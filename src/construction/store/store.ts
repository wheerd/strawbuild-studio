import { create } from 'zustand'

import type { PerimeterWallId } from '@/building/model/ids'
import { getModelActions, subscribeToModelChanges } from '@/building/store'
import { subscribeToConfigChanges } from '@/construction/config'
import { subscribeToMaterials } from '@/construction/materials/store'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model'
import { IDENTITY } from '@/shared/geometry'

import {
  buildBaseRingBeamCoreModel,
  buildBuildingComposite,
  buildColinearWallComposite,
  buildFloorCoreModel,
  buildFullPerimeterComposite,
  buildMeasurementCoreModel,
  buildPerimeterComposite,
  buildRoofCoreModel,
  buildStoreyComposite,
  buildTopRingBeamCoreModel,
  buildWallCoreModel,
  findColinearWallGroups
} from './builders'
import {
  BUILDING_ID,
  type ColinearWallId,
  type CompositeModel,
  type ConstructionStore,
  type ConstructionStoreState,
  type ModelId
} from './types'
import {
  createBasePlateId,
  createColinearWallId,
  createFloorId,
  createFullPerimeterId,
  createMeasurementId,
  createTopPlateId
} from './utils'

export const useConstructionStore = create<ConstructionStore>()((set, get) => ({
  conlinearMapping: {},
  models: {},
  cache: {},
  generatedAt: 0,
  lastSourceChange: Date.now(),
  hasModel: false,

  actions: {
    rebuildModel(): void {
      set(state => ({ ...state, hasModel: false }))

      const { getStoreysOrderedByLevel, getPerimetersByStorey, getRoofsByStorey } = getModelActions()

      const models: ConstructionStoreState['models'] = {}
      const conlinearMapping: Record<PerimeterWallId, ColinearWallId> = {}

      const storeys = getStoreysOrderedByLevel()

      for (const storey of storeys) {
        const perimeters = getPerimetersByStorey(storey.id)

        for (const perimeter of perimeters) {
          for (const wallId of perimeter.wallIds) {
            models[wallId] = { model: buildWallCoreModel(wallId).model, sourceId: wallId }
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
          models[createBasePlateId(perimeter.id)] = buildBaseRingBeamCoreModel(perimeter.id)
          models[createTopPlateId(perimeter.id)] = buildTopRingBeamCoreModel(perimeter.id)
          models[createMeasurementId(perimeter.id)] = buildMeasurementCoreModel(perimeter)

          models[perimeter.id] = buildPerimeterComposite(perimeter)

          models[createFullPerimeterId(perimeter.id)] = buildFullPerimeterComposite(perimeter.id)
        }

        const roofs = getRoofsByStorey(storey.id)
        for (const roof of roofs) {
          models[roof.id] = buildRoofCoreModel(roof.id)
        }
      }

      for (const storey of storeys) {
        let elevation = 0
        for (const s of storeys) {
          if (s.id === storey.id) break
          elevation += s.floorHeight
        }
        models[storey.id] = buildStoreyComposite(storey.id, elevation)
      }

      models[BUILDING_ID] = buildBuildingComposite()

      set(state => ({
        ...state,
        models,
        conlinearMapping,
        cache: {},
        generatedAt: Date.now(),
        hasModel: true
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

      let result: ConstructionModel

      if ('model' in entry) {
        result = entry.model
      } else {
        result = composeComposite(entry, state.models, state.cache)
        set(state => ({
          ...state,
          cache: { ...state.cache, [modelId]: result }
        }))
        return result
      }

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

function composeComposite(
  composite: CompositeModel,
  models: ConstructionStoreState['models'],
  cache: ConstructionStoreState['cache']
): ConstructionModel {
  const childModels = composite.models.map(({ id, transform }) => {
    let child: ConstructionModel
    const cachedChild = cache[id]
    if (cachedChild) {
      child = cachedChild
    } else {
      const entry = models[id]
      if (!entry) {
        throw new Error(`Model ${id} not found in models`)
      }
      if ('model' in entry) {
        child = entry.model
      } else {
        child = composeComposite(entry, models, cache)
      }
    }
    return transformModel(child, transform)
  })

  return transformModel(mergeModels(...childModels), IDENTITY, composite.tags, undefined, composite.sourceId)
}

export function getConstructionActions() {
  return useConstructionStore.getState().actions
}

export function ensureConstructionLoaded() {
  const state = useConstructionStore.getState()
  if (state.generatedAt === 0) {
    state.actions.rebuildModel()
    setupSubscriptions()
  }
}

function setupSubscriptions() {
  subscribeToModelChanges(updateLastSourceChange)
  subscribeToConfigChanges(updateLastSourceChange)
  subscribeToMaterials(updateLastSourceChange)
}

function updateLastSourceChange() {
  useConstructionStore.setState({ lastSourceChange: Date.now() })
}
