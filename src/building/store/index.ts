import isDeepEqual from 'fast-deep-equal'
import { useMemo } from 'react'
import { debounce } from 'throttle-debounce'
import { temporal } from 'zundo'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type { FloorAreaId, FloorOpeningId, PerimeterId, RoofId, StoreyId } from '@/building/model/ids'
import type { FloorArea, FloorOpening, Perimeter, Roof, Storey } from '@/building/model/model'

import { CURRENT_VERSION, applyMigrations } from './migrations'
import { getPersistenceActions } from './persistenceStore'
import { createFloorsSlice } from './slices/floorsSlice'
import { createPerimetersSlice } from './slices/perimeterSlice'
import { createRoofsSlice } from './slices/roofsSlice'
import { createStoreysSlice } from './slices/storeysSlice'
import type { Store, StoreActions, StoreState } from './types'

// Custom debounced save with immediate isSaving feedback
let saveTimeout: NodeJS.Timeout | null = null

const createDebouncedSave = () => {
  return (name: string, value: unknown) => {
    const persistenceActions = getPersistenceActions()

    // Set saving immediately
    persistenceActions.setSaving(true)

    // Clear existing timeout
    if (saveTimeout) clearTimeout(saveTimeout)

    // Schedule actual save
    saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(name, JSON.stringify(value))
        persistenceActions.setSaveSuccess(new Date())
      } catch (error) {
        persistenceActions.setSaveError(error instanceof Error ? error.message : 'Save failed')
      }
    }, 1000)
  }
}

// Create the main store with persistence, undo/redo, and slices
const useModelStore = create<Store>()(
  persist(
    temporal(
      (set, get, store) => {
        const storeysSlice = immer(createStoreysSlice)(set, get, store)
        const perimetersSlice = immer(createPerimetersSlice)(set, get, store)
        const floorsSlice = immer(createFloorsSlice)(set, get, store)
        const roofsSlice = immer(createRoofsSlice)(set, get, store)

        return {
          ...storeysSlice,
          ...perimetersSlice,
          ...floorsSlice,
          ...roofsSlice,
          actions: {
            ...storeysSlice.actions,
            ...perimetersSlice.actions,
            ...floorsSlice.actions,
            ...roofsSlice.actions,
            reset: () => {
              set(store.getInitialState())
            }
          }
        }
      },
      {
        // Undo/redo configuration
        limit: 50,
        equality: (pastState, currentState) => isDeepEqual(pastState, currentState),
        handleSet: set => debounce(500, set, { atBegin: false })
      }
    ),
    {
      // Persistence configuration
      name: 'strawbaler-model',
      version: CURRENT_VERSION,
      migrate: (persistedState: unknown) => applyMigrations(persistedState) as StoreState,
      partialize: state => ({
        storeys: state.storeys,
        perimeters: state.perimeters,
        floorAreas: state.floorAreas,
        floorOpenings: state.floorOpenings,
        roofs: state.roofs,
        activeStoreyId: state.activeStoreyId
      }),
      storage: {
        getItem: name => {
          const item = localStorage.getItem(name)
          return item ? JSON.parse(item) : null
        },
        setItem: createDebouncedSave(),
        removeItem: name => localStorage.removeItem(name)
      },
      onRehydrateStorage: () => state => {
        if (state) {
          const persistenceActions = getPersistenceActions()
          persistenceActions.setHydrated(true)
        }
      }
    }
  )
)

// Undo/redo hooks
export const useUndo = (): (() => void) => useModelStore.temporal.getState().undo
export const useRedo = (): (() => void) => useModelStore.temporal.getState().redo
export const useCanUndo = (): boolean => useModelStore.temporal.getState().pastStates.length > 0
export const useCanRedo = (): boolean => useModelStore.temporal.getState().futureStates.length > 0

// Entity selector hooks
export const useActiveStoreyId = (): StoreyId => useModelStore(state => state.activeStoreyId)
export const useStoreyById = (id: StoreyId): Storey | null => {
  const storeys = useModelStore(state => state.storeys)
  const getStoreyById = useModelStore(state => state.actions.getStoreyById)
  return useMemo(() => getStoreyById(id), [storeys, id])
}
export const useStoreysOrderedByLevel = (): Storey[] => {
  const storeys = useModelStore(state => state.storeys)
  const getStoreysOrderedByLevel = useModelStore(state => state.actions.getStoreysOrderedByLevel)
  return useMemo(() => getStoreysOrderedByLevel(), [storeys])
}

export const usePerimeters = (): Perimeter[] => {
  const perimeters = useModelStore(state => state.perimeters)
  return useMemo(() => Object.values(perimeters), [perimeters])
}
export const usePerimeterById = (id: PerimeterId): Perimeter | null => {
  const perimeters = useModelStore(state => state.perimeters)
  const getPerimeterById = useModelStore(state => state.actions.getPerimeterById)
  return useMemo(() => getPerimeterById(id), [perimeters, id])
}
export const usePerimetersOfActiveStorey = (): Perimeter[] => {
  const activeStoreyId = useActiveStoreyId()
  const perimeters = useModelStore(state => state.perimeters)
  const getPerimetersByStorey = useModelStore(state => state.actions.getPerimetersByStorey)
  return useMemo(() => getPerimetersByStorey(activeStoreyId), [perimeters, activeStoreyId])
}

export const useFloorAreas = (): Record<FloorAreaId, FloorArea> => useModelStore(state => state.floorAreas)
export const useFloorOpenings = (): Record<FloorOpeningId, FloorOpening> => useModelStore(state => state.floorOpenings)

export const useFloorAreaById = (id: FloorAreaId): FloorArea | null => {
  const floorAreas = useModelStore(state => state.floorAreas)
  const getFloorAreaById = useModelStore(state => state.actions.getFloorAreaById)
  return useMemo(() => getFloorAreaById(id), [floorAreas, id])
}

export const useFloorOpeningById = (id: FloorOpeningId): FloorOpening | null => {
  const floorOpenings = useModelStore(state => state.floorOpenings)
  const getFloorOpeningById = useModelStore(state => state.actions.getFloorOpeningById)
  return useMemo(() => getFloorOpeningById(id), [floorOpenings, id])
}

export const useFloorAreasOfActiveStorey = (): FloorArea[] => {
  const activeStoreyId = useActiveStoreyId()
  const floorAreas = useModelStore(state => state.floorAreas)
  const getFloorAreasByStorey = useModelStore(state => state.actions.getFloorAreasByStorey)
  return useMemo(() => getFloorAreasByStorey(activeStoreyId), [floorAreas, activeStoreyId])
}

export const useFloorOpeningsOfActiveStorey = (): FloorOpening[] => {
  const activeStoreyId = useActiveStoreyId()
  const floorOpenings = useModelStore(state => state.floorOpenings)
  const getFloorOpeningsByStorey = useModelStore(state => state.actions.getFloorOpeningsByStorey)
  return useMemo(() => getFloorOpeningsByStorey(activeStoreyId), [floorOpenings, activeStoreyId])
}

export const useRoofs = (): Record<RoofId, Roof> => useModelStore(state => state.roofs)

export const useRoofById = (id: RoofId): Roof | null => {
  const roofs = useModelStore(state => state.roofs)
  const getRoofById = useModelStore(state => state.actions.getRoofById)
  return useMemo(() => getRoofById(id), [roofs, id])
}

export const useRoofsOfActiveStorey = (): Roof[] => {
  const activeStoreyId = useActiveStoreyId()
  const roofs = useModelStore(state => state.roofs)
  const getRoofsByStorey = useModelStore(state => state.actions.getRoofsByStorey)
  return useMemo(() => getRoofsByStorey(activeStoreyId), [roofs, activeStoreyId])
}

export const useModelActions = (): StoreActions => useModelStore(state => state.actions)

// Non-reactive actions-only accessor for tools and services
export const getModelActions = (): StoreActions => useModelStore.getState().actions

// Non-reactive undo/redo functions for direct access (not hooks)
export const getUndoFunction = (): (() => void) => useModelStore.temporal.getState().undo
export const getRedoFunction = (): (() => void) => useModelStore.temporal.getState().redo
export const getCanUndo = (): boolean => useModelStore.temporal.getState().pastStates.length > 0
export const getCanRedo = (): boolean => useModelStore.temporal.getState().futureStates.length > 0

// Non-reactive persistence functions for direct access
export const clearPersistence = (): void => {
  localStorage.removeItem('strawbaler-model')
}

// Export types
export type { StoreActions } from './types'
