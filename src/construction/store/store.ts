import { create } from 'zustand'

import type { PerimeterWallId } from '@/building/model/ids'
import { isPerimeterId, isRoofId, isStoreyId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getBuildingTimestampDependencyService } from '@/building/store/timestampDependencyService'
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
  type ModelId,
  type ViewModelId
} from './types'
import {
  createBasePlateId,
  createColinearWallId,
  createFloorId,
  createFullPerimeterId,
  createMeasurementId,
  createTopPlateId,
  extractPerimeterId,
  isBasePlateId,
  isColinearWallId,
  isFloorId,
  isFullPerimeterId,
  isPerimeterMeasurementsId,
  isTopPlateId
} from './utils'

const initialState: ConstructionStoreState = {
  conlinearMapping: {},
  models: {},
  cache: {},
  generatedAt: 0
}

export const useConstructionStore = create<ConstructionStore>()((set, get) => ({
  ...initialState,

  actions: {
    rebuildModel(): void {
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
        generatedAt: Date.now()
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

    isOutdated(modelId: ModelId): boolean {
      const { generatedAt } = get()
      if (generatedAt === 0) return true

      const timestampService = getBuildingTimestampDependencyService()
      const effectiveTimestamp = getEffectiveTimestamp(modelId, get().conlinearMapping, timestampService)

      return !effectiveTimestamp || effectiveTimestamp > generatedAt
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

function getEffectiveTimestamp(
  modelId: ModelId,
  conlinearMapping: Partial<Record<PerimeterWallId, ColinearWallId>>,
  service: ReturnType<typeof getBuildingTimestampDependencyService>
): number | null {
  if (modelId === 'building') {
    const storeys = getModelActions().getStoreysOrderedByLevel()
    const timestamps = storeys.map(s => service.getEffectiveStoreyTimestamp(s.id))
    return maxTimestamp(timestamps)
  }

  if (isStoreyId(modelId)) {
    return service.getEffectiveStoreyTimestamp(modelId)
  }

  if (isFullPerimeterId(modelId)) {
    const perimeterId = extractPerimeterId(modelId)
    return service.getEffectivePerimeterTimestamp(perimeterId)
  }

  if (isPerimeterId(modelId)) {
    return service.getEffectivePerimeterTimestamp(modelId)
  }

  if (isColinearWallId(modelId)) {
    const wallId = Object.entries(conlinearMapping).find(([, colinearId]) => colinearId === modelId)?.[0]
    if (wallId) {
      return service.getEffectivePerimeterWallTimestamp(wallId as PerimeterWallId)
    }
    return null
  }

  if (isRoofId(modelId)) {
    return service.getEffectiveRoofTimestamp(modelId)
  }

  if (isFloorId(modelId) || isTopPlateId(modelId) || isBasePlateId(modelId) || isPerimeterMeasurementsId(modelId)) {
    const perimeterId = extractPerimeterId(modelId)
    return service.getEffectivePerimeterTimestamp(perimeterId)
  }

  return null
}

function maxTimestamp(timestamps: (number | null)[]): number | null {
  const valid = timestamps.filter((t): t is number => t !== null)
  return valid.length > 0 ? Math.max(...valid) : null
}

export function getConstructionActions() {
  return useConstructionStore.getState().actions
}

export function useModel(modelId: ViewModelId): ConstructionModel {
  return useConstructionStore(state => state.actions.getModel(modelId))
}

export function useModelWithStatus(modelId: ViewModelId): {
  model: ConstructionModel
  isOutdated: boolean
} {
  const store = useConstructionStore()
  return {
    model: store.actions.getModel(modelId),
    isOutdated: store.actions.isOutdated(modelId)
  }
}
