import type { StateCreator } from 'zustand'
import type { Storey, StoreyLevel } from '@/types/model'
import { createStoreyLevel } from '@/types/model'
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
  compactStoreyLevels: () => void

  // Storey modifications
  updateStoreyName: (storeyId: StoreyId, name: string) => void
  updateStoreyLevel: (storeyId: StoreyId, level: StoreyLevel) => void
  updateStoreyHeight: (storeyId: StoreyId, height: Length) => void

  // Level management operations
  swapStoreyLevels: (storeyId1: StoreyId, storeyId2: StoreyId) => void
  adjustAllLevels: (adjustment: number) => void

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

  compactStoreyLevels: () => {
    set(state => {
      const storeys = Array.from(state.storeys.values())
      if (storeys.length === 0) return state

      // Separate storeys by their relation to ground level (0)
      let belowGround = storeys.filter(s => s.level < 0).sort((a, b) => b.level - a.level) // Sort descending: -1, -2, -3...
      let groundLevel = storeys.filter(s => s.level === 0)
      let aboveGround = storeys.filter(s => s.level > 0).sort((a, b) => a.level - b.level) // Sort ascending: 1, 2, 3...

      // If no ground level exists, create one by promoting the closest level
      if (groundLevel.length === 0) {
        if (aboveGround.length > 0) {
          // Prefer above-ground: move lowest positive level to ground (0)
          const newGroundStorey = aboveGround[0]
          groundLevel = [newGroundStorey]
          aboveGround = aboveGround.slice(1) // Remove the promoted storey from above-ground
        } else if (belowGround.length > 0) {
          // Use below-ground: move highest negative level to ground (0)
          const newGroundStorey = belowGround[0] // First item is highest due to descending sort
          groundLevel = [newGroundStorey]
          belowGround = belowGround.slice(1) // Remove the promoted storey from below-ground
        }
      }

      const newStoreys = new Map()

      // Compact below-ground levels towards 0: -1, -2, -3, etc.
      belowGround.forEach((storey, index) => {
        const newLevel = createStoreyLevel(-(index + 1))
        newStoreys.set(storey.id, { ...storey, level: newLevel })
      })

      // Set ground level (0) - either existing or newly promoted
      groundLevel.forEach(storey => {
        newStoreys.set(storey.id, { ...storey, level: createStoreyLevel(0) })
      })

      // Compact above-ground levels towards 0: 1, 2, 3, etc.
      aboveGround.forEach((storey, index) => {
        const newLevel = createStoreyLevel(index + 1)
        newStoreys.set(storey.id, { ...storey, level: newLevel })
      })

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

  // Level management operations
  swapStoreyLevels: (storeyId1: StoreyId, storeyId2: StoreyId) => {
    set(state => {
      const storey1 = state.storeys.get(storeyId1)
      const storey2 = state.storeys.get(storeyId2)

      if (!storey1 || !storey2) return state

      const newStoreys = new Map(state.storeys)
      newStoreys.set(storeyId1, { ...storey1, level: storey2.level })
      newStoreys.set(storeyId2, { ...storey2, level: storey1.level })

      return {
        ...state,
        storeys: newStoreys
      }
    })
  },

  adjustAllLevels: (adjustment: number) => {
    set(state => {
      const newStoreys = new Map()

      for (const [storeyId, storey] of state.storeys) {
        const newLevel = createStoreyLevel(storey.level + adjustment)
        newStoreys.set(storeyId, { ...storey, level: newLevel })
      }

      return {
        ...state,
        storeys: newStoreys
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
