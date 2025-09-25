import { useMemo } from 'react'
import { temporal } from 'zundo'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { PerimeterId, StoreyId } from '@/building/model/ids'
import type { Perimeter, Storey } from '@/building/model/model'

import { createPerimetersSlice } from './slices/perimeterSlice'
import { createStoreysSlice } from './slices/storeysSlice'
import type { Store, StoreActions } from './types'

// Create the main store with slices and undo/redo
const useModelStore = create<Store>()(
  temporal(
    (set, get, store) => {
      const storeysSlice = immer(createStoreysSlice)(set, get, store)
      const perimetersSlice = immer(createPerimetersSlice)(set, get, store)

      const initialStoreys = storeysSlice.storeys
      const initialPerimeters = perimetersSlice.perimeters

      return {
        // Combine state properties
        ...storeysSlice,
        ...perimetersSlice,
        // Merge actions properly
        actions: {
          ...storeysSlice.actions,
          ...perimetersSlice.actions,
          reset: () => {
            // Reset both slices to their initial state
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
      limit: 50
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

// Export types
export type { StoreActions } from './types'
