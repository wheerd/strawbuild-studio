import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ModelState, Wall, Room, ConnectionPoint, Opening, Floor, Point2D, Bounds } from '../types/model'
import type { WallId, ConnectionPointId, FloorId, RoomId, OpeningId } from '../types/ids'
import {
  createEmptyModelState,
  createFloor,
  createWall,
  createRoom,
  createConnectionPoint,
  createOpening,
  addFloorToState,
  addWallToState,
  addRoomToState,
  addConnectionPointToFloor,
  addOpeningToState,
  removeWallFromState,
  calculateStateBounds,
  calculateFloorBounds,
  calculateRoomArea,
  moveConnectionPoint,
  moveWall
} from './operations'

interface ModelActions {
  reset: () => void

  addFloor: (name: string, level: number, height?: number) => Floor
  addWall: (startPointId: ConnectionPointId, endPointId: ConnectionPointId, floorId: FloorId, thickness?: number, height?: number) => Wall
  addRoom: (name: string, floorId: FloorId, wallIds?: WallId[]) => Room
  addConnectionPoint: (position: Point2D, floorId: FloorId) => ConnectionPoint
  addOpening: (wallId: WallId, type: Opening['type'], offsetFromStart: number, width: number, height: number, sillHeight?: number) => Opening
  removeWall: (wallId: WallId) => void
  moveConnectionPoint: (pointId: ConnectionPointId, position: Point2D) => void
  moveWall: (wallId: WallId, deltaX: number, deltaY: number) => void
  getActiveFloorBounds: (floorId: FloorId) => Bounds | null
}

type ModelStore = ModelState & ModelActions

function createInitialState (): ModelState {
  return createEmptyModelState()
}

export const useModelStore = create<ModelStore>()(
  devtools(
    (set, get) => ({
      ...createInitialState(),

      reset: () => {
        const newState = createEmptyModelState()
        set(newState, false, 'reset')
      },

      addFloor: (name: string, level: number, height: number = 3000): Floor => {
        const state = get()
        const floor = createFloor(name, level, height)
        const updatedState = addFloorToState(state, floor)

        set(updatedState, false, 'addFloor')
        return floor
      },

      addWall: (startPointId: ConnectionPointId, endPointId: ConnectionPointId, floorId: FloorId, thickness: number = 200, height: number = 3000): Wall => {
        const state = get()
        
        // Validate floor exists
        if (!state.floors.has(floorId)) {
          throw new Error(`Floor ${floorId} not found`)
        }
        
        const wall = createWall(startPointId, endPointId, floorId, thickness, height)
        let updatedState = addWallToState(state, wall)

        const bounds = calculateStateBounds(updatedState)
        updatedState = { ...updatedState, bounds: bounds ?? undefined }

        set(updatedState, false, 'addWall')
        return wall
      },

      addRoom: (name: string, floorId: FloorId, wallIds: WallId[] = []): Room => {
        const state = get()
        
        // Validate floor exists
        if (!state.floors.has(floorId)) {
          throw new Error(`Floor ${floorId} not found`)
        }
        
        const room = createRoom(name, floorId, wallIds)

        const area = calculateRoomArea(room, state)
        const roomWithArea = { ...room, area }

        const updatedState = addRoomToState(state, roomWithArea)

        set(updatedState, false, 'addRoom')
        return roomWithArea
      },

      addConnectionPoint: (position: Point2D, floorId: FloorId): ConnectionPoint => {
        const state = get()
        
        // Validate floor exists
        if (!state.floors.has(floorId)) {
          throw new Error(`Floor ${floorId} not found`)
        }
        
        const connectionPoint = createConnectionPoint(position, floorId)
        const updatedState = addConnectionPointToFloor(state, connectionPoint, floorId)

        set(updatedState, false, 'addConnectionPoint')
        return connectionPoint
      },

      addOpening: (wallId: WallId, type: Opening['type'], offsetFromStart: number, width: number, height: number, sillHeight?: number): Opening => {
        const state = get()
        
        // Get the floor ID from the wall
        const wall = state.walls.get(wallId)
        if (!wall) {
          throw new Error(`Wall ${wallId} not found`)
        }
        
        const opening = createOpening(wallId, wall.floorId, type, offsetFromStart, width, height, sillHeight)
        const updatedState = addOpeningToState(state, opening)

        set(updatedState, false, 'addOpening')
        return opening
      },

      removeWall: (wallId: WallId) => {
        const state = get()
        let updatedState = removeWallFromState(state, wallId)

        const bounds = calculateStateBounds(updatedState)
        updatedState = { ...updatedState, bounds: bounds ?? undefined }

        set(updatedState, false, 'removeWall')
      },

      moveConnectionPoint: (pointId: ConnectionPointId, position: Point2D) => {
        const state = get()
        const updatedState = moveConnectionPoint(state, pointId, position)
        set(updatedState, false, 'moveConnectionPoint')
      },

      moveWall: (wallId: WallId, deltaX: number, deltaY: number) => {
        const state = get()
        const updatedState = moveWall(state, wallId, deltaX, deltaY)
        set(updatedState, false, 'moveWall')
      },

      getActiveFloorBounds: (floorId: FloorId): Bounds | null => {
        const state = get()
        // Validate floor exists
        if (!state.floors.has(floorId)) {
          return null
        }
        return calculateFloorBounds(floorId, state)
      }
    }),
    {
      name: 'strawbaler-model-store'
    }
  )
)

export const useFloors = (): Map<FloorId, Floor> => useModelStore(state => state.floors)
export const useWalls = (): Map<WallId, Wall> => useModelStore(state => state.walls)
export const useRooms = (): Map<RoomId, Room> => useModelStore(state => state.rooms)
export const useConnectionPoints = (): Map<ConnectionPointId, ConnectionPoint> => useModelStore(state => state.connectionPoints)
export const useOpenings = (): Map<OpeningId, Opening> => useModelStore(state => state.openings)

export const getActiveFloor = (floors: Map<FloorId, Floor>, activeFloorId: FloorId): Floor | null => {
  const floor = floors.get(activeFloorId)
  return floor ?? null
}