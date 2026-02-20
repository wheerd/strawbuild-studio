import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { createFloorAssembliesSlice } from '@/construction/config/store/slices/floors'
import { createLayerSetsSlice } from '@/construction/config/store/slices/layers'
import { createOpeningAssembliesSlice } from '@/construction/config/store/slices/openings'
import { createRingBeamAssembliesSlice } from '@/construction/config/store/slices/ringBeams'
import { createRoofAssembliesSlice } from '@/construction/config/store/slices/roofs'
import { createStrawSlice } from '@/construction/config/store/slices/straw'
import { createTimestampsSlice } from '@/construction/config/store/slices/timestampsSlice'
import { createWallAssembliesSlice } from '@/construction/config/store/slices/walls'
import type { ConfigState, ConfigStore } from '@/construction/config/store/types'

import { CONFIG_STORE_VERSION, applyMigrations } from './migrations'

export const useConfigStore = create<ConfigStore>()(
  subscribeWithSelector(
    persist(
      (set, get, store) => {
        const strawSlice = immer(createStrawSlice)(set, get, store)
        const ringBeamSlice = immer(createRingBeamAssembliesSlice)(set, get, store)
        const wallSlice = immer(createWallAssembliesSlice)(set, get, store)
        const floorSlice = immer(createFloorAssembliesSlice)(set, get, store)
        const roofSlice = immer(createRoofAssembliesSlice)(set, get, store)
        const openingSlice = immer(createOpeningAssembliesSlice)(set, get, store)
        const layerSetsSlice = immer(createLayerSetsSlice)(set, get, store)
        const timestampsSlice = immer(createTimestampsSlice)(set, get, store)

        return {
          ...strawSlice,
          ...ringBeamSlice,
          ...wallSlice,
          ...floorSlice,
          ...roofSlice,
          ...openingSlice,
          ...layerSetsSlice,
          ...timestampsSlice,
          actions: {
            ...strawSlice.actions,
            ...ringBeamSlice.actions,
            ...wallSlice.actions,
            ...floorSlice.actions,
            ...roofSlice.actions,
            ...openingSlice.actions,
            ...layerSetsSlice.actions,
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
          layerSetConfigs: state.layerSetConfigs,
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
