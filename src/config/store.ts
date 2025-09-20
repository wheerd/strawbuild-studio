import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useMemo } from 'react'
import type { RingBeamConstructionMethod } from '@/types/config'
import type { RingBeamConstructionMethodId } from '@/types/ids'
import { createRingBeamConstructionMethodId } from '@/types/ids'
import type { RingBeamConfig } from '@/construction'
import { wood360x60, validateRingBeamConfig } from '@/construction'
import { createLength } from '@/types/geometry'

export interface ConfigState {
  ringBeamConstructionMethods: Map<RingBeamConstructionMethodId, RingBeamConstructionMethod>
  defaultBaseRingBeamMethodId?: RingBeamConstructionMethodId
  defaultTopRingBeamMethodId?: RingBeamConstructionMethodId
}

export interface ConfigActions {
  // CRUD operations for ring beam construction methods
  addRingBeamConstructionMethod: (name: string, config: RingBeamConfig) => RingBeamConstructionMethod
  removeRingBeamConstructionMethod: (id: RingBeamConstructionMethodId) => void
  updateRingBeamConstructionMethodName: (id: RingBeamConstructionMethodId, name: string) => void
  updateRingBeamConstructionMethodConfig: (id: RingBeamConstructionMethodId, config: RingBeamConfig) => void

  // Queries
  getRingBeamConstructionMethodById: (id: RingBeamConstructionMethodId) => RingBeamConstructionMethod | null
  getAllRingBeamConstructionMethods: () => RingBeamConstructionMethod[]

  // Default ring beam management
  setDefaultBaseRingBeamMethod: (methodId: RingBeamConstructionMethodId | undefined) => void
  setDefaultTopRingBeamMethod: (methodId: RingBeamConstructionMethodId | undefined) => void
  getDefaultBaseRingBeamMethodId: () => RingBeamConstructionMethodId | undefined
  getDefaultTopRingBeamMethodId: () => RingBeamConstructionMethodId | undefined
}

export type ConfigStore = ConfigState & ConfigActions

// Validation functions
const validateRingBeamName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Ring beam construction method name cannot be empty')
  }
}

// Config validation is handled by the construction module

// Default ring beam construction method using 360x60 wood
const createDefaultRingBeamMethod = (): RingBeamConstructionMethod => ({
  id: createRingBeamConstructionMethodId(),
  name: 'Standard Ring Beam 36cm',
  config: {
    type: 'full',
    material: wood360x60.id,
    height: createLength(60),
    width: createLength(360),
    offsetFromEdge: createLength(30)
  }
})

export const useConfigStore = create<ConfigStore>()(
  devtools(
    (set, get) => {
      // Initialize with default method
      const defaultMethod = createDefaultRingBeamMethod()

      return {
        ringBeamConstructionMethods: new Map<RingBeamConstructionMethodId, RingBeamConstructionMethod>([
          [defaultMethod.id, defaultMethod]
        ]),
        defaultBaseRingBeamMethodId: defaultMethod.id,
        defaultTopRingBeamMethodId: defaultMethod.id,

        // CRUD operations
        addRingBeamConstructionMethod: (name: string, config: RingBeamConfig) => {
          // Validate inputs
          validateRingBeamName(name)
          validateRingBeamConfig(config)

          const id = createRingBeamConstructionMethodId()
          const method: RingBeamConstructionMethod = {
            id,
            name: name.trim(),
            config
          }

          set(state => ({
            ...state,
            ringBeamConstructionMethods: new Map(state.ringBeamConstructionMethods).set(id, method)
          }))

          return method
        },

        removeRingBeamConstructionMethod: (id: RingBeamConstructionMethodId) => {
          set(state => {
            const newMethods = new Map(state.ringBeamConstructionMethods)
            newMethods.delete(id)
            return {
              ...state,
              ringBeamConstructionMethods: newMethods,
              // Clear defaults if removing the default method
              defaultBaseRingBeamMethodId:
                state.defaultBaseRingBeamMethodId === id ? undefined : state.defaultBaseRingBeamMethodId,
              defaultTopRingBeamMethodId:
                state.defaultTopRingBeamMethodId === id ? undefined : state.defaultTopRingBeamMethodId
            }
          })
        },

        updateRingBeamConstructionMethodName: (id: RingBeamConstructionMethodId, name: string) => {
          set(state => {
            const method = state.ringBeamConstructionMethods.get(id)
            if (method == null) return state

            validateRingBeamName(name)

            const updatedMethod: RingBeamConstructionMethod = {
              ...method,
              name: name.trim()
            }

            return {
              ...state,
              ringBeamConstructionMethods: new Map(state.ringBeamConstructionMethods).set(id, updatedMethod)
            }
          })
        },

        updateRingBeamConstructionMethodConfig: (id: RingBeamConstructionMethodId, config: RingBeamConfig) => {
          set(state => {
            const method = state.ringBeamConstructionMethods.get(id)
            if (method == null) return state

            validateRingBeamConfig(config)

            const updatedMethod: RingBeamConstructionMethod = {
              ...method,
              config
            }

            return {
              ...state,
              ringBeamConstructionMethods: new Map(state.ringBeamConstructionMethods).set(id, updatedMethod)
            }
          })
        },

        // Queries
        getRingBeamConstructionMethodById: (id: RingBeamConstructionMethodId) => {
          const state = get()
          return state.ringBeamConstructionMethods.get(id) ?? null
        },

        getAllRingBeamConstructionMethods: () => {
          const state = get()
          return Array.from(state.ringBeamConstructionMethods.values())
        },

        // Default ring beam management
        setDefaultBaseRingBeamMethod: (methodId: RingBeamConstructionMethodId | undefined) => {
          set(state => ({
            ...state,
            defaultBaseRingBeamMethodId: methodId
          }))
        },

        setDefaultTopRingBeamMethod: (methodId: RingBeamConstructionMethodId | undefined) => {
          set(state => ({
            ...state,
            defaultTopRingBeamMethodId: methodId
          }))
        },

        getDefaultBaseRingBeamMethodId: () => {
          const state = get()
          return state.defaultBaseRingBeamMethodId
        },

        getDefaultTopRingBeamMethodId: () => {
          const state = get()
          return state.defaultTopRingBeamMethodId
        }
      }
    },
    { name: 'config-store' }
  )
)

// Selector hooks for easier usage
export const useRingBeamConstructionMethods = (): RingBeamConstructionMethod[] => {
  const ringBeamMethodsMap = useConfigStore(state => state.ringBeamConstructionMethods)
  return useMemo(() => Array.from(ringBeamMethodsMap.values()), [ringBeamMethodsMap])
}

export const useRingBeamConstructionMethodById = (
  id: RingBeamConstructionMethodId
): RingBeamConstructionMethod | null => useConfigStore(state => state.getRingBeamConstructionMethodById(id))

export const useDefaultBaseRingBeamMethodId = (): RingBeamConstructionMethodId | undefined =>
  useConfigStore(state => state.getDefaultBaseRingBeamMethodId())

export const useDefaultTopRingBeamMethodId = (): RingBeamConstructionMethodId | undefined =>
  useConfigStore(state => state.getDefaultTopRingBeamMethodId())
