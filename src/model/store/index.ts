import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { temporal } from 'zundo'
import type { Wall, Room, Point, Floor, Corner } from '@/types/model'
import type { WallId, FloorId, RoomId, PointId } from '@/types/ids'
import { createWallsSlice } from './slices/wallsSlice'
import { createPointsSlice } from './slices/pointsSlice'
import { createRoomsSlice } from './slices/roomsSlice'
import { createFloorsSlice } from './slices/floorsSlice'
import { createCornersSlice } from './slices/cornersSlice'
import { createWallsPointsSlice } from './slices/wallsPointsSlice'
import type { Store } from './types'
import type { Length } from '@/types/geometry'

// Create the main store with slices and undo/redo
export const useModelStore = create<Store>()(
  temporal(
    devtools(
      (...a) => {
        const store = {
          ...createWallsSlice(...a),
          ...createPointsSlice(...a),
          ...createRoomsSlice(...a),
          ...createFloorsSlice(...a),
          ...createCornersSlice(...a),
          ...createWallsPointsSlice(...a)
        }

        // Initialize with a default ground floor
        setTimeout(() => {
          if (store.floors.size === 0) {
            const { createFloorLevel } = require('@/types/model') // eslint-disable-line @typescript-eslint/no-var-requires
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
export const useUndo = (): (() => void) => useModelStore.temporal.getState().undo
export const useRedo = (): (() => void) => useModelStore.temporal.getState().redo
export const useCanUndo = (): boolean => useModelStore.temporal.getState().pastStates.length > 0
export const useCanRedo = (): boolean => useModelStore.temporal.getState().futureStates.length > 0

// Entity selector hooks (same as before)
export const useFloors = (): Map<FloorId, Floor> => useModelStore(state => state.floors)
export const useWalls = (): Map<WallId, Wall> => useModelStore(state => state.walls)
export const useFloorWalls = (floorId: FloorId): Wall[] => useModelStore(state => state.getWallsByFloor)(floorId)
export const useWallLength = (): ((wallid: WallId) => Length) => useModelStore(state => state.getWallLength)
export const useRooms = (): Map<RoomId, Room> => useModelStore(state => state.rooms)
export const useFloorRooms = (): ((floorId: FloorId) => Room[]) => useModelStore(state => state.getRoomsByFloor)
export const usePoints = (): Map<PointId, Point> => useModelStore(state => state.points)
export const useFloorPoints = (floorId: FloorId): Point[] => useModelStore(state => state.getPointsByFloor)(floorId)
export const usePoint = (pointId: PointId): Point | null => useModelStore(state => state.getPointById)(pointId)
export const useCorners = (): Map<PointId, Corner> => useModelStore(state => state.corners)
export const useFloorCorners = (floorId: FloorId): Corner[] => useModelStore(state => state.getCornersByFloor)(floorId)

// Export types
export type { Store, StoreActions, StoreState } from './types'
