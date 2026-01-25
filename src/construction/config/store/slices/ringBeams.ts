import { type StateCreator } from 'zustand'

import type { RingBeamAssemblyId } from '@/building/model/ids'
import { createRingBeamAssemblyId } from '@/building/model/ids'
import type { TimestampsActions } from '@/construction/config/store/slices/timestampsSlice'
import type { RingBeamAssemblyConfig } from '@/construction/config/types'
import { type RingBeamConfig, validateRingBeamConfig } from '@/construction/ringBeams/types'

import {
  DEFAULT_RING_BEAM_ASSEMBLIES,
  DEFAULT_RING_BEAM_BASE_ASSEMBLY_ID,
  DEFAULT_RING_BEAM_TOP_ASSEMBLY_ID
} from './ringBeams.defaults'

export interface RingBeamAssembliesState {
  ringBeamAssemblyConfigs: Record<RingBeamAssemblyId, RingBeamAssemblyConfig>
  defaultBaseRingBeamAssemblyId?: RingBeamAssemblyId
  defaultTopRingBeamAssemblyId?: RingBeamAssemblyId
}

export interface RingBeamAssembliesActions {
  // CRUD operations for ring beam assemblies
  addRingBeamAssembly: (name: string, config: RingBeamConfig) => RingBeamAssemblyConfig
  removeRingBeamAssembly: (id: RingBeamAssemblyId) => void
  updateRingBeamAssemblyName: (id: RingBeamAssemblyId, name: string) => void
  updateRingBeamAssemblyConfig: (id: RingBeamAssemblyId, config: Partial<Omit<RingBeamConfig, 'type'>>) => void

  // Ring beam assembly queries
  getRingBeamAssemblyById: (id: RingBeamAssemblyId) => RingBeamAssemblyConfig | null
  getAllRingBeamAssemblies: () => RingBeamAssemblyConfig[]

  // Default ring beam management
  setDefaultBaseRingBeamAssembly: (assemblyId: RingBeamAssemblyId | undefined) => void
  setDefaultTopRingBeamAssembly: (assemblyId: RingBeamAssemblyId | undefined) => void
  getDefaultBaseRingBeamAssemblyId: () => RingBeamAssemblyId | undefined
  getDefaultTopRingBeamAssemblyId: () => RingBeamAssemblyId | undefined
  resetRingBeamAssembliesToDefaults: () => void
}

export type RingBeamAssembliesSlice = RingBeamAssembliesState & { actions: RingBeamAssembliesActions }

// Validation functions
const validateRingBeamName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Ring beam assembly name cannot be empty')
  }
}

export const createRingBeamAssembliesSlice: StateCreator<
  RingBeamAssembliesSlice & { actions: RingBeamAssembliesActions & TimestampsActions },
  [['zustand/immer', never]],
  [],
  RingBeamAssembliesSlice
> = (set, get) => {
  return {
    ringBeamAssemblyConfigs: Object.fromEntries(DEFAULT_RING_BEAM_ASSEMBLIES.map(assembly => [assembly.id, assembly])),
    defaultBaseRingBeamAssemblyId: DEFAULT_RING_BEAM_BASE_ASSEMBLY_ID,
    defaultTopRingBeamAssemblyId: DEFAULT_RING_BEAM_TOP_ASSEMBLY_ID,

    actions: {
      // CRUD operations
      addRingBeamAssembly: (name: string, config: RingBeamConfig) => {
        validateRingBeamName(name)
        validateRingBeamConfig(config)

        const id = createRingBeamAssemblyId()
        const assembly: RingBeamAssemblyConfig = {
          ...config,
          name,
          id
        }

        set(state => {
          state.ringBeamAssemblyConfigs[id] = assembly
          state.actions.updateTimestamp(id)
        })

        return assembly
      },

      removeRingBeamAssembly: (id: RingBeamAssemblyId) => {
        set(state => {
          const { [id]: _removed, ...remainingAssemblies } = state.ringBeamAssemblyConfigs
          state.ringBeamAssemblyConfigs = remainingAssemblies
          state.actions.removeTimestamp(id)

          state.defaultBaseRingBeamAssemblyId =
            state.defaultBaseRingBeamAssemblyId === id ? undefined : state.defaultBaseRingBeamAssemblyId
          state.defaultTopRingBeamAssemblyId =
            state.defaultTopRingBeamAssemblyId === id ? undefined : state.defaultTopRingBeamAssemblyId
        })
      },

      updateRingBeamAssemblyName: (id: RingBeamAssemblyId, name: string) => {
        set(state => {
          if (!(id in state.ringBeamAssemblyConfigs)) return
          const assembly = state.ringBeamAssemblyConfigs[id]

          validateRingBeamName(name)

          assembly.name = name.trim()
          assembly.nameKey = undefined
          state.actions.updateTimestamp(id)
        })
      },

      updateRingBeamAssemblyConfig: (id: RingBeamAssemblyId, config: Partial<Omit<RingBeamConfig, 'type'>>) => {
        set(state => {
          if (!(id in state.ringBeamAssemblyConfigs)) return
          const assembly = state.ringBeamAssemblyConfigs[id]

          Object.assign(assembly, config, { id })
          validateRingBeamConfig(assembly as RingBeamConfig)
          state.actions.updateTimestamp(id)
        })
      },

      // Queries
      getRingBeamAssemblyById: (id: RingBeamAssemblyId) => {
        const state = get()
        return state.ringBeamAssemblyConfigs[id] ?? null
      },

      getAllRingBeamAssemblies: () => {
        const state = get()
        return Object.values(state.ringBeamAssemblyConfigs)
      },

      // Default ring beam management
      setDefaultBaseRingBeamAssembly: (assemblyId: RingBeamAssemblyId | undefined) => {
        set(state => {
          state.defaultBaseRingBeamAssemblyId = assemblyId
        })
      },

      setDefaultTopRingBeamAssembly: (assemblyId: RingBeamAssemblyId | undefined) => {
        set(state => {
          state.defaultTopRingBeamAssemblyId = assemblyId
        })
      },

      getDefaultBaseRingBeamAssemblyId: () => {
        const state = get()
        return state.defaultBaseRingBeamAssemblyId
      },

      getDefaultTopRingBeamAssemblyId: () => {
        const state = get()
        return state.defaultTopRingBeamAssemblyId
      },

      resetRingBeamAssembliesToDefaults: () => {
        set(state => {
          const defaultIds = DEFAULT_RING_BEAM_ASSEMBLIES.map(a => a.id)
          const currentIds = Object.keys(state.ringBeamAssemblyConfigs) as RingBeamAssemblyId[]

          const customAssemblies = Object.fromEntries(
            Object.entries(state.ringBeamAssemblyConfigs).filter(
              ([id]) => !defaultIds.includes(id as RingBeamAssemblyId)
            )
          )

          const resetAssemblies = Object.fromEntries(
            DEFAULT_RING_BEAM_ASSEMBLIES.map(assembly => [assembly.id, assembly])
          )

          const newDefaultBaseId =
            state.defaultBaseRingBeamAssemblyId && defaultIds.includes(state.defaultBaseRingBeamAssemblyId)
              ? DEFAULT_RING_BEAM_BASE_ASSEMBLY_ID
              : (state.defaultBaseRingBeamAssemblyId ?? DEFAULT_RING_BEAM_BASE_ASSEMBLY_ID)

          const newDefaultTopId =
            state.defaultTopRingBeamAssemblyId && defaultIds.includes(state.defaultTopRingBeamAssemblyId)
              ? DEFAULT_RING_BEAM_TOP_ASSEMBLY_ID
              : (state.defaultTopRingBeamAssemblyId ?? DEFAULT_RING_BEAM_TOP_ASSEMBLY_ID)

          for (const id of currentIds) {
            if (!defaultIds.includes(id) && id in customAssemblies) {
              continue
            }
            if (defaultIds.includes(id) && !(id in customAssemblies)) {
              state.actions.removeTimestamp(id)
            }
          }

          for (const assembly of DEFAULT_RING_BEAM_ASSEMBLIES) {
            if (!currentIds.includes(assembly.id)) {
              state.actions.updateTimestamp(assembly.id)
            }
          }

          state.ringBeamAssemblyConfigs = { ...resetAssemblies, ...customAssemblies }
          state.defaultBaseRingBeamAssemblyId = newDefaultBaseId
          state.defaultTopRingBeamAssemblyId = newDefaultTopId
        })
      }
    } satisfies RingBeamAssembliesActions
  }
}
