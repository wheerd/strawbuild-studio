import { type StateCreator } from 'zustand'

import { type WallAssemblyId, createWallAssemblyId } from '@/building/model/ids'
import {
  type TimestampsState,
  removeTimestampDraft,
  updateTimestampDraft
} from '@/construction/config/store/slices/timestampsSlice'
import type { WallAssemblyConfig } from '@/construction/config/types'
import { type WallConfig, validateWallConfig } from '@/construction/walls/types'

import { DEFAULT_WALL_ASSEMBLIES, DEFAULT_WALL_ASSEMBLY_ID } from './walls.defaults'

export interface WallAssembliesState {
  wallAssemblyConfigs: Record<WallAssemblyId, WallAssemblyConfig>
  defaultWallAssemblyId: WallAssemblyId
}

type UnionOmit<T, K extends string | number | symbol> = T extends unknown ? Omit<T, K> : never

export interface WallAssembliesActions {
  addWallAssembly: (name: string, config: WallConfig) => WallAssemblyConfig
  removeWallAssembly: (id: WallAssemblyId) => void
  updateWallAssemblyName: (id: WallAssemblyId, name: string) => void
  updateWallAssemblyConfig: (id: WallAssemblyId, config: Partial<UnionOmit<WallConfig, 'type'>>) => void
  duplicateWallAssembly: (id: WallAssemblyId, name: string) => WallAssemblyConfig

  getWallAssemblyById: (id: WallAssemblyId) => WallAssemblyConfig | null
  getAllWallAssemblies: () => WallAssemblyConfig[]

  setDefaultWallAssembly: (assemblyId: WallAssemblyId) => void
  getDefaultWallAssemblyId: () => WallAssemblyId
  resetWallAssembliesToDefaults: () => void
}

export type WallAssembliesSlice = WallAssembliesState & { actions: WallAssembliesActions }

// Validation functions
const validateWallAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Wall assembly name cannot be empty')
  }
}

export const createWallAssembliesSlice: StateCreator<
  WallAssembliesSlice & TimestampsState,
  [['zustand/immer', never]],
  [],
  WallAssembliesSlice
> = (set, get) => {
  return {
    wallAssemblyConfigs: Object.fromEntries(DEFAULT_WALL_ASSEMBLIES.map(assembly => [assembly.id, assembly])),
    defaultWallAssemblyId: DEFAULT_WALL_ASSEMBLY_ID,

    actions: {
      addWallAssembly: (name: string, config: WallConfig) => {
        validateWallAssemblyName(name)
        validateWallConfig(config)

        const id = createWallAssemblyId()
        const assembly = {
          ...config,
          id,
          name
        } as WallAssemblyConfig

        set(state => {
          state.wallAssemblyConfigs[id] = assembly
          updateTimestampDraft(state, id)
        })

        return assembly
      },

      duplicateWallAssembly: (id: WallAssemblyId, name: string) => {
        const state = get()
        if (!(id in state.wallAssemblyConfigs)) {
          throw new Error(`Wall assembly with id ${id} not found`)
        }
        const original = state.wallAssemblyConfigs[id]

        validateWallAssemblyName(name)

        const newId = createWallAssemblyId()
        const duplicated = {
          ...original,
          id: newId,
          name: name.trim(),
          nameKey: undefined
        } as WallAssemblyConfig

        set(state => {
          state.wallAssemblyConfigs[newId] = duplicated
          updateTimestampDraft(state, newId)
        })

        return duplicated
      },

      removeWallAssembly: (id: WallAssemblyId) => {
        set(state => {
          if (state.defaultWallAssemblyId === id) {
            return
          }

          const { [id]: _removed, ...remainingAssemblies } = state.wallAssemblyConfigs
          state.wallAssemblyConfigs = remainingAssemblies
          removeTimestampDraft(state, id)
        })
      },

      updateWallAssemblyName: (id: WallAssemblyId, name: string) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return
          const assembly = state.wallAssemblyConfigs[id]

          validateWallAssemblyName(name)

          assembly.name = name.trim()
          assembly.nameKey = undefined
          updateTimestampDraft(state, id)
        })
      },

      updateWallAssemblyConfig: (id: WallAssemblyId, config: Partial<UnionOmit<WallConfig, 'type'>>) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return
          const assembly = state.wallAssemblyConfigs[id]

          Object.assign(assembly, config, { id })
          const { id: _id, name: _name, ...wallConfig } = assembly
          validateWallConfig(wallConfig as WallConfig)
          updateTimestampDraft(state, id)
        })
      },

      getWallAssemblyById: (id: WallAssemblyId) => {
        const state = get()
        return state.wallAssemblyConfigs[id] ?? null
      },

      getAllWallAssemblies: () => {
        const state = get()
        return Object.values(state.wallAssemblyConfigs)
      },

      setDefaultWallAssembly: (assemblyId: WallAssemblyId | undefined) => {
        set(state => {
          state.defaultWallAssemblyId = assemblyId ?? DEFAULT_WALL_ASSEMBLY_ID
        })
      },

      getDefaultWallAssemblyId: () => {
        const state = get()
        return state.defaultWallAssemblyId
      },

      resetWallAssembliesToDefaults: () => {
        set(state => {
          const defaultIds = DEFAULT_WALL_ASSEMBLIES.map(a => a.id)
          const currentIds = Object.keys(state.wallAssemblyConfigs) as WallAssemblyId[]

          const customAssemblies = Object.fromEntries(
            Object.entries(state.wallAssemblyConfigs).filter(([id]) => !defaultIds.includes(id as WallAssemblyId))
          )

          const resetAssemblies = Object.fromEntries(DEFAULT_WALL_ASSEMBLIES.map(assembly => [assembly.id, assembly]))

          const newDefaultId = defaultIds.includes(state.defaultWallAssemblyId)
            ? DEFAULT_WALL_ASSEMBLY_ID
            : state.defaultWallAssemblyId

          for (const id of currentIds) {
            if (!defaultIds.includes(id) && id in customAssemblies) {
              continue
            }
            if (defaultIds.includes(id) && !(id in customAssemblies)) {
              removeTimestampDraft(state, id)
            }
          }

          for (const assembly of DEFAULT_WALL_ASSEMBLIES) {
            if (!currentIds.includes(assembly.id)) {
              updateTimestampDraft(state, assembly.id)
            }
          }

          state.wallAssemblyConfigs = { ...resetAssemblies, ...customAssemblies }
          state.defaultWallAssemblyId = newDefaultId
        })
      }
    } satisfies WallAssembliesActions
  }
}
