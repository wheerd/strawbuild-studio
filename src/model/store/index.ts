import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { temporal } from 'zundo'
import type { Wall, Room, Point, Floor, Corner, Slab, Roof } from '@/types/model'
import type { WallId, FloorId, RoomId, PointId, SlabId, RoofId } from '@/types/ids'
import { createWallsSlice } from './slices/wallsSlice'
import { createPointsSlice } from './slices/pointsSlice'
import { createRoomsSlice } from './slices/roomsSlice'
import { createFloorsSlice } from './slices/floorsSlice'
import { createCornersSlice } from './slices/cornersSlice'
import type { Store } from './types'

// Create the main store with slices and undo/redo
export const useModelStore = create<Store>()(
  temporal(
    devtools(
      (...a) => {                
        return {
          ...createWallsSlice(...a),
          ...createPointsSlice(...a),
          ...createRoomsSlice(...a),
          ...createFloorsSlice(...a),
          ...createCornersSlice(...a),
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
          pastState.walls.size !== currentState.walls.size ||
          pastState.rooms.size !== currentState.rooms.size ||
          pastState.points.size !== currentState.points.size ||
          pastState.floors.size !== currentState.floors.size
          
        return significantChange
      }
    }
  )
)

// Undo/redo hooks  
export const useUndo = () => useModelStore.temporal.getState().undo
export const useRedo = () => useModelStore.temporal.getState().redo
export const useCanUndo = () => useModelStore.temporal.getState().pastStates.length > 0
export const useCanRedo = () => useModelStore.temporal.getState().futureStates.length > 0

// Entity selector hooks (same as before)
export const useFloors = (): Map<FloorId, Floor> => useModelStore(state => state.floors)
export const useWalls = (): Map<WallId, Wall> => useModelStore(state => state.walls)
export const useRooms = (): Map<RoomId, Room> => useModelStore(state => state.rooms)
export const usePoints = (): Map<PointId, Point> => useModelStore(state => state.points)
export const useCorners = (): Map<PointId, Corner> => useModelStore(state => state.corners)
export const useSlabs = (): Map<SlabId, Slab> => useModelStore(state => state.slabs)
export const useRoofs = (): Map<RoofId, Roof> => useModelStore(state => state.roofs)

// Export types
export type { Store, StoreActions, StoreState } from './types'