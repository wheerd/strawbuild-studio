import type { StateCreator } from 'zustand'
import type { Storey, StoreyLevel } from '@/types/model'
import type { StoreyId } from '@/types/ids'
import { createStoreyId } from '@/types/ids'
import type { Length } from '@/types/geometry'
import { createLength } from '@/types/geometry'

export interface StoreysState {
  storeys: Map<StoreyId, Storey>
}

export interface StoreysActions {
  // CRUD operations
  addStorey: (name: string, level: StoreyLevel, height?: Length) => Storey
  removeStorey: (storeyId: StoreyId) => void

  // Storey modifications
  updateStoreyName: (storeyId: StoreyId, name: string) => void
  updateStoreyLevel: (storeyId: StoreyId, level: StoreyLevel) => void
  updateStoreyHeight: (storeyId: StoreyId, height: Length) => void

  // Storey queries
  getStoreyById: (storeyId: StoreyId) => Storey | null
  getStoreysOrderedByLevel: () => Storey[]
}

export type StoreysSlice = StoreysState & StoreysActions

// Validation functions
const validateStoreyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Storey name cannot be empty')
  }
}

const validateStoreyHeight = (height: Length): void => {
  if (Number(height) <= 0) {
    throw new Error('Storey height must be greater than 0')
  }
}

const validateUniqueStoreyLevel = (
  storeys: Map<StoreyId, Storey>,
  level: StoreyLevel,
  excludeStoreyId?: StoreyId
): void => {
  for (const [storeyId, storey] of storeys) {
    if (storeyId !== excludeStoreyId && storey.level === level) {
      throw new Error(`Storey level ${level} already exists`)
    }
  }
}

export const createStoreysSlice: StateCreator<StoreysSlice, [], [], StoreysSlice> = (set, get) => ({
  storeys: new Map<StoreyId, Storey>(),

  // CRUD operations
  addStorey: (name: string, level: StoreyLevel, height?: Length) => {
    const state = get()

    // Validate inputs
    validateStoreyName(name)
    validateUniqueStoreyLevel(state.storeys, level)

    const storeyId = createStoreyId()
    const defaultHeight = height !== undefined ? height : createLength(3000) // Default 3m height

    // Validate height
    validateStoreyHeight(defaultHeight)

    const storey: Storey = {
      id: storeyId,
      name: name.trim(),
      level,
      height: defaultHeight
    }

    set(state => ({
      ...state,
      storeys: new Map(state.storeys).set(storeyId, storey)
    }))

    return storey
  },

  removeStorey: (storeyId: StoreyId) => {
    set(state => {
      const newStoreys = new Map(state.storeys)
      newStoreys.delete(storeyId)
      return {
        ...state,
        storeys: newStoreys
      }
    })
  },

  // Storey modifications
  updateStoreyName: (storeyId: StoreyId, name: string) => {
    // Validate name
    validateStoreyName(name)

    set(state => {
      const storey = state.storeys.get(storeyId)
      if (storey == null) return state

      const updatedStorey: Storey = {
        ...storey,
        name: name.trim()
      }

      return {
        ...state,
        storeys: new Map(state.storeys).set(storeyId, updatedStorey)
      }
    })
  },

  updateStoreyLevel: (storeyId: StoreyId, level: StoreyLevel) => {
    set(state => {
      const storey = state.storeys.get(storeyId)
      if (storey == null) return state

      // Validate unique level (excluding current storey)
      validateUniqueStoreyLevel(state.storeys, level, storeyId)

      const updatedStorey: Storey = {
        ...storey,
        level
      }

      return {
        ...state,
        storeys: new Map(state.storeys).set(storeyId, updatedStorey)
      }
    })
  },

  updateStoreyHeight: (storeyId: StoreyId, height: Length) => {
    // Validate height
    validateStoreyHeight(height)

    set(state => {
      const storey = state.storeys.get(storeyId)
      if (storey == null) return state

      const updatedStorey: Storey = {
        ...storey,
        height
      }

      return {
        ...state,
        storeys: new Map(state.storeys).set(storeyId, updatedStorey)
      }
    })
  },

  // Storey queries
  getStoreyById: (storeyId: StoreyId) => {
    const state = get()
    return state.storeys.get(storeyId) ?? null
  },

  getStoreysOrderedByLevel: () => {
    const state = get()
    const storeys = Array.from(state.storeys.values())
    return storeys.sort((a, b) => a.level - b.level)
  }
})
