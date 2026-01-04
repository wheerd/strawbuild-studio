import { type StateCreator } from 'zustand'

import type { RingBeamAssemblyId } from '@/building/model/ids'
import { createRingBeamAssemblyId } from '@/building/model/ids'
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
  RingBeamAssembliesSlice,
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

        set(state => ({
          ...state,
          ringBeamAssemblyConfigs: { ...state.ringBeamAssemblyConfigs, [id]: assembly }
        }))

        return assembly
      },

      removeRingBeamAssembly: (id: RingBeamAssemblyId) => {
        set(state => {
          const { [id]: _removed, ...remainingAssemblies } = state.ringBeamAssemblyConfigs
          return {
            ...state,
            ringBeamAssemblyConfigs: remainingAssemblies,
            // Clear defaults if removing the default assembly
            defaultBaseRingBeamAssemblyId:
              state.defaultBaseRingBeamAssemblyId === id ? undefined : state.defaultBaseRingBeamAssemblyId,
            defaultTopRingBeamAssemblyId:
              state.defaultTopRingBeamAssemblyId === id ? undefined : state.defaultTopRingBeamAssemblyId
          }
        })
      },

      updateRingBeamAssemblyName: (id: RingBeamAssemblyId, name: string) => {
        set(state => {
          const assembly = state.ringBeamAssemblyConfigs[id]
          if (assembly == null) return state

          validateRingBeamName(name)

          const updatedAssembly: RingBeamAssemblyConfig = {
            ...assembly,
            name: name.trim(),
            // Clear nameKey when user edits the name (indicates custom name)
            nameKey: undefined
          }

          return {
            ...state,
            ringBeamAssemblyConfigs: { ...state.ringBeamAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      updateRingBeamAssemblyConfig: (id: RingBeamAssemblyId, config: Partial<Omit<RingBeamConfig, 'type'>>) => {
        set(state => {
          const assembly = state.ringBeamAssemblyConfigs[id]
          if (assembly == null) return state

          const updatedAssembly: RingBeamAssemblyConfig = { ...assembly, ...config, id }
          validateRingBeamConfig(updatedAssembly)

          return {
            ...state,
            ringBeamAssemblyConfigs: { ...state.ringBeamAssemblyConfigs, [id]: updatedAssembly }
          }
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
        set(state => ({
          ...state,
          defaultBaseRingBeamAssemblyId: assemblyId
        }))
      },

      setDefaultTopRingBeamAssembly: (assemblyId: RingBeamAssemblyId | undefined) => {
        set(state => ({
          ...state,
          defaultTopRingBeamAssemblyId: assemblyId
        }))
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
          // Get default assembly IDs
          const defaultIds = DEFAULT_RING_BEAM_ASSEMBLIES.map(a => a.id)

          // Keep only custom assemblies (non-default)
          const customAssemblies = Object.fromEntries(
            Object.entries(state.ringBeamAssemblyConfigs).filter(
              ([id]) => !defaultIds.includes(id as RingBeamAssemblyId)
            )
          )

          // Add fresh default assemblies
          const resetAssemblies = Object.fromEntries(
            DEFAULT_RING_BEAM_ASSEMBLIES.map(assembly => [assembly.id, assembly])
          )

          // Preserve user's default assembly choices if they're custom assemblies, otherwise reset to defaults
          const newDefaultBaseId =
            state.defaultBaseRingBeamAssemblyId && defaultIds.includes(state.defaultBaseRingBeamAssemblyId)
              ? DEFAULT_RING_BEAM_BASE_ASSEMBLY_ID
              : state.defaultBaseRingBeamAssemblyId

          const newDefaultTopId =
            state.defaultTopRingBeamAssemblyId && defaultIds.includes(state.defaultTopRingBeamAssemblyId)
              ? DEFAULT_RING_BEAM_TOP_ASSEMBLY_ID
              : state.defaultTopRingBeamAssemblyId

          return {
            ...state,
            ringBeamAssemblyConfigs: { ...resetAssemblies, ...customAssemblies },
            defaultBaseRingBeamAssemblyId: newDefaultBaseId,
            defaultTopRingBeamAssemblyId: newDefaultTopId
          }
        })
      }
    } satisfies RingBeamAssembliesActions
  }
}
