import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { temporal } from 'zundo'
import type { Perimeter, Storey } from '@/types/model'
import type { PerimeterId, StoreyId } from '@/types/ids'
import { createStoreysSlice } from './slices/storeysSlice'
import { createPerimetersSlice } from './slices/perimeterSlice'
import type { Store, StoreActions } from './types'
import { useMemo } from 'react'

// Create the main store with slices and undo/redo
const useModelStore = create<Store>()(
  temporal(
    devtools(
      (...a) => {
        const storeysSlice = createStoreysSlice(...a)
        const perimetersSlice = createPerimetersSlice(...a)

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
              const initialStoreys = new Map()
              const initialPerimeters = new Map()
              a[0]({
                storeys: initialStoreys,
                perimeters: initialPerimeters
              })
            }
          }
        }
      },
      { name: 'model-store' }
    ),
    {
      // Undo/redo configuration
      limit: 50,
      equality: (past, current) => past === current,
      onSave: (pastState: Store, currentState: Store) => {
        // Only save significant changes to history
        // Don't save if only timestamps changed
        const significantChange =
          pastState.storeys.size !== currentState.storeys.size ||
          pastState.perimeters.size !== currentState.perimeters.size

        return significantChange
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
export const usePerimeters = (): Map<PerimeterId, Perimeter> => useModelStore(state => state.perimeters)
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
