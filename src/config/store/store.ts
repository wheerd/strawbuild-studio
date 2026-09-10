import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { createFloorAssembliesSlice } from '@/config/store/slices/floors'
import { createInteriorWallAssembliesSlice } from '@/config/store/slices/interiorWalls'
import { createLayerSetsSlice } from '@/config/store/slices/layers'
import { createOpeningAssembliesSlice } from '@/config/store/slices/openings'
import { createPerimeterWallAssembliesSlice } from '@/config/store/slices/perimeterWalls'
import { createRingBeamAssembliesSlice } from '@/config/store/slices/ringBeams'
import { createRoofAssembliesSlice } from '@/config/store/slices/roofs'
import { createStrawSlice } from '@/config/store/slices/straw'
import { createTimestampsSlice } from '@/config/store/slices/timestampsSlice'
import type { ConfigState, ConfigStore } from '@/config/store/types'

import { mergeStateWithDefaults } from './mergeDefaults'
import { CONFIG_STORE_VERSION, applyMigrations } from './migrations'

export const useConfigStore = create<ConfigStore>()(
  subscribeWithSelector(
    persist(
      (set, get, store) => {
        const strawSlice = immer(createStrawSlice)(set, get, store)
        const ringBeamSlice = immer(createRingBeamAssembliesSlice)(set, get, store)
        const perimeterWallSlice = immer(createPerimeterWallAssembliesSlice)(set, get, store)
        const interiorWallSlice = immer(createInteriorWallAssembliesSlice)(set, get, store)
        const floorSlice = immer(createFloorAssembliesSlice)(set, get, store)
        const roofSlice = immer(createRoofAssembliesSlice)(set, get, store)
        const openingSlice = immer(createOpeningAssembliesSlice)(set, get, store)
        const layerSetsSlice = immer(createLayerSetsSlice)(set, get, store)
        const timestampsSlice = immer(createTimestampsSlice)(set, get, store)

        return {
          ...strawSlice,
          ...ringBeamSlice,
          ...perimeterWallSlice,
          ...interiorWallSlice,
          ...floorSlice,
          ...roofSlice,
          ...openingSlice,
          ...layerSetsSlice,
          ...timestampsSlice,
          actions: {
            ...strawSlice.actions,
            ...ringBeamSlice.actions,
            ...perimeterWallSlice.actions,
            ...interiorWallSlice.actions,
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
          perimeterWallAssemblyConfigs: state.perimeterWallAssemblyConfigs,
          interiorWallAssemblyConfigs: state.interiorWallAssemblyConfigs,
          floorAssemblyConfigs: state.floorAssemblyConfigs,
          roofAssemblyConfigs: state.roofAssemblyConfigs,
          openingAssemblyConfigs: state.openingAssemblyConfigs,
          layerSetConfigs: state.layerSetConfigs,
          defaultBaseRingBeamAssemblyId: state.defaultBaseRingBeamAssemblyId,
          defaultTopRingBeamAssemblyId: state.defaultTopRingBeamAssemblyId,
          defaultPerimeterWallAssemblyId: state.defaultPerimeterWallAssemblyId,
          defaultInteriorWallAssemblyId: state.defaultInteriorWallAssemblyId,
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
        },
        onRehydrateStorage: () => state => {
          if (state) {
            mergeStateWithDefaults(state)
          }
        }
      }
    )
  )
)

// Only for the tests
export const _clearAllAssemblies = () =>
  useConfigStore.setState({
    ringBeamAssemblyConfigs: {},
    perimeterWallAssemblyConfigs: {},
    interiorWallAssemblyConfigs: {},
    floorAssemblyConfigs: {},
    roofAssemblyConfigs: {},
    openingAssemblyConfigs: {}
  })
