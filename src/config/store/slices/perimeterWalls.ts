import { type StateCreator } from 'zustand'

import { type PerimeterWallAssemblyId, createPerimeterWallAssemblyId } from '@/building/model/ids'
import { type TimestampsState, removeTimestampDraft, updateTimestampDraft } from '@/config/store/slices/timestampsSlice'
import type { PerimeterWallAssemblyConfig } from '@/config/types'
import { type PerimeterWallConfig, validatePerimeterWallConfig } from '@/construction/assemblies/walls/types'

import { DEFAULT_PERIMETER_WALL_ASSEMBLIES, DEFAULT_PERIMETER_WALL_ASSEMBLY_ID } from './perimeterWalls.defaults'

export interface PerimeterWallAssembliesState {
  perimeterWallAssemblyConfigs: Record<PerimeterWallAssemblyId, PerimeterWallAssemblyConfig>
  defaultPerimeterWallAssemblyId: PerimeterWallAssemblyId
}

type UnionOmit<T, K extends string | number | symbol> = T extends unknown ? Omit<T, K> : never

export interface PerimeterWallAssembliesActions {
  addPerimeterWallAssembly: (name: string, config: PerimeterWallConfig) => PerimeterWallAssemblyConfig
  removePerimeterWallAssembly: (id: PerimeterWallAssemblyId) => void
  updatePerimeterWallAssemblyName: (id: PerimeterWallAssemblyId, name: string) => void
  updatePerimeterWallAssemblyConfig: (
    id: PerimeterWallAssemblyId,
    config: Partial<UnionOmit<PerimeterWallConfig, 'type'>>
  ) => void
  duplicatePerimeterWallAssembly: (id: PerimeterWallAssemblyId, name: string) => PerimeterWallAssemblyConfig

  getPerimeterWallAssemblyById: (id: PerimeterWallAssemblyId) => PerimeterWallAssemblyConfig | null
  getAllPerimeterWallAssemblies: () => PerimeterWallAssemblyConfig[]

  setDefaultPerimeterWallAssembly: (assemblyId: PerimeterWallAssemblyId) => void
  getDefaultPerimeterWallAssemblyId: () => PerimeterWallAssemblyId
  resetPerimeterWallAssembliesToDefaults: () => void
}

export type PerimeterWallAssembliesSlice = PerimeterWallAssembliesState & { actions: PerimeterWallAssembliesActions }

// Validation functions
const validateWallAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Wall assembly name cannot be empty')
  }
}

export const createPerimeterWallAssembliesSlice: StateCreator<
  PerimeterWallAssembliesSlice & TimestampsState,
  [['zustand/immer', never]],
  [],
  PerimeterWallAssembliesSlice
> = (set, get) => {
  return {
    perimeterWallAssemblyConfigs: Object.fromEntries(
      DEFAULT_PERIMETER_WALL_ASSEMBLIES.map(assembly => [assembly.id, assembly])
    ),
    defaultPerimeterWallAssemblyId: DEFAULT_PERIMETER_WALL_ASSEMBLY_ID,

    actions: {
      addPerimeterWallAssembly: (name: string, config: PerimeterWallConfig) => {
        validateWallAssemblyName(name)
        validatePerimeterWallConfig(config)

        const id = createPerimeterWallAssemblyId()
        const assembly = {
          ...config,
          id,
          name
        } as PerimeterWallAssemblyConfig

        set(state => {
          state.perimeterWallAssemblyConfigs[id] = assembly
          updateTimestampDraft(state, id)
        })

        return assembly
      },

      duplicatePerimeterWallAssembly: (id: PerimeterWallAssemblyId, name: string) => {
        const state = get()
        if (!(id in state.perimeterWallAssemblyConfigs)) {
          throw new Error(`Wall assembly with id ${id} not found`)
        }
        const original = state.perimeterWallAssemblyConfigs[id]

        validateWallAssemblyName(name)

        const newId = createPerimeterWallAssemblyId()
        const duplicated = {
          ...original,
          id: newId,
          name: name.trim(),
          nameKey: undefined
        } as PerimeterWallAssemblyConfig

        set(state => {
          state.perimeterWallAssemblyConfigs[newId] = duplicated
          updateTimestampDraft(state, newId)
        })

        return duplicated
      },

      removePerimeterWallAssembly: (id: PerimeterWallAssemblyId) => {
        set(state => {
          if (state.defaultPerimeterWallAssemblyId === id) {
            return
          }

          const { [id]: _removed, ...remainingAssemblies } = state.perimeterWallAssemblyConfigs
          state.perimeterWallAssemblyConfigs = remainingAssemblies
          removeTimestampDraft(state, id)
        })
      },

      updatePerimeterWallAssemblyName: (id: PerimeterWallAssemblyId, name: string) => {
        set(state => {
          if (!(id in state.perimeterWallAssemblyConfigs)) return
          const assembly = state.perimeterWallAssemblyConfigs[id]

          validateWallAssemblyName(name)

          assembly.name = name.trim()
          assembly.nameKey = undefined
          updateTimestampDraft(state, id)
        })
      },

      updatePerimeterWallAssemblyConfig: (
        id: PerimeterWallAssemblyId,
        config: Partial<UnionOmit<PerimeterWallConfig, 'type'>>
      ) => {
        set(state => {
          if (!(id in state.perimeterWallAssemblyConfigs)) return
          const assembly = state.perimeterWallAssemblyConfigs[id]

          Object.assign(assembly, config, { id })
          const { id: _id, name: _name, ...wallConfig } = assembly
          validatePerimeterWallConfig(wallConfig as PerimeterWallConfig)
          updateTimestampDraft(state, id)
        })
      },

      getPerimeterWallAssemblyById: (id: PerimeterWallAssemblyId) => {
        const state = get()
        return state.perimeterWallAssemblyConfigs[id] ?? null
      },

      getAllPerimeterWallAssemblies: () => {
        const state = get()
        return Object.values(state.perimeterWallAssemblyConfigs)
      },

      setDefaultPerimeterWallAssembly: (assemblyId: PerimeterWallAssemblyId | undefined) => {
        set(state => {
          state.defaultPerimeterWallAssemblyId = assemblyId ?? DEFAULT_PERIMETER_WALL_ASSEMBLY_ID
        })
      },

      getDefaultPerimeterWallAssemblyId: () => {
        const state = get()
        return state.defaultPerimeterWallAssemblyId
      },

      resetPerimeterWallAssembliesToDefaults: () => {
        set(state => {
          const defaultIds = DEFAULT_PERIMETER_WALL_ASSEMBLIES.map(a => a.id)
          const currentIds = Object.keys(state.perimeterWallAssemblyConfigs) as PerimeterWallAssemblyId[]

          const customAssemblies = Object.fromEntries(
            Object.entries(state.perimeterWallAssemblyConfigs).filter(
              ([id]) => !defaultIds.includes(id as PerimeterWallAssemblyId)
            )
          )

          const resetAssemblies = Object.fromEntries(
            DEFAULT_PERIMETER_WALL_ASSEMBLIES.map(assembly => [assembly.id, assembly])
          )

          const newDefaultId = defaultIds.includes(state.defaultPerimeterWallAssemblyId)
            ? DEFAULT_PERIMETER_WALL_ASSEMBLY_ID
            : state.defaultPerimeterWallAssemblyId

          for (const id of currentIds) {
            if (!defaultIds.includes(id) && id in customAssemblies) {
              continue
            }
            if (defaultIds.includes(id) && !(id in customAssemblies)) {
              removeTimestampDraft(state, id)
            }
          }

          for (const assembly of DEFAULT_PERIMETER_WALL_ASSEMBLIES) {
            if (!currentIds.includes(assembly.id)) {
              updateTimestampDraft(state, assembly.id)
            }
          }

          state.perimeterWallAssemblyConfigs = { ...resetAssemblies, ...customAssemblies }
          state.defaultPerimeterWallAssemblyId = newDefaultId
        })
      }
    } satisfies PerimeterWallAssembliesActions
  }
}
