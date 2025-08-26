import type { StateCreator } from 'zustand'
import type { Floor, FloorLevel } from '@/types/model'
import type { FloorId, WallId, RoomId, PointId } from '@/types/ids'
import { createFloorId } from '@/types/ids'
import type { Length } from '@/types/geometry'
import { createLength } from '@/types/geometry'

export interface FloorsState {
  floors: Map<FloorId, Floor>
}

export interface FloorsActions {
  // CRUD operations
  addFloor: (name: string, level: FloorLevel, height?: Length) => Floor
  removeFloor: (floorId: FloorId) => void

  // Floor modifications
  updateFloorName: (floorId: FloorId, name: string) => void
  updateFloorLevel: (floorId: FloorId, level: FloorLevel) => void
  updateFloorHeight: (floorId: FloorId, height: Length) => void

  // Floor queries
  getFloorById: (floorId: FloorId) => Floor | null
  getFloorsOrderedByLevel: () => Floor[]

  // Floor entity management
  addWallToFloor: (floorId: FloorId, wallId: WallId) => void
  removeWallFromFloor: (floorId: FloorId, wallId: WallId) => void
  addRoomToFloor: (floorId: FloorId, roomId: RoomId) => void
  removeRoomFromFloor: (floorId: FloorId, roomId: RoomId) => void
  addPointToFloor: (floorId: FloorId, pointId: PointId) => void
  removePointFromFloor: (floorId: FloorId, pointId: PointId) => void
}

export type FloorsSlice = FloorsState & FloorsActions

// Validation functions
const validateFloorName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Floor name cannot be empty')
  }
}

const validateFloorHeight = (height: Length): void => {
  if (Number(height) <= 0) {
    throw new Error('Floor height must be greater than 0')
  }
}

const validateUniqueFloorLevel = (floors: Map<FloorId, Floor>, level: FloorLevel, excludeFloorId?: FloorId): void => {
  for (const [floorId, floor] of floors) {
    if (floorId !== excludeFloorId && floor.level === level) {
      throw new Error(`Floor level ${level} already exists`)
    }
  }
}

export const createFloorsSlice: StateCreator<
FloorsSlice,
[],
[],
FloorsSlice
> = (set, get) => ({
  floors: new Map<FloorId, Floor>(),

  // CRUD operations
  addFloor: (name: string, level: FloorLevel, height?: Length) => {
    const state = get()

    // Validate inputs
    validateFloorName(name)
    validateUniqueFloorLevel(state.floors, level)

    const floorId = createFloorId()
    const defaultHeight = height !== undefined ? height : createLength(3000) // Default 3m height

    // Validate height
    validateFloorHeight(defaultHeight)

    const floor: Floor = {
      id: floorId,
      name: name.trim(),
      level,
      height: defaultHeight,
      wallIds: [],
      roomIds: [],
      pointIds: [],
      slabIds: [],
      roofIds: []
    }

    set((state) => ({
      ...state,
      floors: new Map(state.floors).set(floorId, floor)
    }))

    return floor
  },

  removeFloor: (floorId: FloorId) => {
    set((state) => {
      const newFloors = new Map(state.floors)
      newFloors.delete(floorId)
      return {
        ...state,
        floors: newFloors
      }
    })
  },

  // Floor modifications
  updateFloorName: (floorId: FloorId, name: string) => {
    // Validate name
    validateFloorName(name)

    set((state) => {
      const floor = state.floors.get(floorId)
      if (floor == null) return state

      const updatedFloor: Floor = {
        ...floor,
        name: name.trim()
      }

      return {
        ...state,
        floors: new Map(state.floors).set(floorId, updatedFloor)
      }
    })
  },

  updateFloorLevel: (floorId: FloorId, level: FloorLevel) => {
    set((state) => {
      const floor = state.floors.get(floorId)
      if (floor == null) return state

      // Validate unique level (excluding current floor)
      validateUniqueFloorLevel(state.floors, level, floorId)

      const updatedFloor: Floor = {
        ...floor,
        level
      }

      return {
        ...state,
        floors: new Map(state.floors).set(floorId, updatedFloor)
      }
    })
  },

  updateFloorHeight: (floorId: FloorId, height: Length) => {
    // Validate height
    validateFloorHeight(height)

    set((state) => {
      const floor = state.floors.get(floorId)
      if (floor == null) return state

      const updatedFloor: Floor = {
        ...floor,
        height
      }

      return {
        ...state,
        floors: new Map(state.floors).set(floorId, updatedFloor)
      }
    })
  },

  // Floor queries
  getFloorById: (floorId: FloorId) => {
    const state = get()
    return state.floors.get(floorId) ?? null
  },

  getFloorsOrderedByLevel: () => {
    const state = get()
    const floors = Array.from(state.floors.values())
    return floors.sort((a, b) => a.level - b.level)
  },

  // Floor entity management
  addWallToFloor: (floorId: FloorId, wallId: WallId) => {
    set((state) => {
      const floor = state.floors.get(floorId)
      if (floor == null) return state

      // Don't add if already present
      if (floor.wallIds.includes(wallId)) return state

      const updatedFloor: Floor = {
        ...floor,
        wallIds: [...floor.wallIds, wallId]
      }

      return {
        ...state,
        floors: new Map(state.floors).set(floorId, updatedFloor)
      }
    })
  },

  removeWallFromFloor: (floorId: FloorId, wallId: WallId) => {
    set((state) => {
      const floor = state.floors.get(floorId)
      if (floor == null) return state

      const updatedFloor: Floor = {
        ...floor,
        wallIds: floor.wallIds.filter(id => id !== wallId)
      }

      return {
        ...state,
        floors: new Map(state.floors).set(floorId, updatedFloor)
      }
    })
  },

  addRoomToFloor: (floorId: FloorId, roomId: RoomId) => {
    set((state) => {
      const floor = state.floors.get(floorId)
      if (floor == null) return state

      // Don't add if already present
      if (floor.roomIds.includes(roomId)) return state

      const updatedFloor: Floor = {
        ...floor,
        roomIds: [...floor.roomIds, roomId]
      }

      return {
        ...state,
        floors: new Map(state.floors).set(floorId, updatedFloor)
      }
    })
  },

  removeRoomFromFloor: (floorId: FloorId, roomId: RoomId) => {
    set((state) => {
      const floor = state.floors.get(floorId)
      if (floor == null) return state

      const updatedFloor: Floor = {
        ...floor,
        roomIds: floor.roomIds.filter(id => id !== roomId)
      }

      return {
        ...state,
        floors: new Map(state.floors).set(floorId, updatedFloor)
      }
    })
  },

  addPointToFloor: (floorId: FloorId, pointId: PointId) => {
    set((state) => {
      const floor = state.floors.get(floorId)
      if (floor == null) return state

      // Don't add if already present
      if (floor.pointIds.includes(pointId)) return state

      const updatedFloor: Floor = {
        ...floor,
        pointIds: [...floor.pointIds, pointId]
      }

      return {
        ...state,
        floors: new Map(state.floors).set(floorId, updatedFloor)
      }
    })
  },

  removePointFromFloor: (floorId: FloorId, pointId: PointId) => {
    set((state) => {
      const floor = state.floors.get(floorId)
      if (floor == null) return state

      const updatedFloor: Floor = {
        ...floor,
        pointIds: floor.pointIds.filter(id => id !== pointId)
      }

      return {
        ...state,
        floors: new Map(state.floors).set(floorId, updatedFloor)
      }
    })
  }
})
