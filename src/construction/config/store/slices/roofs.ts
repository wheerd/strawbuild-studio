import { type StateCreator } from 'zustand'

import { type RoofAssemblyId, createRoofAssemblyId } from '@/building/model/ids'
import {
  type TimestampsState,
  removeTimestampDraft,
  updateTimestampDraft
} from '@/construction/config/store/slices/timestampsSlice'
import type { RoofAssemblyConfig } from '@/construction/config/types'
import { type RoofConfig, validateRoofConfig } from '@/construction/roofs/types'

import { DEFAULT_ROOF_ASSEMBLIES, DEFAULT_ROOF_ASSEMBLY_ID } from './roofs.defaults'

export interface RoofAssembliesState {
  roofAssemblyConfigs: Record<RoofAssemblyId, RoofAssemblyConfig>
  defaultRoofAssemblyId: RoofAssemblyId
}

type UnionOmit<T, K extends string | number | symbol> = T extends unknown ? Omit<T, K> : never

export interface RoofAssembliesActions {
  addRoofAssembly: (name: string, config: RoofConfig) => RoofAssemblyConfig
  removeRoofAssembly: (id: RoofAssemblyId) => void
  updateRoofAssemblyName: (id: RoofAssemblyId, name: string) => void
  updateRoofAssemblyConfig: (id: RoofAssemblyId, config: Partial<UnionOmit<RoofConfig, 'type'>>) => void
  duplicateRoofAssembly: (id: RoofAssemblyId, name: string) => RoofAssemblyConfig

  getRoofAssemblyById: (id: RoofAssemblyId) => RoofAssemblyConfig | null
  getAllRoofAssemblies: () => RoofAssemblyConfig[]

  setDefaultRoofAssembly: (configId: RoofAssemblyId) => void
  getDefaultRoofAssemblyId: () => RoofAssemblyId
  resetRoofAssembliesToDefaults: () => void
}

export type RoofAssembliesSlice = RoofAssembliesState & { actions: RoofAssembliesActions }

const validateRoofAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Roof assembly name cannot be empty')
  }
}

export const createRoofAssembliesSlice: StateCreator<
  RoofAssembliesSlice & TimestampsState,
  [['zustand/immer', never]],
  [],
  RoofAssembliesSlice
> = (set, get) => {
  return {
    roofAssemblyConfigs: Object.fromEntries(DEFAULT_ROOF_ASSEMBLIES.map(config => [config.id, config])),
    defaultRoofAssemblyId: DEFAULT_ROOF_ASSEMBLY_ID,

    actions: {
      addRoofAssembly: (name: string, config: RoofConfig) => {
        validateRoofAssemblyName(name)
        validateRoofConfig(config)

        const id = createRoofAssemblyId()
        const assembly = {
          ...config,
          id,
          name
        } as RoofAssemblyConfig

        set(state => {
          state.roofAssemblyConfigs[assembly.id] = assembly
          updateTimestampDraft(state, assembly.id)
        })

        return assembly
      },

      removeRoofAssembly: (id: RoofAssemblyId) => {
        set(state => {
          const { roofAssemblyConfigs } = state

          // Prevent removing the last config
          if (Object.keys(roofAssemblyConfigs).length === 1) {
            throw new Error('Cannot remove the last roof assembly')
          }

          const { [id]: _removed, ...remainingConfigs } = roofAssemblyConfigs
          removeTimestampDraft(state, id)

          // If removing the default, set first remaining config as default
          let newDefaultId = state.defaultRoofAssemblyId
          if (state.defaultRoofAssemblyId === id) {
            newDefaultId = Object.keys(remainingConfigs)[0] as RoofAssemblyId
          }

          return {
            ...state,
            roofAssemblyConfigs: remainingConfigs,
            defaultRoofAssemblyId: newDefaultId
          }
        })
      },

      updateRoofAssemblyName: (id: RoofAssemblyId, name: string) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const assembly = state.roofAssemblyConfigs[id]

          validateRoofAssemblyName(name)

          assembly.name = name.trim()
          assembly.nameKey = undefined
          updateTimestampDraft(state, id)
        })
      },

      updateRoofAssemblyConfig: (id: RoofAssemblyId, updates: Partial<UnionOmit<RoofConfig, 'type'>>) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          Object.assign(config, updates, { id })
          validateRoofConfig(config)
          updateTimestampDraft(state, id)
        })
      },

      duplicateRoofAssembly: (id: RoofAssemblyId, name: string) => {
        const state = get()
        if (!(id in state.roofAssemblyConfigs)) {
          throw new Error(`Roof assembly with id ${id} not found`)
        }
        const original = state.roofAssemblyConfigs[id]

        validateRoofAssemblyName(name)

        const newId = createRoofAssemblyId()
        const duplicated = { ...original, id: newId, name: name.trim(), nameKey: undefined } as RoofAssemblyConfig

        set(state => {
          state.roofAssemblyConfigs[newId] = duplicated
          updateTimestampDraft(state, newId)
        })

        return duplicated
      },

      getRoofAssemblyById: (id: RoofAssemblyId) => {
        const state = get()
        return state.roofAssemblyConfigs[id] ?? null
      },

      getAllRoofAssemblies: () => {
        const state = get()
        return Object.values(state.roofAssemblyConfigs)
      },

      setDefaultRoofAssembly: (configId: RoofAssemblyId) => {
        set(state => {
          if (!(configId in state.roofAssemblyConfigs)) {
            throw new Error(`Roof assembly with id ${configId} not found`)
          }
          state.defaultRoofAssemblyId = configId
        })
      },

      getDefaultRoofAssemblyId: () => {
        const state = get()
        return state.defaultRoofAssemblyId
      },

      resetRoofAssembliesToDefaults: () => {
        set(state => {
          const defaultIds = DEFAULT_ROOF_ASSEMBLIES.map(a => a.id)
          const currentIds = Object.keys(state.roofAssemblyConfigs) as RoofAssemblyId[]

          const customAssemblies = Object.fromEntries(
            Object.entries(state.roofAssemblyConfigs).filter(([id]) => !defaultIds.includes(id as RoofAssemblyId))
          )

          const resetAssemblies = Object.fromEntries(DEFAULT_ROOF_ASSEMBLIES.map(assembly => [assembly.id, assembly]))

          const newDefaultId = defaultIds.includes(state.defaultRoofAssemblyId)
            ? DEFAULT_ROOF_ASSEMBLY_ID
            : state.defaultRoofAssemblyId

          for (const id of currentIds) {
            if (!defaultIds.includes(id) && id in customAssemblies) {
              continue
            }
            if (defaultIds.includes(id) && !(id in customAssemblies)) {
              removeTimestampDraft(state, id)
            }
          }

          for (const assembly of DEFAULT_ROOF_ASSEMBLIES) {
            if (!currentIds.includes(assembly.id)) {
              updateTimestampDraft(state, assembly.id)
            }
          }

          state.roofAssemblyConfigs = { ...resetAssemblies, ...customAssemblies }
          state.defaultRoofAssemblyId = newDefaultId
        })
      }
    } satisfies RoofAssembliesActions
  }
}
