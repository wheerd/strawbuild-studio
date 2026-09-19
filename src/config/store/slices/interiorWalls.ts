import { type StateCreator } from 'zustand'

import { type InteriorWallAssemblyId, createInteriorWallAssemblyId } from '@/building/model/ids'
import { type TimestampsState, removeTimestampDraft, updateTimestampDraft } from '@/config/store/slices/timestampsSlice'
import type { InteriorWallAssemblyConfig } from '@/config/types'
import { type InteriorWallConfig, validateInteriorWallConfig } from '@/construction/assemblies/interiorWalls/types'

import { DEFAULT_INTERIOR_WALL_ASSEMBLIES, DEFAULT_INTERIOR_WALL_ASSEMBLY_ID } from './interiorWalls.defaults'

export interface InteriorWallAssembliesState {
  interiorWallAssemblyConfigs: Record<InteriorWallAssemblyId, InteriorWallAssemblyConfig>
  defaultInteriorWallAssemblyId: InteriorWallAssemblyId
}

type UnionOmit<T, K extends string | number | symbol> = T extends unknown ? Omit<T, K> : never

export interface InteriorWallAssembliesActions {
  addInteriorWallAssembly: (name: string, config: InteriorWallConfig) => InteriorWallAssemblyConfig
  removeInteriorWallAssembly: (id: InteriorWallAssemblyId) => void
  updateInteriorWallAssemblyName: (id: InteriorWallAssemblyId, name: string) => void
  updateInteriorWallAssemblyConfig: (
    id: InteriorWallAssemblyId,
    config: Partial<UnionOmit<InteriorWallConfig, 'type'>>
  ) => void
  duplicateInteriorWallAssembly: (id: InteriorWallAssemblyId, name: string) => InteriorWallAssemblyConfig

  getInteriorWallAssemblyById: (id: InteriorWallAssemblyId) => InteriorWallAssemblyConfig | null
  getAllInteriorWallAssemblies: () => InteriorWallAssemblyConfig[]

  setDefaultInteriorWallAssembly: (assemblyId: InteriorWallAssemblyId) => void
  getDefaultInteriorWallAssemblyId: () => InteriorWallAssemblyId
  resetInteriorWallAssembliesToDefaults: () => void
}

export type InteriorWallAssembliesSlice = InteriorWallAssembliesState & { actions: InteriorWallAssembliesActions }

// Validation functions
const validateWallAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Wall assembly name cannot be empty')
  }
}

export const createInteriorWallAssembliesSlice: StateCreator<
  InteriorWallAssembliesSlice & TimestampsState,
  [['zustand/immer', never]],
  [],
  InteriorWallAssembliesSlice
> = (set, get) => {
  return {
    interiorWallAssemblyConfigs: Object.fromEntries(
      DEFAULT_INTERIOR_WALL_ASSEMBLIES.map(assembly => [assembly.id, assembly])
    ),
    defaultInteriorWallAssemblyId: DEFAULT_INTERIOR_WALL_ASSEMBLY_ID,

    actions: {
      addInteriorWallAssembly: (name: string, config: InteriorWallConfig) => {
        validateWallAssemblyName(name)
        validateInteriorWallConfig(config)

        const id = createInteriorWallAssemblyId()
        const assembly = {
          ...config,
          id,
          name
        } as InteriorWallAssemblyConfig

        set(state => {
          state.interiorWallAssemblyConfigs[id] = assembly
          updateTimestampDraft(state, id)
        })

        return assembly
      },

      duplicateInteriorWallAssembly: (id: InteriorWallAssemblyId, name: string) => {
        const state = get()
        if (!(id in state.interiorWallAssemblyConfigs)) {
          throw new Error(`Wall assembly with id ${id} not found`)
        }
        const original = state.interiorWallAssemblyConfigs[id]

        validateWallAssemblyName(name)

        const newId = createInteriorWallAssemblyId()
        const duplicated = {
          ...original,
          id: newId,
          name: name.trim(),
          nameKey: undefined
        } as InteriorWallAssemblyConfig

        set(state => {
          state.interiorWallAssemblyConfigs[newId] = duplicated
          updateTimestampDraft(state, newId)
        })

        return duplicated
      },

      removeInteriorWallAssembly: (id: InteriorWallAssemblyId) => {
        set(state => {
          if (state.defaultInteriorWallAssemblyId === id) {
            return
          }

          const { [id]: _removed, ...remainingAssemblies } = state.interiorWallAssemblyConfigs
          state.interiorWallAssemblyConfigs = remainingAssemblies
          removeTimestampDraft(state, id)
        })
      },

      updateInteriorWallAssemblyName: (id: InteriorWallAssemblyId, name: string) => {
        set(state => {
          if (!(id in state.interiorWallAssemblyConfigs)) return
          const assembly = state.interiorWallAssemblyConfigs[id]

          validateWallAssemblyName(name)

          assembly.name = name.trim()
          assembly.nameKey = undefined
          updateTimestampDraft(state, id)
        })
      },

      updateInteriorWallAssemblyConfig: (
        id: InteriorWallAssemblyId,
        config: Partial<UnionOmit<InteriorWallConfig, 'type'>>
      ) => {
        set(state => {
          if (!(id in state.interiorWallAssemblyConfigs)) return
          const assembly = state.interiorWallAssemblyConfigs[id]

          Object.assign(assembly, config, { id })
          const { id: _id, name: _name, ...wallConfig } = assembly
          validateInteriorWallConfig(wallConfig as InteriorWallConfig)
          updateTimestampDraft(state, id)
        })
      },

      getInteriorWallAssemblyById: (id: InteriorWallAssemblyId) => {
        const state = get()
        return state.interiorWallAssemblyConfigs[id] ?? null
      },

      getAllInteriorWallAssemblies: () => {
        const state = get()
        return Object.values(state.interiorWallAssemblyConfigs)
      },

      setDefaultInteriorWallAssembly: (assemblyId: InteriorWallAssemblyId | undefined) => {
        set(state => {
          state.defaultInteriorWallAssemblyId = assemblyId ?? DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
        })
      },

      getDefaultInteriorWallAssemblyId: () => {
        const state = get()
        return state.defaultInteriorWallAssemblyId
      },

      resetInteriorWallAssembliesToDefaults: () => {
        set(state => {
          const defaultIds = DEFAULT_INTERIOR_WALL_ASSEMBLIES.map(a => a.id)
          const currentIds = Object.keys(state.interiorWallAssemblyConfigs) as InteriorWallAssemblyId[]

          const customAssemblies = Object.fromEntries(
            Object.entries(state.interiorWallAssemblyConfigs).filter(
              ([id]) => !defaultIds.includes(id as InteriorWallAssemblyId)
            )
          )

          const resetAssemblies = Object.fromEntries(
            DEFAULT_INTERIOR_WALL_ASSEMBLIES.map(assembly => [assembly.id, assembly])
          )

          const newDefaultId = defaultIds.includes(state.defaultInteriorWallAssemblyId)
            ? DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
            : state.defaultInteriorWallAssemblyId

          for (const id of currentIds) {
            if (!defaultIds.includes(id) && id in customAssemblies) {
              continue
            }
            if (defaultIds.includes(id) && !(id in customAssemblies)) {
              removeTimestampDraft(state, id)
            }
          }

          for (const assembly of DEFAULT_INTERIOR_WALL_ASSEMBLIES) {
            if (!currentIds.includes(assembly.id)) {
              updateTimestampDraft(state, assembly.id)
            }
          }

          state.interiorWallAssemblyConfigs = { ...resetAssemblies, ...customAssemblies }
          state.defaultInteriorWallAssemblyId = newDefaultId
        })
      }
    } satisfies InteriorWallAssembliesActions
  }
}
