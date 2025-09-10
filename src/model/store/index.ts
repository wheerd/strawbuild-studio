import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { temporal } from 'zundo'
import type { Storey, Perimeter } from '@/types/model'
import { createStoreyLevel } from '@/types/model'
import type { StoreyId, PerimeterId } from '@/types/ids'
import { createStoreysSlice } from './slices/storeysSlice'
import { createPerimetersSlice } from './slices/perimeterSlice'
import type { Store } from './types'

// Create the main store with slices and undo/redo
export const useModelStore = create<Store>()(
  temporal(
    devtools(
      (...a) => {
        const store = {
          ...createStoreysSlice(...a),
          ...createPerimetersSlice(...a)
        }

        // Initialize with a default ground floor
        setTimeout(() => {
          if (store.storeys.size === 0) {
            store.addStorey('Ground Floor', createStoreyLevel(0))
          }
        }, 0)

        return store
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
export const useStoreys = (): Map<StoreyId, Storey> => useModelStore(state => state.storeys)
export const usePerimeters = (): Map<PerimeterId, Perimeter> => useModelStore(state => state.perimeters)
export const useGetPerimeterById = () => useModelStore(state => state.getPerimeterById)
export const useStoreyPerimeters = (storeyId: StoreyId): Perimeter[] =>
  useModelStore(state => state.getPerimetersByStorey)(storeyId)

// Export types
export type { Store, StoreActions, StoreState } from './types'
