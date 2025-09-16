import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { RingBeamConstructionMethod } from '@/types/config'
import type { RingBeamConstructionMethodId } from '@/types/ids'
import { createRingBeamConstructionMethodId } from '@/types/ids'
import type { MaterialId } from '@/construction'
import type { Length } from '@/types/geometry'

export interface ConfigState {
  ringBeamConstructionMethods: Map<RingBeamConstructionMethodId, RingBeamConstructionMethod>
}

export interface ConfigActions {
  // CRUD operations for ring beam construction methods
  addRingBeamConstructionMethod: (
    name: string,
    material: MaterialId,
    height: Length,
    width?: Length,
    offsetFromEdge?: Length
  ) => RingBeamConstructionMethod
  removeRingBeamConstructionMethod: (id: RingBeamConstructionMethodId) => void
  updateRingBeamConstructionMethod: (
    id: RingBeamConstructionMethodId,
    updates: Partial<Omit<RingBeamConstructionMethod, 'id'>>
  ) => void

  // Queries
  getRingBeamConstructionMethodById: (id: RingBeamConstructionMethodId) => RingBeamConstructionMethod | null
  getAllRingBeamConstructionMethods: () => RingBeamConstructionMethod[]
  getRingBeamConstructionMethodsByMaterial: (material: MaterialId) => RingBeamConstructionMethod[]
}

export type ConfigStore = ConfigState & ConfigActions

// Validation functions
const validateRingBeamName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Ring beam construction method name cannot be empty')
  }
}

const validateHeight = (height: Length): void => {
  if (Number(height) <= 0) {
    throw new Error('Height must be greater than 0')
  }
}

const validateWidth = (width?: Length): void => {
  if (width !== undefined && Number(width) <= 0) {
    throw new Error('Width must be greater than 0')
  }
}

// No validation needed for offsetFromEdge - can be negative, positive, or zero

// No validation needed for name uniqueness - duplicate names are allowed

export const useConfigStore = create<ConfigStore>()(
  devtools(
    (set, get) => ({
      ringBeamConstructionMethods: new Map<RingBeamConstructionMethodId, RingBeamConstructionMethod>(),

      // CRUD operations
      addRingBeamConstructionMethod: (
        name: string,
        material: MaterialId,
        height: Length,
        width?: Length,
        offsetFromEdge?: Length
      ) => {
        // Validate inputs
        validateRingBeamName(name)
        validateHeight(height)
        validateWidth(width)

        const id = createRingBeamConstructionMethodId()
        const method: RingBeamConstructionMethod = {
          id,
          name: name.trim(),
          material,
          height,
          width,
          offsetFromEdge
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
            ringBeamConstructionMethods: newMethods
          }
        })
      },

      updateRingBeamConstructionMethod: (
        id: RingBeamConstructionMethodId,
        updates: Partial<Omit<RingBeamConstructionMethod, 'id'>>
      ) => {
        set(state => {
          const method = state.ringBeamConstructionMethods.get(id)
          if (method == null) return state

          // Validate updates
          if (updates.name !== undefined) {
            validateRingBeamName(updates.name)
          }
          if (updates.height !== undefined) {
            validateHeight(updates.height)
          }
          if (updates.width !== undefined) {
            validateWidth(updates.width)
          }
          // offsetFromEdge can be any value (positive, negative, or zero)

          const updatedMethod: RingBeamConstructionMethod = {
            ...method,
            ...updates,
            name: updates.name?.trim() ?? method.name
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

      getRingBeamConstructionMethodsByMaterial: (material: MaterialId) => {
        const state = get()
        return Array.from(state.ringBeamConstructionMethods.values()).filter(method => method.material === material)
      }
    }),
    { name: 'config-store' }
  )
)

// Selector hooks for easier usage
export const useRingBeamConstructionMethods = (): RingBeamConstructionMethod[] =>
  useConfigStore(state => state.getAllRingBeamConstructionMethods())

export const useRingBeamConstructionMethodById = (
  id: RingBeamConstructionMethodId
): RingBeamConstructionMethod | null => useConfigStore(state => state.getRingBeamConstructionMethodById(id))

export const useRingBeamConstructionMethodsByMaterial = (material: MaterialId): RingBeamConstructionMethod[] =>
  useConfigStore(state => state.getRingBeamConstructionMethodsByMaterial(material))
