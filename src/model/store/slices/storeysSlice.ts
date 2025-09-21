import type { StateCreator } from 'zustand'
import type { Storey } from '@/types/model'
import { createStoreyLevel } from '@/types/model'
import type { StoreyId } from '@/types/ids'
import { createStoreyId } from '@/types/ids'
import type { Length } from '@/types/geometry'
import { createLength } from '@/types/geometry'

export interface StoreysState {
  activeStoreyId: StoreyId
  defaultHeight: Length
  storeys: Map<StoreyId, Storey>
}

export interface StoreysActions {
  // Active storey management
  getActiveStorey: () => StoreyId
  setActiveStorey: (storeyId: StoreyId) => void

  // CRUD operations
  addStorey: (name: string, height?: Length) => Storey
  removeStorey: (storeyId: StoreyId) => void

  // Storey modifications
  updateStoreyName: (storeyId: StoreyId, name: string) => void
  updateStoreyHeight: (storeyId: StoreyId, height: Length) => void

  // Level management operations
  swapStoreyLevels: (storeyId1: StoreyId, storeyId2: StoreyId) => void
  adjustAllLevels: (adjustment: number) => void

  // Storey queries
  getStoreyById: (storeyId: StoreyId) => Storey | null
  getStoreysOrderedByLevel: () => Storey[]
}

export type StoreysSlice = StoreysState & { actions: StoreysActions }

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

const groundFloor: Storey = {
  id: 'store_ground' as StoreyId,
  name: 'Ground Floor',
  level: createStoreyLevel(0),
  height: createLength(2400)
}

export const createStoreysSlice: StateCreator<StoreysSlice, [], [], StoreysSlice> = (set, get) => ({
  activeStoreyId: groundFloor.id,
  defaultHeight: createLength(2400),
  storeys: new Map<StoreyId, Storey>([[groundFloor.id, groundFloor]]),

  actions: {
    // Active storey management
    getActiveStorey: () => get().activeStoreyId,

    setActiveStorey: (activeStoreyId: StoreyId) => {
      set(state => ({
        ...state,
        activeStoreyId
      }))
    },
    // CRUD operations
    addStorey: (name: string, height?: Length) => {
      const state = get()

      validateStoreyName(name)

      const level =
        state.storeys.size === 0
          ? createStoreyLevel(0)
          : createStoreyLevel(Math.max(...Array.from(state.storeys.values()).map(s => s.level)) + 1)

      const storeyId = createStoreyId()
      const defaultHeight = height !== undefined ? height : state.defaultHeight

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
        const storey = state.storeys.get(storeyId)
        if (storey == null) return state

        // Prevent removing the last storey
        if (state.storeys.size === 1) {
          throw new Error('Cannot remove the last remaining storey')
        }

        const newStoreys = new Map(state.storeys)
        newStoreys.delete(storeyId)

        for (const [, otherStorey] of newStoreys) {
          if (storey.level >= 0 && otherStorey.level > storey.level) {
            const newLevel = createStoreyLevel(otherStorey.level - 1)
            newStoreys.set(otherStorey.id, { ...otherStorey, level: newLevel })
          } else if (storey.level < 0 && otherStorey.level < storey.level) {
            const newLevel = createStoreyLevel(otherStorey.level + 1)
            newStoreys.set(otherStorey.id, { ...otherStorey, level: newLevel })
          }
        }

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

        let minLevel = Infinity
        let maxLevel = -Infinity
        for (const [storeyId, storey] of state.storeys) {
          const newLevel = createStoreyLevel(storey.level + adjustment)
          newStoreys.set(storeyId, { ...storey, level: newLevel })
          if (newLevel < minLevel) minLevel = newLevel
          if (newLevel > maxLevel) maxLevel = newLevel
        }

        if (minLevel > 0) {
          throw new Error('Adjustment would remove floor 0, which is not allowed')
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
  }
})
