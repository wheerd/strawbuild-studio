import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ModelState, Wall, Room, Point, Opening, Floor, Point2D, Bounds2D } from '@/types/model'
import type { WallId, PointId, FloorId, RoomId, OpeningId } from '@/types/ids'
import {
  createEmptyModelState,
  createFloor,
  createWall,
  createRoom,
  createPoint,
  createOpening,
  addFloorToState,
  addWallToState,
  addRoomToState,
  addPointToFloor,
  addOpeningToState,
  removeWallFromState,
  calculateStateBounds,
  calculateFloorBounds,
  calculateRoomArea,
  movePoint,
  moveWall
} from '@/model/operations'

interface ModelActions {
  reset: () => void

  addFloor: (name: string, level: number, height?: number) => Floor
  addWall: (startPointId: PointId, endPointId: PointId, floorId: FloorId, thickness?: number, height?: number) => Wall
  addRoom: (name: string, floorId: FloorId, wallIds?: WallId[]) => Room
  addPoint: (position: Point2D, floorId: FloorId) => Point
  addOpening: (wallId: WallId, type: Opening['type'], offsetFromStart: number, width: number, height: number, sillHeight?: number) => Opening
  removeWall: (wallId: WallId) => void
  movePoint: (pointId: PointId, position: Point2D) => void
  moveWall: (wallId: WallId, deltaX: number, deltaY: number) => void
  getActiveFloorBounds: (floorId: FloorId) => Bounds2D | null
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

      addWall: (startPointId: PointId, endPointId: PointId, floorId: FloorId, thickness: number = 200, height: number = 3000): Wall => {
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

      addPoint: (position: Point2D, floorId: FloorId): Point => {
        const state = get()

        // Validate floor exists
        if (!state.floors.has(floorId)) {
          throw new Error(`Floor ${floorId} not found`)
        }

        const point = createPoint(position, floorId)
        const updatedState = addPointToFloor(state, point, floorId)

        set(updatedState, false, 'addPoint')
        return point
      },

      addOpening: (wallId: WallId, type: Opening['type'], offsetFromStart: number, width: number, height: number, sillHeight?: number): Opening => {
        const state = get()

        // Get the floor ID from the wall
        const wall = state.walls.get(wallId)
        if (wall == null) {
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

      movePoint: (pointId: PointId, position: Point2D) => {
        const state = get()
        const updatedState = movePoint(state, pointId, position)
        set(updatedState, false, 'movePoint')
      },

      moveWall: (wallId: WallId, deltaX: number, deltaY: number) => {
        const state = get()
        const updatedState = moveWall(state, wallId, deltaX, deltaY)
        set(updatedState, false, 'moveWall')
      },

      getActiveFloorBounds: (floorId: FloorId): Bounds2D | null => {
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
export const usePoints = (): Map<PointId, Point> => useModelStore(state => state.points)
export const useOpenings = (): Map<OpeningId, Opening> => useModelStore(state => state.openings)

export const getActiveFloor = (floors: Map<FloorId, Floor>, activeFloorId: FloorId): Floor | null => {
  const floor = floors.get(activeFloorId)
  return floor ?? null
}
