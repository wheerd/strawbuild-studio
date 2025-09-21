import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { temporal } from 'zundo'
import type { Perimeter } from '@/types/model'
import type { PerimeterId } from '@/types/ids'
import { createStoreysSlice } from './slices/storeysSlice'
import { createPerimetersSlice } from './slices/perimeterSlice'
import type { Store, StoreActions } from './types'

// Create the main store with slices and undo/redo
export const useModelStore = create<Store>()(
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
export const usePerimeters = (): Map<PerimeterId, Perimeter> => useModelStore(state => state.perimeters)

export const useModelActions = (): StoreActions => useModelStore(state => state.actions)

// Export types
export type { Store, StoreActions, StoreState } from './types'
