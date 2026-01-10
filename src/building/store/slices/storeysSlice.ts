import type { StateCreator } from 'zustand'

import type { Storey } from '@/building/model'
import { createStoreyLevel } from '@/building/model'
import type { FloorAssemblyId, StoreyId } from '@/building/model/ids'
import { DEFAULT_FLOOR_ASSEMBLY_ID, createStoreyId } from '@/building/model/ids'
import type { Length } from '@/shared/geometry'

export interface StoreysState {
  readonly activeStoreyId: StoreyId
  readonly defaultFloorHeight: Length
  readonly storeys: Readonly<Record<StoreyId, Storey>>
}

export interface StoreysActions {
  // Active storey management
  getActiveStoreyId: () => StoreyId
  getActiveStorey: () => Storey
  setActiveStoreyId: (storeyId: StoreyId) => void

  // CRUD operations
  addStorey: (floorHeight?: Length, floorAssemblyId?: FloorAssemblyId) => Storey
  removeStorey: (storeyId: StoreyId) => void

  // Storey modifications
  updateStoreyName: (storeyId: StoreyId, name: string | null) => void
  updateStoreyFloorHeight: (storeyId: StoreyId, floorHeight: Length) => void
  updateStoreyFloorAssembly: (storeyId: StoreyId, floorAssemblyId: FloorAssemblyId) => void

  // Level management operations
  swapStoreyLevels: (storeyId1: StoreyId, storeyId2: StoreyId) => void
  adjustAllLevels: (adjustment: number) => void

  // Storey queries
  getStoreyById: (storeyId: StoreyId) => Storey | null
  getStoreyAbove: (storeyId: StoreyId) => Storey | null
  getStoreysOrderedByLevel: () => Storey[]
}

export type StoreysSlice = StoreysState & { actions: StoreysActions }

// Validation functions
const validateStoreyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Storey name cannot be empty')
  }
}

const validateStoreyFloorHeight = (height: Length): void => {
  if (Number(height) <= 0) {
    throw new Error('Floor height must be greater than 0')
  }
}

const groundFloor: Storey = {
  id: 'storey_ground' as StoreyId,
  name: 'Ground Floor',
  useDefaultName: true,
  level: createStoreyLevel(0),
  floorHeight: 3000,
  floorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID
}

export const createStoreysSlice: StateCreator<StoreysSlice, [['zustand/immer', never]], [], StoreysSlice> = (
  set,
  get
) => ({
  activeStoreyId: groundFloor.id,
  defaultFloorHeight: 3000,
  storeys: { [groundFloor.id]: groundFloor } as Record<StoreyId, Storey>,

  actions: {
    // Active storey management
    getActiveStoreyId: () => get().activeStoreyId,

    getActiveStorey: () => {
      const state = get()
      return state.storeys[state.activeStoreyId]
    },

    setActiveStoreyId: (activeStoreyId: StoreyId) =>
      set(state => {
        state.activeStoreyId = activeStoreyId
      }),

    // CRUD operations
    addStorey: (floorHeight?: Length, floorAssemblyId?: FloorAssemblyId) => {
      if (floorHeight !== undefined) validateStoreyFloorHeight(floorHeight)

      let storey: Storey | undefined
      set(state => {
        const storeysArray = Object.values(state.storeys)
        const level = createStoreyLevel(storeysArray.length === 0 ? 0 : Math.max(...storeysArray.map(s => s.level)) + 1)

        storey = {
          id: createStoreyId(),
          name: 'default',
          useDefaultName: true,
          level,
          floorHeight: floorHeight ?? state.defaultFloorHeight,
          floorAssemblyId: floorAssemblyId ?? DEFAULT_FLOOR_ASSEMBLY_ID
        }
        state.storeys[storey.id] = storey
      })

      if (!storey) {
        throw new Error('Failed to create storey')
      }
      return storey
    },

    removeStorey: (storeyId: StoreyId) =>
      set(state => {
        const { storeys } = state
        if (storeyId in storeys) {
          const deletedLevel = storeys[storeyId].level

          // Prevent removing the last storey
          if (Object.keys(storeys).length === 1) {
            throw new Error('Cannot remove the last remaining storey')
          }

          const { [storeyId]: _removed, ...updatedStoreys } = storeys
          state.storeys = updatedStoreys

          const remainingStoreysList = Object.values(updatedStoreys)
          if (state.activeStoreyId === storeyId) {
            state.activeStoreyId = remainingStoreysList[0].id
          }

          // Adjust levels of other storeys
          for (const otherStorey of remainingStoreysList) {
            if (deletedLevel >= 0 && otherStorey.level > deletedLevel) {
              otherStorey.level = createStoreyLevel(otherStorey.level - 1)
            } else if (deletedLevel < 0 && otherStorey.level < deletedLevel) {
              otherStorey.level = createStoreyLevel(otherStorey.level + 1)
            }
          }
        }
      }),

    // Storey modifications
    updateStoreyName: (storeyId: StoreyId, name: string | null) =>
      set(({ storeys }) => {
        if (name != null) {
          validateStoreyName(name)
          if (storeyId in storeys) {
            storeys[storeyId].name = name.trim()
            storeys[storeyId].useDefaultName = false
          }
        } else {
          if (storeyId in storeys) {
            storeys[storeyId].name = 'default'
            storeys[storeyId].useDefaultName = true
          }
        }
      }),

    updateStoreyFloorHeight: (storeyId: StoreyId, floorHeight: Length) =>
      set(({ storeys }) => {
        validateStoreyFloorHeight(floorHeight)
        if (storeyId in storeys) {
          storeys[storeyId].floorHeight = floorHeight
        }
      }),

    updateStoreyFloorAssembly: (storeyId: StoreyId, floorAssemblyId: FloorAssemblyId) =>
      set(({ storeys }) => {
        if (storeyId in storeys) {
          storeys[storeyId].floorAssemblyId = floorAssemblyId
        }
      }),

    // Level management operations
    swapStoreyLevels: (storeyId1: StoreyId, storeyId2: StoreyId) =>
      set(state => {
        const storey1 = state.storeys[storeyId1]
        const storey2 = state.storeys[storeyId2]

        if (storey1 && storey2) {
          ;[storey1.level, storey2.level] = [storey2.level, storey1.level]
        }
      }),

    adjustAllLevels: (adjustment: number) =>
      set(state => {
        let minLevel = Infinity
        let maxLevel = -Infinity
        for (const storey of Object.values(state.storeys)) {
          storey.level = createStoreyLevel(storey.level + adjustment)
          if (storey.level < minLevel) minLevel = storey.level
          if (storey.level > maxLevel) maxLevel = storey.level
        }

        if (minLevel > 0 || maxLevel < 0) {
          throw new Error('Adjustment would remove floor 0, which is not allowed')
        }
      }),

    // Storey queries
    getStoreyById: (storeyId: StoreyId) => get().storeys[storeyId] ?? null,
    getStoreyAbove: (storeyId: StoreyId) => {
      const storeys = Object.values(get().storeys).sort((a, b) => a.level - b.level)
      const index = storeys.findIndex(storey => storey.id === storeyId)
      return index >= 0 && index < storeys.length - 1 ? storeys[index + 1] : null
    },
    getStoreysOrderedByLevel: () => Object.values(get().storeys).sort((a, b) => a.level - b.level)
  }
})
