import { type StateCreator } from 'zustand'

import type { OpeningAssemblyId } from '@/building/model/ids'
import { createOpeningAssemblyId } from '@/building/model/ids'
import {
  DEFAULT_OPENING_ASSEMBLIES,
  DEFAULT_OPENING_ASSEMBLY_ID
} from '@/construction/config/store/slices/opening.defaults'
import type { TimestampsActions } from '@/construction/config/store/slices/timestampsSlice'
import type { OpeningAssemblyConfig } from '@/construction/config/types'
import type { OpeningConfig } from '@/construction/openings/types'
import { validateOpeningConfig } from '@/construction/openings/types'

export interface OpeningAssembliesState {
  openingAssemblyConfigs: Record<OpeningAssemblyId, OpeningAssemblyConfig>
  defaultOpeningAssemblyId: OpeningAssemblyId
}

export interface OpeningAssembliesActions {
  // CRUD operations for opening assemblies
  addOpeningAssembly: (name: string, config: OpeningConfig) => OpeningAssemblyConfig
  removeOpeningAssembly: (id: OpeningAssemblyId) => void
  updateOpeningAssemblyName: (id: OpeningAssemblyId, name: string) => void
  updateOpeningAssemblyConfig: (id: OpeningAssemblyId, config: Partial<Omit<OpeningConfig, 'type'>>) => void
  duplicateOpeningAssembly: (id: OpeningAssemblyId, name: string) => OpeningAssemblyConfig

  // Opening assembly queries
  getOpeningAssemblyById: (id: OpeningAssemblyId) => OpeningAssemblyConfig | null
  getAllOpeningAssemblies: () => OpeningAssemblyConfig[]

  // Default opening assembly management
  setDefaultOpeningAssembly: (assemblyId: OpeningAssemblyId) => void
  getDefaultOpeningAssemblyId: () => OpeningAssemblyId
  resetOpeningAssembliesToDefaults: () => void
}

export type OpeningAssembliesSlice = OpeningAssembliesState & { actions: OpeningAssembliesActions }

// Validation functions
const validateOpeningAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Opening assembly name cannot be empty')
  }
}

export const createOpeningAssembliesSlice: StateCreator<
  OpeningAssembliesSlice & { actions: OpeningAssembliesActions & TimestampsActions },
  [['zustand/immer', never]],
  [],
  OpeningAssembliesSlice
> = (set, get) => {
  return {
    openingAssemblyConfigs: Object.fromEntries(DEFAULT_OPENING_ASSEMBLIES.map(assembly => [assembly.id, assembly])),
    defaultOpeningAssemblyId: DEFAULT_OPENING_ASSEMBLY_ID,

    actions: {
      // CRUD operations
      addOpeningAssembly: (name: string, config: OpeningConfig) => {
        validateOpeningAssemblyName(name)
        validateOpeningConfig(config)

        const id = createOpeningAssemblyId()
        const assembly = {
          ...config,
          id,
          name
        } as OpeningAssemblyConfig

        set(state => {
          state.openingAssemblyConfigs[id] = assembly
          state.actions.updateTimestamp(id)
        })

        return assembly
      },

      duplicateOpeningAssembly: (id: OpeningAssemblyId, name: string) => {
        const state = get()
        if (!(id in state.openingAssemblyConfigs)) {
          throw new Error(`Opening assembly with id ${id} not found`)
        }
        const original = state.openingAssemblyConfigs[id]

        validateOpeningAssemblyName(name)

        const newId = createOpeningAssemblyId()
        const duplicated = {
          ...original,
          id: newId,
          name: name.trim(),
          nameKey: undefined
        } as OpeningAssemblyConfig

        set(state => {
          state.openingAssemblyConfigs[newId] = duplicated
          state.actions.updateTimestamp(newId)
        })

        return duplicated
      },

      removeOpeningAssembly: (id: OpeningAssemblyId) => {
        set(state => {
          if (state.defaultOpeningAssemblyId === id) {
            return
          }

          const { [id]: _removed, ...remainingAssemblies } = state.openingAssemblyConfigs
          state.openingAssemblyConfigs = remainingAssemblies
          state.actions.removeTimestamp(id)
        })
      },

      updateOpeningAssemblyName: (id: OpeningAssemblyId, name: string) => {
        set(state => {
          if (!(id in state.openingAssemblyConfigs)) return
          const assembly = state.openingAssemblyConfigs[id]

          validateOpeningAssemblyName(name)

          assembly.name = name.trim()
          assembly.nameKey = undefined
          state.actions.updateTimestamp(id)
        })
      },

      updateOpeningAssemblyConfig: (id: OpeningAssemblyId, config: Partial<Omit<OpeningConfig, 'type'>>) => {
        set(state => {
          if (!(id in state.openingAssemblyConfigs)) return
          const assembly = state.openingAssemblyConfigs[id]

          Object.assign(assembly, config, { id: assembly.id })
          const { id: _id, name: _name, ...openingConfig } = assembly
          validateOpeningConfig(openingConfig as OpeningConfig)
          state.actions.updateTimestamp(id)
        })
      },

      // Queries
      getOpeningAssemblyById: (id: OpeningAssemblyId) => {
        const state = get()
        return state.openingAssemblyConfigs[id] ?? null
      },

      getAllOpeningAssemblies: () => {
        const state = get()
        return Object.values(state.openingAssemblyConfigs)
      },

      // Default management
      setDefaultOpeningAssembly: (assemblyId: OpeningAssemblyId) => {
        set(state => {
          state.defaultOpeningAssemblyId = assemblyId
        })
      },

      getDefaultOpeningAssemblyId: () => {
        const state = get()
        return state.defaultOpeningAssemblyId
      },

      resetOpeningAssembliesToDefaults: () => {
        set(state => {
          const defaultIds = DEFAULT_OPENING_ASSEMBLIES.map(a => a.id)
          const currentIds = Object.keys(state.openingAssemblyConfigs) as OpeningAssemblyId[]

          const customAssemblies = Object.fromEntries(
            Object.entries(state.openingAssemblyConfigs).filter(([id]) => !defaultIds.includes(id as OpeningAssemblyId))
          )

          const resetAssemblies = Object.fromEntries(
            DEFAULT_OPENING_ASSEMBLIES.map(assembly => [assembly.id, assembly])
          )

          const newDefaultId = defaultIds.includes(state.defaultOpeningAssemblyId)
            ? DEFAULT_OPENING_ASSEMBLY_ID
            : state.defaultOpeningAssemblyId

          for (const id of currentIds) {
            if (!defaultIds.includes(id) && id in customAssemblies) {
              continue
            }
            if (defaultIds.includes(id) && !(id in customAssemblies)) {
              state.actions.removeTimestamp(id)
            }
          }

          for (const assembly of DEFAULT_OPENING_ASSEMBLIES) {
            if (!currentIds.includes(assembly.id)) {
              state.actions.updateTimestamp(assembly.id)
            }
          }

          state.openingAssemblyConfigs = { ...resetAssemblies, ...customAssemblies }
          state.defaultOpeningAssemblyId = newDefaultId
        })
      }
    } satisfies OpeningAssembliesActions
  }
}
