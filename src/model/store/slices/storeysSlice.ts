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

  // Storey modifications
  updateStoreyName: (storeyId: StoreyId, name: string) => void
  updateStoreyLevel: (storeyId: StoreyId, level: StoreyLevel) => void
  updateStoreyHeight: (storeyId: StoreyId, height: Length) => void

  // Level management operations
  swapStoreyLevels: (storeyId1: StoreyId, storeyId2: StoreyId) => void
  adjustAllLevels: (adjustment: number) => void
  duplicateStorey: (sourceStoreyId: StoreyId, newName?: string) => Storey
  moveStoreyUp: (storeyId: StoreyId) => void
  moveStoreyDown: (storeyId: StoreyId) => void

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

  duplicateStorey: (sourceStoreyId: StoreyId, newName?: string) => {
    const state = get()
    const sourceStorey = state.storeys.get(sourceStoreyId)

    if (!sourceStorey) {
      throw new Error('Source storey not found')
    }

    // Find the next available level (max + 1)
    const storeys = Array.from(state.storeys.values())
    const maxLevel = Math.max(...storeys.map(s => s.level))
    const newLevel = createStoreyLevel(maxLevel + 1)

    const duplicateName = newName ?? `${sourceStorey.name} Copy`

    return get().addStorey(duplicateName, newLevel, sourceStorey.height)
  },

  moveStoreyUp: (storeyId: StoreyId) => {
    const storeys = get().getStoreysOrderedByLevel()
    const targetStorey = storeys.find(s => s.id === storeyId)
    const lowestStorey = storeys[0]
    const highestStorey = storeys[storeys.length - 1]

    if (!targetStorey || storeys.length === 1) return

    const isHighest = targetStorey.id === highestStorey.id

    if (isHighest) {
      // Moving highest floor up - check constraint
      if (lowestStorey.level === 0) {
        throw new Error('Cannot move floor up: lowest floor would exceed ground level')
      }
      get().adjustAllLevels(1)
    } else {
      // Find floor above and swap
      const currentIndex = storeys.findIndex(s => s.id === storeyId)
      const floorAbove = storeys[currentIndex + 1]
      get().swapStoreyLevels(storeyId, floorAbove.id)
    }
  },

  moveStoreyDown: (storeyId: StoreyId) => {
    const storeys = get().getStoreysOrderedByLevel()
    const targetStorey = storeys.find(s => s.id === storeyId)
    const lowestStorey = storeys[0]
    const highestStorey = storeys[storeys.length - 1]

    if (!targetStorey || storeys.length === 1) return

    const isLowest = targetStorey.id === lowestStorey.id

    if (isLowest) {
      // Moving lowest floor down - check constraint
      if (highestStorey.level === 0) {
        throw new Error('Cannot move floor down: highest floor would go below ground level')
      }
      get().adjustAllLevels(-1)
    } else {
      // Find floor below and swap
      const currentIndex = storeys.findIndex(s => s.id === storeyId)
      const floorBelow = storeys[currentIndex - 1]
      get().swapStoreyLevels(storeyId, floorBelow.id)
    }
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
