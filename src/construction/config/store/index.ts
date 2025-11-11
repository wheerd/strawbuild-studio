import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type { FloorAssemblyId, RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import { createFloorAssembliesSlice } from '@/construction/config/store/slices/floors'
import { createRingBeamAssembliesSlice } from '@/construction/config/store/slices/ringBeams'
import { createStrawSlice } from '@/construction/config/store/slices/straw'
import { createWallAssembliesSlice } from '@/construction/config/store/slices/walls'
import type { ConfigActions, ConfigState, ConfigStore } from '@/construction/config/store/types'
import type { FloorAssemblyConfig, RingBeamAssemblyConfig, WallAssemblyConfig } from '@/construction/config/types'
import type { MaterialId } from '@/construction/materials/material'
import '@/shared/geometry'

import { CURRENT_VERSION, applyMigrations } from './migrations'

export * from './types'

const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get, store) => {
      const strawSlice = immer(createStrawSlice)(set, get, store)
      const ringBeamSlice = immer(createRingBeamAssembliesSlice)(set, get, store)
      const wallSlice = immer(createWallAssembliesSlice)(set, get, store)
      const floorSlice = immer(createFloorAssembliesSlice)(set, get, store)

      return {
        ...strawSlice,
        ...ringBeamSlice,
        ...wallSlice,
        ...floorSlice,
        actions: {
          ...strawSlice.actions,
          ...ringBeamSlice.actions,
          ...wallSlice.actions,
          ...floorSlice.actions,
          reset: () => {
            set(store.getInitialState())
          }
        }
      }
    },
    {
      name: 'strawbaler-config',
      version: CURRENT_VERSION,
      partialize: state => ({
        defaultStrawMaterial: state.defaultStrawMaterial,
        ringBeamAssemblyConfigs: state.ringBeamAssemblyConfigs,
        wallAssemblyConfigs: state.wallAssemblyConfigs,
        floorAssemblyConfigs: state.floorAssemblyConfigs,
        defaultBaseRingBeamAssemblyId: state.defaultBaseRingBeamAssemblyId,
        defaultTopRingBeamAssemblyId: state.defaultTopRingBeamAssemblyId,
        defaultWallAssemblyId: state.defaultWallAssemblyId,
        defaultFloorAssemblyId: state.defaultFloorAssemblyId
      }),
      migrate: (persistedState: unknown, version: number) => {
        if (version === CURRENT_VERSION) {
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

export const useConfigActions = (): ConfigActions => useConfigStore(state => state.actions)

// For non-reactive contexts
export const getConfigActions = (): ConfigActions => useConfigStore.getState().actions

// Export config state for persistence
export const getConfigState = () => {
  const state = useConfigStore.getState()
  return {
    defaultStrawMaterial: state.defaultStrawMaterial,
    ringBeamAssemblyConfigs: state.ringBeamAssemblyConfigs,
    wallAssemblyConfigs: state.wallAssemblyConfigs,
    floorAssemblyConfigs: state.floorAssemblyConfigs,
    defaultBaseRingBeamAssemblyId: state.defaultBaseRingBeamAssemblyId,
    defaultTopRingBeamAssemblyId: state.defaultTopRingBeamAssemblyId,
    defaultWallAssemblyId: state.defaultWallAssemblyId,
    defaultFloorAssemblyId: state.defaultFloorAssemblyId
  }
}

// Import config state from persistence
export const setConfigState = (data: {
  defaultStrawMaterial?: MaterialId
  ringBeamAssemblyConfigs: Record<RingBeamAssemblyId, RingBeamAssemblyConfig>
  wallAssemblyConfigs: Record<WallAssemblyId, WallAssemblyConfig>
  floorAssemblyConfigs?: Record<FloorAssemblyId, FloorAssemblyConfig>
  defaultBaseRingBeamAssemblyId?: RingBeamAssemblyId
  defaultTopRingBeamAssemblyId?: RingBeamAssemblyId
  defaultWallAssemblyId: WallAssemblyId
  defaultFloorAssemblyId?: FloorAssemblyId
}) => {
  const state = useConfigStore.getState()

  useConfigStore.setState({
    defaultStrawMaterial: data.defaultStrawMaterial ?? state.defaultStrawMaterial,
    ringBeamAssemblyConfigs: data.ringBeamAssemblyConfigs,
    wallAssemblyConfigs: data.wallAssemblyConfigs,
    floorAssemblyConfigs: data.floorAssemblyConfigs ?? state.floorAssemblyConfigs,
    defaultBaseRingBeamAssemblyId: data.defaultBaseRingBeamAssemblyId,
    defaultTopRingBeamAssemblyId: data.defaultTopRingBeamAssemblyId,
    defaultWallAssemblyId: data.defaultWallAssemblyId,
    defaultFloorAssemblyId: data.defaultFloorAssemblyId ?? state.defaultFloorAssemblyId
  })
}

// Only for the tests
export const _clearAllAssemblies = () =>
  useConfigStore.setState({
    ringBeamAssemblyConfigs: {},
    wallAssemblyConfigs: {},
    floorAssemblyConfigs: {}
  })
