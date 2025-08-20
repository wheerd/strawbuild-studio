import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ModelState, Wall, Room, Point, Opening, Floor, Slab, Roof, FloorLevel } from '@/types/model'
import type { WallId, PointId, FloorId, RoomId, SlabId, RoofId } from '@/types/ids'
import type { Point2D, Bounds2D, Length } from '@/types/geometry'
import {
  createEmptyModelState,
  createFloor,
  createWall,
  createRoom,
  createPoint,

  createSlab,
  createRoof,
  addFloorToState,
  addWallToFloor,
  addRoomToFloor,
  addPointToFloor,
  addSlabToFloor,
  addRoofToFloor,
  removeWallFromFloor,
  calculateStateBounds,
  calculateFloorBounds,
  calculateRoomArea,
  movePoint,
  addOpeningToWall
} from '@/model/operations'
import { createLength } from '@/types/geometry'

interface ModelActions {
  reset: () => void

  addFloor: (name: string, level: FloorLevel, height?: Length) => Floor
  addWall: (startPointId: PointId, endPointId: PointId, floorId: FloorId, heightAtStart?: Length, heightAtEnd?: Length, thickness?: Length) => Wall
  addRoom: (name: string, floorId: FloorId, wallIds?: WallId[]) => Room
  addPoint: (position: Point2D, floorId: FloorId) => Point
  addSlab: (polygon: Point2D[], thickness: Length, floorId: FloorId) => Slab
  addRoof: (polygon: Point2D[], thickness: Length, overhang: Length, floorId: FloorId) => Roof
  addOpeningToWall: (wallId: WallId, opening: Opening) => void
  removeWall: (wallId: WallId, floorId: FloorId) => void
  movePoint: (pointId: PointId, position: Point2D) => void
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

      addFloor: (name: string, level: FloorLevel, height: Length = createLength(3000)): Floor => {
        const state = get()
        const floor = createFloor(name, level, height)
        const updatedState = addFloorToState(state, floor)

        set(updatedState, false, 'addFloor')
        return floor
      },

      addWall: (
        startPointId: PointId,
        endPointId: PointId,
        floorId: FloorId,
        heightAtStart: Length = createLength(3000),
        heightAtEnd: Length = createLength(3000),
        thickness: Length = createLength(200)
      ): Wall => {
        const state = get()

        // Validate floor exists
        if (!state.floors.has(floorId)) {
          throw new Error(`Floor ${floorId} not found`)
        }

        const wall = createWall(startPointId, endPointId, heightAtStart, heightAtEnd, thickness)
        let updatedState = addWallToFloor(state, wall, floorId)

        const bounds = calculateStateBounds(updatedState)
        if (bounds != null) {
          updatedState = { ...updatedState, bounds }
        }

        set(updatedState, false, 'addWall')
        return wall
      },

      addRoom: (name: string, floorId: FloorId, wallIds: WallId[] = []): Room => {
        const state = get()

        // Validate floor exists
        if (!state.floors.has(floorId)) {
          throw new Error(`Floor ${floorId} not found`)
        }

        const room = createRoom(name, wallIds)
        const roomWithArea = {
          ...room,
          area: calculateRoomArea(room, state)
        }

        const updatedState = addRoomToFloor(state, roomWithArea, floorId)

        set(updatedState, false, 'addRoom')
        return roomWithArea
      },

      addPoint: (position: Point2D, floorId: FloorId): Point => {
        const state = get()

        // Validate floor exists
        if (!state.floors.has(floorId)) {
          throw new Error(`Floor ${floorId} not found`)
        }

        const point = createPoint(position)
        const updatedState = addPointToFloor(state, point, floorId)

        set(updatedState, false, 'addPoint')
        return point
      },

      addSlab: (polygon: Point2D[], thickness: Length, floorId: FloorId): Slab => {
        const state = get()

        // Validate floor exists
        if (!state.floors.has(floorId)) {
          throw new Error(`Floor ${floorId} not found`)
        }

        const slab = createSlab({ points: polygon }, thickness)
        const updatedState = addSlabToFloor(state, slab, floorId)

        set(updatedState, false, 'addSlab')
        return slab
      },

      addRoof: (polygon: Point2D[], thickness: Length, overhang: Length, floorId: FloorId): Roof => {
        const state = get()

        // Validate floor exists
        if (!state.floors.has(floorId)) {
          throw new Error(`Floor ${floorId} not found`)
        }

        const roof = createRoof(
          { points: polygon },
          thickness,
          overhang,
          'flat',
          createLength(0),
          createLength(0)
        )
        const updatedState = addRoofToFloor(state, roof, floorId)

        set(updatedState, false, 'addRoof')
        return roof
      },

      addOpeningToWall: (wallId: WallId, opening: Opening): void => {
        const state = get()

        const wall = state.walls.get(wallId)
        if (wall == null) {
          throw new Error(`Wall ${wallId} not found`)
        }

        const updatedWall = addOpeningToWall(wall, opening, state)
        const updatedState = {
          ...state,
          walls: new Map(state.walls).set(wallId, updatedWall),
          updatedAt: new Date()
        }

        set(updatedState, false, 'addOpeningToWall')
      },

      removeWall: (wallId: WallId, floorId: FloorId) => {
        const state = get()
        let updatedState = removeWallFromFloor(state, wallId, floorId)

        const bounds = calculateStateBounds(updatedState)
        if (bounds != null) {
          updatedState = { ...updatedState, bounds }
        }

        set(updatedState, false, 'removeWall')
      },

      movePoint: (pointId: PointId, position: Point2D) => {
        const state = get()
        const updatedState = movePoint(state, pointId, position)
        set(updatedState, false, 'movePoint')
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

// Selective hooks for components
export const useFloors = (): Map<FloorId, Floor> => useModelStore(state => state.floors)
export const useWalls = (): Map<WallId, Wall> => useModelStore(state => state.walls)
export const useRooms = (): Map<RoomId, Room> => useModelStore(state => state.rooms)
export const usePoints = (): Map<PointId, Point> => useModelStore(state => state.points)
export const useSlabs = (): Map<SlabId, Slab> => useModelStore(state => state.slabs)
export const useRoofs = (): Map<RoofId, Roof> => useModelStore(state => state.roofs)

// Helper function to get active floor
export const getActiveFloor = (floors: Map<FloorId, Floor>, activeFloorId: FloorId): Floor | null => {
  const floor = floors.get(activeFloorId)
  return floor ?? null
}
