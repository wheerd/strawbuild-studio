import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { temporal } from 'zundo'
import type { Floor, OuterWallPolygon } from '@/types/model'
import { createFloorLevel } from '@/types/model'
import type { FloorId, OuterWallId } from '@/types/ids'
import { createFloorsSlice } from './slices/floorsSlice'
import { createOuterWallsSlice } from './slices/outerWallsSlice'
import type { Store } from './types'

// Create the main store with slices and undo/redo
export const useModelStore = create<Store>()(
  temporal(
    devtools(
      (...a) => {
        const store = {
          ...createFloorsSlice(...a),
          ...createOuterWallsSlice(...a)
        }

        // Initialize with a default ground floor
        setTimeout(() => {
          if (store.floors.size === 0) {
            store.addFloor('Ground Floor', createFloorLevel(0))
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
          pastState.floors.size !== currentState.floors.size ||
          pastState.outerWalls.size !== currentState.outerWalls.size

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
export const useFloors = (): Map<FloorId, Floor> => useModelStore(state => state.floors)
export const useOuterWalls = (): Map<OuterWallId, OuterWallPolygon> => useModelStore(state => state.outerWalls)
export const useGetOuterWallById = () => useModelStore(state => state.getOuterWallById)
export const useFloorOuterWalls = (floorId: FloorId): OuterWallPolygon[] =>
  useModelStore(state => state.getOuterWallsByFloor)(floorId)

// Export types
export type { Store, StoreActions, StoreState } from './types'
