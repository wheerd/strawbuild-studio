import { type StateCreator } from 'zustand'

import { type FloorAssemblyId, createFloorAssemblyId } from '@/building/model/ids'
import {
  type TimestampsState,
  removeTimestampDraft,
  updateTimestampDraft
} from '@/construction/config/store/slices/timestampsSlice'
import type { FloorAssemblyConfig } from '@/construction/config/types'
import { type FloorConfig, validateFloorConfig } from '@/construction/floors/types'

import { DEFAULT_FLOOR_ASSEMBLIES, DEFAULT_FLOOR_ASSEMBLY_ID } from './floors.defaults'

export interface FloorAssembliesState {
  floorAssemblyConfigs: Record<FloorAssemblyId, FloorAssemblyConfig>
  defaultFloorAssemblyId: FloorAssemblyId
}

export interface FloorAssembliesActions {
  addFloorAssembly: (name: string, config: FloorConfig) => FloorAssemblyConfig
  removeFloorAssembly: (id: FloorAssemblyId) => void
  updateFloorAssemblyName: (id: FloorAssemblyId, name: string) => void
  updateFloorAssemblyConfig: (id: FloorAssemblyId, config: Partial<Omit<FloorConfig, 'type'>>) => void
  duplicateFloorAssembly: (id: FloorAssemblyId, name: string) => FloorAssemblyConfig

  getFloorAssemblyById: (id: FloorAssemblyId) => FloorAssemblyConfig | null
  getAllFloorAssemblies: () => FloorAssemblyConfig[]

  setDefaultFloorAssembly: (configId: FloorAssemblyId) => void
  getDefaultFloorAssemblyId: () => FloorAssemblyId
  resetFloorAssembliesToDefaults: () => void
}

export type FloorAssembliesSlice = FloorAssembliesState & { actions: FloorAssembliesActions }

const validateFloorAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Floor assembly name cannot be empty')
  }
}

export const createFloorAssembliesSlice: StateCreator<
  FloorAssembliesSlice & TimestampsState,
  [['zustand/immer', never]],
  [],
  FloorAssembliesSlice
> = (set, get) => {
  return {
    floorAssemblyConfigs: Object.fromEntries(DEFAULT_FLOOR_ASSEMBLIES.map(config => [config.id, config])),
    defaultFloorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID,

    actions: {
      addFloorAssembly: (name: string, config: FloorConfig) => {
        validateFloorAssemblyName(name)
        validateFloorConfig(config)

        const id = createFloorAssemblyId()
        const assembly = {
          ...config,
          id,
          name
        } as FloorAssemblyConfig

        set(state => {
          state.floorAssemblyConfigs[assembly.id] = assembly
          updateTimestampDraft(state, assembly.id)
        })

        return assembly
      },

      removeFloorAssembly: (id: FloorAssemblyId) => {
        set(state => {
          const { floorAssemblyConfigs } = state

          // Prevent removing the last config
          if (Object.keys(floorAssemblyConfigs).length === 1) {
            throw new Error('Cannot remove the last floor assembly')
          }

          const { [id]: _removed, ...remainingConfigs } = floorAssemblyConfigs
          removeTimestampDraft(state, id)

          // If removing the default, set first remaining config as default
          let newDefaultId = state.defaultFloorAssemblyId
          if (state.defaultFloorAssemblyId === id) {
            newDefaultId = Object.keys(remainingConfigs)[0] as FloorAssemblyId
          }

          return {
            ...state,
            floorAssemblyConfigs: remainingConfigs,
            defaultFloorAssemblyId: newDefaultId
          }
        })
      },

      updateFloorAssemblyName: (id: FloorAssemblyId, name: string) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const assembly = state.floorAssemblyConfigs[id]

          validateFloorAssemblyName(name)

          assembly.name = name.trim()
          assembly.nameKey = undefined
          updateTimestampDraft(state, id)
        })
      },

      updateFloorAssemblyConfig: (id: FloorAssemblyId, updates: Partial<Omit<FloorConfig, 'type'>>) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const config = state.floorAssemblyConfigs[id]

          const updatedConfig: FloorAssemblyConfig = { ...config, ...updates, id }
          validateFloorConfig(updatedConfig)

          state.floorAssemblyConfigs[id] = updatedConfig
          updateTimestampDraft(state, id)
        })
      },

      duplicateFloorAssembly: (id: FloorAssemblyId, name: string) => {
        const state = get()
        if (!(id in state.floorAssemblyConfigs)) {
          throw new Error(`Floor assembly with id ${id} not found`)
        }
        const original = state.floorAssemblyConfigs[id]

        validateFloorAssemblyName(name)

        const newId = createFloorAssemblyId()
        const duplicated = { ...original, id: newId, name: name.trim(), nameKey: undefined } as FloorAssemblyConfig

        set(state => {
          state.floorAssemblyConfigs[newId] = duplicated
          updateTimestampDraft(state, newId)
        })

        return duplicated
      },

      getFloorAssemblyById: (id: FloorAssemblyId) => {
        const state = get()
        return state.floorAssemblyConfigs[id] ?? null
      },

      getAllFloorAssemblies: () => {
        const state = get()
        return Object.values(state.floorAssemblyConfigs)
      },

      setDefaultFloorAssembly: (configId: FloorAssemblyId) => {
        set(state => {
          if (!(configId in state.floorAssemblyConfigs)) {
            throw new Error(`Floor assembly with id ${configId} not found`)
          }
          state.defaultFloorAssemblyId = configId
        })
      },

      getDefaultFloorAssemblyId: () => {
        const state = get()
        return state.defaultFloorAssemblyId
      },

      resetFloorAssembliesToDefaults: () => {
        set(state => {
          const defaultIds = DEFAULT_FLOOR_ASSEMBLIES.map(a => a.id)
          const currentIds = Object.keys(state.floorAssemblyConfigs) as FloorAssemblyId[]

          const customAssemblies = Object.fromEntries(
            Object.entries(state.floorAssemblyConfigs).filter(([id]) => !defaultIds.includes(id as FloorAssemblyId))
          )

          const resetAssemblies = Object.fromEntries(DEFAULT_FLOOR_ASSEMBLIES.map(assembly => [assembly.id, assembly]))

          const newDefaultId = defaultIds.includes(state.defaultFloorAssemblyId)
            ? DEFAULT_FLOOR_ASSEMBLY_ID
            : state.defaultFloorAssemblyId

          for (const id of currentIds) {
            if (!defaultIds.includes(id) && id in customAssemblies) {
              continue
            }
            if (defaultIds.includes(id) && !(id in customAssemblies)) {
              removeTimestampDraft(state, id)
            }
          }

          for (const assembly of DEFAULT_FLOOR_ASSEMBLIES) {
            if (!currentIds.includes(assembly.id)) {
              updateTimestampDraft(state, assembly.id)
            }
          }

          state.floorAssemblyConfigs = { ...resetAssemblies, ...customAssemblies }
          state.defaultFloorAssemblyId = newDefaultId
        })
      }
    } satisfies FloorAssembliesActions
  }
}
