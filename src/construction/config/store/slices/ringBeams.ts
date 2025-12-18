import { type StateCreator } from 'zustand'

import type { RingBeamAssemblyId } from '@/building/model/ids'
import { createRingBeamAssemblyId } from '@/building/model/ids'
import type { FullRingBeamAssemblyConfig, RingBeamAssemblyConfig } from '@/construction/config/types'
import { wood } from '@/construction/materials/material'
import { type RingBeamConfig, validateRingBeamConfig } from '@/construction/ringBeams/types'

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
}

export type RingBeamAssembliesSlice = RingBeamAssembliesState & { actions: RingBeamAssembliesActions }

// Validation functions
const validateRingBeamName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Ring beam assembly name cannot be empty')
  }
}

// Config validation is handled by the construction module

// Default ring beam assembly using 360x60 wood
const createDefaultRingBeamAssembly = (): FullRingBeamAssemblyConfig => ({
  id: 'ringbeam_default' as RingBeamAssemblyId,
  name: 'Full 36x6cm',
  type: 'full',
  material: wood.id,
  height: 60,
  width: 360,
  offsetFromEdge: 30
})

export const createRingBeamAssembliesSlice: StateCreator<
  RingBeamAssembliesSlice,
  [['zustand/immer', never]],
  [],
  RingBeamAssembliesSlice
> = (set, get) => {
  // Initialize with default assemblies
  const defaultRingBeamAssembly = createDefaultRingBeamAssembly()

  return {
    ringBeamAssemblyConfigs: {
      [defaultRingBeamAssembly.id]: defaultRingBeamAssembly
    },
    defaultBaseRingBeamAssemblyId: defaultRingBeamAssembly.id,
    defaultTopRingBeamAssemblyId: defaultRingBeamAssembly.id,

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
            name: name.trim()
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
      }
    } satisfies RingBeamAssembliesActions
  }
}
