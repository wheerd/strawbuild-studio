import { useMemo } from 'react'
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type {
  AssemblyId,
  FloorAssemblyId,
  OpeningAssemblyId,
  RingBeamAssemblyId,
  RoofAssemblyId,
  WallAssemblyId
} from '@/building/model/ids'
import { createFloorAssembliesSlice } from '@/construction/config/store/slices/floors'
import { createOpeningAssembliesSlice } from '@/construction/config/store/slices/openings'
import { createRingBeamAssembliesSlice } from '@/construction/config/store/slices/ringBeams'
import { createRoofAssembliesSlice } from '@/construction/config/store/slices/roofs'
import { createStrawSlice } from '@/construction/config/store/slices/straw'
import { createTimestampsSlice } from '@/construction/config/store/slices/timestampsSlice'
import { createWallAssembliesSlice } from '@/construction/config/store/slices/walls'
import type { ConfigActions, ConfigState, ConfigStore } from '@/construction/config/store/types'
import type {
  FloorAssemblyConfig,
  OpeningAssemblyConfig,
  RingBeamAssemblyConfig,
  RoofAssemblyConfig,
  WallAssemblyConfig
} from '@/construction/config/types'
import type { MaterialId } from '@/construction/materials/material'
import { subscribeRecords } from '@/shared/utils/subscription'

import { CONFIG_STORE_VERSION, applyMigrations } from './migrations'

export * from './types'
export { CONFIG_STORE_VERSION } from './migrations'

const useConfigStore = create<ConfigStore>()(
  subscribeWithSelector(
    persist(
      (set, get, store) => {
        const strawSlice = immer(createStrawSlice)(set, get, store)
        const ringBeamSlice = immer(createRingBeamAssembliesSlice)(set, get, store)
        const wallSlice = immer(createWallAssembliesSlice)(set, get, store)
        const floorSlice = immer(createFloorAssembliesSlice)(set, get, store)
        const roofSlice = immer(createRoofAssembliesSlice)(set, get, store)
        const openingSlice = immer(createOpeningAssembliesSlice)(set, get, store)
        const timestampsSlice = immer(createTimestampsSlice)(set, get, store)

        return {
          ...strawSlice,
          ...ringBeamSlice,
          ...wallSlice,
          ...floorSlice,
          ...roofSlice,
          ...openingSlice,
          ...timestampsSlice,
          actions: {
            ...strawSlice.actions,
            ...ringBeamSlice.actions,
            ...wallSlice.actions,
            ...floorSlice.actions,
            ...roofSlice.actions,
            ...openingSlice.actions,
            ...timestampsSlice.actions,
            reset: () => {
              set(store.getInitialState())
            }
          }
        }
      },
      {
        name: 'strawbuild-config',
        version: CONFIG_STORE_VERSION,
        partialize: state => ({
          defaultStrawMaterial: state.defaultStrawMaterial,
          ringBeamAssemblyConfigs: state.ringBeamAssemblyConfigs,
          wallAssemblyConfigs: state.wallAssemblyConfigs,
          floorAssemblyConfigs: state.floorAssemblyConfigs,
          roofAssemblyConfigs: state.roofAssemblyConfigs,
          openingAssemblyConfigs: state.openingAssemblyConfigs,
          defaultBaseRingBeamAssemblyId: state.defaultBaseRingBeamAssemblyId,
          defaultTopRingBeamAssemblyId: state.defaultTopRingBeamAssemblyId,
          defaultWallAssemblyId: state.defaultWallAssemblyId,
          defaultFloorAssemblyId: state.defaultFloorAssemblyId,
          defaultRoofAssemblyId: state.defaultRoofAssemblyId,
          defaultOpeningAssemblyId: state.defaultOpeningAssemblyId,
          timestamps: state.timestamps
        }),
        migrate: (persistedState: unknown, version: number) => {
          if (version === CONFIG_STORE_VERSION) {
            return persistedState as ConfigState
          }

          try {
            return applyMigrations(persistedState) as ConfigState
          } catch (error) {
            console.error('Migration failed:', error)
            throw error
          }
        }
      }
    )
  )
)

// Selector hooks for easier usage
export const useDefaultStrawMaterialId = (): MaterialId => useConfigStore(state => state.defaultStrawMaterial)

export const useRingBeamAssemblies = (): RingBeamAssemblyConfig[] => {
  const ringBeamAssemblies = useConfigStore(state => state.ringBeamAssemblyConfigs)
  return useMemo(() => Object.values(ringBeamAssemblies), [ringBeamAssemblies])
}

export const useRingBeamAssemblyById = (id: RingBeamAssemblyId): RingBeamAssemblyConfig | null =>
  useConfigStore(state => state.actions.getRingBeamAssemblyById(id))

export const useDefaultBaseRingBeamAssemblyId = (): RingBeamAssemblyId | undefined =>
  useConfigStore(state => state.actions.getDefaultBaseRingBeamAssemblyId())

export const useDefaultTopRingBeamAssemblyId = (): RingBeamAssemblyId | undefined =>
  useConfigStore(state => state.actions.getDefaultTopRingBeamAssemblyId())

// Wall assembly selector hooks
export const useWallAssemblies = (): WallAssemblyConfig[] => {
  const wallAssemblies = useConfigStore(state => state.wallAssemblyConfigs)
  return useMemo(() => Object.values(wallAssemblies), [wallAssemblies])
}

export const useWallAssemblyById = (id: WallAssemblyId): WallAssemblyConfig | null =>
  useConfigStore(state => state.actions.getWallAssemblyById(id))

export const useDefaultWallAssemblyId = (): WallAssemblyId =>
  useConfigStore(state => state.actions.getDefaultWallAssemblyId())

// Floor construction config selector hooks
export const useFloorAssemblies = (): FloorAssemblyConfig[] => {
  const floorAssemblyConfigs = useConfigStore(state => state.floorAssemblyConfigs)
  return useMemo(() => Object.values(floorAssemblyConfigs), [floorAssemblyConfigs])
}

export const useFloorAssemblyById = (id: FloorAssemblyId): FloorAssemblyConfig | null =>
  useConfigStore(state => state.actions.getFloorAssemblyById(id))

export const useDefaultFloorAssemblyId = (): FloorAssemblyId =>
  useConfigStore(state => state.actions.getDefaultFloorAssemblyId())

// Roof assembly selector hooks
export const useRoofAssemblies = (): RoofAssemblyConfig[] => {
  const roofAssemblyConfigs = useConfigStore(state => state.roofAssemblyConfigs)
  return useMemo(() => Object.values(roofAssemblyConfigs), [roofAssemblyConfigs])
}

export const useRoofAssemblyById = (id: RoofAssemblyId): RoofAssemblyConfig | null =>
  useConfigStore(state => state.actions.getRoofAssemblyById(id))

export const useDefaultRoofAssemblyId = (): RoofAssemblyId =>
  useConfigStore(state => state.actions.getDefaultRoofAssemblyId())

// Opening assembly selector hooks
export const useOpeningAssemblies = (): OpeningAssemblyConfig[] => {
  const openingAssemblies = useConfigStore(state => state.openingAssemblyConfigs)
  return useMemo(() => Object.values(openingAssemblies), [openingAssemblies])
}

export const useOpeningAssemblyById = (id: OpeningAssemblyId): OpeningAssemblyConfig | null =>
  useConfigStore(state => state.actions.getOpeningAssemblyById(id))

export const useDefaultOpeningAssemblyId = (): OpeningAssemblyId =>
  useConfigStore(state => state.actions.getDefaultOpeningAssemblyId())

export const useConfigActions = (): ConfigActions => useConfigStore(state => state.actions)

// For non-reactive contexts
export const getConfigActions = (): ConfigActions => useConfigStore.getState().actions

export const clearPersistence = (): void => {
  localStorage.removeItem('strawbuild-config')
}

export const getInitialConfigState = (): ConfigState => {
  const state = useConfigStore.getInitialState()
  const { actions: _actions, ...rest } = state
  return rest
}

// Export config state for persistence
export const getConfigState = () => {
  const state = useConfigStore.getState()
  return {
    defaultStrawMaterial: state.defaultStrawMaterial,
    ringBeamAssemblyConfigs: state.ringBeamAssemblyConfigs,
    wallAssemblyConfigs: state.wallAssemblyConfigs,
    floorAssemblyConfigs: state.floorAssemblyConfigs,
    roofAssemblyConfigs: state.roofAssemblyConfigs,
    openingAssemblyConfigs: state.openingAssemblyConfigs,
    defaultBaseRingBeamAssemblyId: state.defaultBaseRingBeamAssemblyId,
    defaultTopRingBeamAssemblyId: state.defaultTopRingBeamAssemblyId,
    defaultWallAssemblyId: state.defaultWallAssemblyId,
    defaultFloorAssemblyId: state.defaultFloorAssemblyId,
    defaultRoofAssemblyId: state.defaultRoofAssemblyId,
    defaultOpeningAssemblyId: state.defaultOpeningAssemblyId,
    timestamps: state.timestamps
  }
}

// Import config state from persistence
export const setConfigState = (data: {
  defaultStrawMaterial?: MaterialId
  ringBeamAssemblyConfigs: Record<RingBeamAssemblyId, RingBeamAssemblyConfig>
  wallAssemblyConfigs: Record<WallAssemblyId, WallAssemblyConfig>
  floorAssemblyConfigs?: Record<FloorAssemblyId, FloorAssemblyConfig>
  roofAssemblyConfigs?: Record<RoofAssemblyId, RoofAssemblyConfig>
  openingAssemblyConfigs?: Record<OpeningAssemblyId, OpeningAssemblyConfig>
  defaultBaseRingBeamAssemblyId?: RingBeamAssemblyId
  defaultTopRingBeamAssemblyId?: RingBeamAssemblyId
  defaultWallAssemblyId: WallAssemblyId
  defaultFloorAssemblyId?: FloorAssemblyId
  defaultRoofAssemblyId?: RoofAssemblyId
  defaultOpeningAssemblyId?: OpeningAssemblyId
  timestamps?: Record<AssemblyId, number>
}) => {
  const state = useConfigStore.getState()

  useConfigStore.setState({
    defaultStrawMaterial: data.defaultStrawMaterial ?? state.defaultStrawMaterial,
    ringBeamAssemblyConfigs: data.ringBeamAssemblyConfigs,
    wallAssemblyConfigs: data.wallAssemblyConfigs,
    floorAssemblyConfigs: data.floorAssemblyConfigs ?? state.floorAssemblyConfigs,
    roofAssemblyConfigs: data.roofAssemblyConfigs ?? state.roofAssemblyConfigs,
    openingAssemblyConfigs: data.openingAssemblyConfigs ?? state.openingAssemblyConfigs,
    defaultBaseRingBeamAssemblyId: data.defaultBaseRingBeamAssemblyId,
    defaultTopRingBeamAssemblyId: data.defaultTopRingBeamAssemblyId,
    defaultWallAssemblyId: data.defaultWallAssemblyId,
    defaultFloorAssemblyId: data.defaultFloorAssemblyId ?? state.defaultFloorAssemblyId,
    defaultRoofAssemblyId: data.defaultRoofAssemblyId ?? state.defaultRoofAssemblyId,
    defaultOpeningAssemblyId: data.defaultOpeningAssemblyId ?? state.defaultOpeningAssemblyId,
    timestamps: data.timestamps ?? {}
  })
}

// Subscription helpers for derived state invalidation
export const subscribeToWallAssemblies = (
  cb: (id: WallAssemblyId, current?: WallAssemblyConfig, previous?: WallAssemblyConfig) => void
) => subscribeRecords(useConfigStore, s => s.wallAssemblyConfigs, cb)

export const subscribeToFloorAssemblies = (
  cb: (id: FloorAssemblyId, current?: FloorAssemblyConfig, previous?: FloorAssemblyConfig) => void
) => subscribeRecords(useConfigStore, s => s.floorAssemblyConfigs, cb)

export const subscribeToRoofAssemblies = (
  cb: (id: RoofAssemblyId, current?: RoofAssemblyConfig, previous?: RoofAssemblyConfig) => void
) => subscribeRecords(useConfigStore, s => s.roofAssemblyConfigs, cb)

export const subscribeToConfigChanges = useConfigStore.subscribe

export function hydrateConfigState(state: unknown, version: number): ConfigState {
  const migratedState =
    version < CONFIG_STORE_VERSION ? (applyMigrations(state) as ConfigState) : (state as ConfigState)
  useConfigStore.setState(migratedState)
  return migratedState
}

// Only for the tests
export const _clearAllAssemblies = () =>
  useConfigStore.setState({
    ringBeamAssemblyConfigs: {},
    wallAssemblyConfigs: {},
    floorAssemblyConfigs: {},
    roofAssemblyConfigs: {},
    openingAssemblyConfigs: {}
  })
