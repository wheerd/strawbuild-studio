import isDeepEqual from 'fast-deep-equal'
import { useMemo } from 'react'
import { debounce } from 'throttle-debounce'
import { temporal } from 'zundo'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type { PerimeterId, StoreyId } from '@/building/model/ids'
import type { Perimeter, Storey } from '@/building/model/model'

import { getPersistenceActions } from './persistenceStore'
import { createPerimetersSlice } from './slices/perimeterSlice'
import { createStoreysSlice } from './slices/storeysSlice'
import type { Store, StoreActions } from './types'

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

        const initialStoreys = storeysSlice.storeys
        const initialPerimeters = perimetersSlice.perimeters

        return {
          ...storeysSlice,
          ...perimetersSlice,
          actions: {
            ...storeysSlice.actions,
            ...perimetersSlice.actions,
            reset: () => {
              set({
                storeys: initialStoreys,
                perimeters: initialPerimeters
              })
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
      partialize: state => ({
        storeys: state.storeys,
        perimeters: state.perimeters,
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
export const usePerimeters = (): Record<PerimeterId, Perimeter> => useModelStore(state => state.perimeters)
export const useStoreysOrderedByLevel = (): Storey[] => {
  const storeys = useModelStore(state => state.storeys)
  const getStoreysOrderedByLevel = useModelStore(state => state.actions.getStoreysOrderedByLevel)
  return useMemo(() => getStoreysOrderedByLevel(), [storeys])
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
