import type { StateCreator } from 'zustand'
import type { Room } from '@/types/model'
import type { WallId, PointId, RoomId } from '@/types/ids'
import { createRoomId } from '@/types/ids'

export interface RoomsState {
  rooms: Map<RoomId, Room>
}

export interface RoomsActions {
  // CRUD operations
  addRoom: (name: string, pointIds: PointId[], wallIds: WallId[]) => Room
  removeRoom: (roomId: RoomId) => void

  // Room modifications
  updateRoomName: (roomId: RoomId, name: string) => void
  updateRoomBoundary: (roomId: RoomId, pointIds: PointId[], wallIds: WallId[]) => void
  addHoleToRoom: (roomId: RoomId, pointIds: PointId[], wallIds: WallId[]) => void
  removeHoleFromRoom: (roomId: RoomId, holeIndex: number) => void

  // Room queries
  getRoomById: (roomId: RoomId) => Room | null
  getRoomsContainingWall: (wallId: WallId) => Room[]
  getRoomsContainingPoint: (pointId: PointId) => Room[]

  // Room entity management
  addInteriorWallToRoom: (roomId: RoomId, wallId: WallId) => void
  removeInteriorWallFromRoom: (roomId: RoomId, wallId: WallId) => void
}

export type RoomsSlice = RoomsState & RoomsActions

// Validation helpers
const validateRoomName = (name: string): void => {
  if (name.trim() === '') {
    throw new Error('Room name must not be empty')
  }
}

const validateBoundary = (pointIds: PointId[], wallIds: WallId[]): void => {
  if (pointIds.length !== wallIds.length) {
    throw new Error('Point IDs and wall IDs must have the same length')
  }

  if (pointIds.length < 3) {
    throw new Error('Room boundary must have at least 3 points and walls')
  }

  // Check for duplicate points
  const uniquePointIds = new Set(pointIds)
  if (uniquePointIds.size !== pointIds.length) {
    throw new Error('Point IDs must not contain duplicates')
  }

  // Check for duplicate walls
  const uniqueWallIds = new Set(wallIds)
  if (uniqueWallIds.size !== wallIds.length) {
    throw new Error('Wall IDs must not contain duplicates')
  }
}

export const createRoomsSlice: StateCreator<
RoomsSlice,
[],
[],
RoomsSlice
> = (set, get) => ({
  rooms: new Map(),

  addRoom: (name: string, pointIds: PointId[], wallIds: WallId[]) => {
    validateRoomName(name)
    validateBoundary(pointIds, wallIds)

    const roomId = createRoomId()
    const room: Room = {
      id: roomId,
      name: name.trim(),
      outerBoundary: {
        pointIds,
        wallIds: new Set(wallIds)
      },
      holes: [],
      interiorWallIds: new Set()
    }

    set(state => ({
      rooms: new Map(state.rooms).set(roomId, room)
    }))

    return room
  },

  removeRoom: (roomId: RoomId) => {
    set(state => {
      const newRooms = new Map(state.rooms)
      newRooms.delete(roomId)
      return { rooms: newRooms }
    })
  },

  updateRoomName: (roomId: RoomId, name: string) => {
    validateRoomName(name)

    set(state => {
      const room = state.rooms.get(roomId)
      if (room == null) return state

      const updatedRoom = { ...room, name: name.trim() }
      return {
        rooms: new Map(state.rooms).set(roomId, updatedRoom)
      }
    })
  },

  updateRoomBoundary: (roomId: RoomId, pointIds: PointId[], wallIds: WallId[]) => {
    validateBoundary(pointIds, wallIds)

    set(state => {
      const room = state.rooms.get(roomId)
      if (room == null) return state

      const updatedRoom = {
        ...room,
        outerBoundary: {
          pointIds,
          wallIds: new Set(wallIds)
        }
      }
      return {
        rooms: new Map(state.rooms).set(roomId, updatedRoom)
      }
    })
  },

  addHoleToRoom: (roomId: RoomId, pointIds: PointId[], wallIds: WallId[]) => {
    validateBoundary(pointIds, wallIds)

    set(state => {
      const room = state.rooms.get(roomId)
      if (room == null) return state

      const hole = {
        pointIds,
        wallIds: new Set(wallIds)
      }
      const updatedRoom = {
        ...room,
        holes: [...room.holes, hole]
      }
      return {
        rooms: new Map(state.rooms).set(roomId, updatedRoom)
      }
    })
  },

  removeHoleFromRoom: (roomId: RoomId, holeIndex: number) => {
    set(state => {
      const room = state.rooms.get(roomId)
      if ((room == null) || holeIndex < 0 || holeIndex >= room.holes.length) return state

      const updatedHoles = room.holes.filter((_, index) => index !== holeIndex)
      const updatedRoom = {
        ...room,
        holes: updatedHoles
      }
      return {
        rooms: new Map(state.rooms).set(roomId, updatedRoom)
      }
    })
  },

  getRoomById: (roomId: RoomId) => {
    return get().rooms.get(roomId) ?? null
  },

  getRoomsContainingWall: (wallId: WallId) => {
    const { rooms } = get()
    const result: Room[] = []

    for (const room of rooms.values()) {
      if (room.outerBoundary.wallIds.has(wallId) ||
          room.holes.some(hole => hole.wallIds.has(wallId)) ||
          room.interiorWallIds.has(wallId)) {
        result.push(room)
      }
    }

    return result
  },

  getRoomsContainingPoint: (pointId: PointId) => {
    const { rooms } = get()
    const result: Room[] = []

    for (const room of rooms.values()) {
      if (room.outerBoundary.pointIds.includes(pointId) ||
          room.holes.some(hole => hole.pointIds.includes(pointId))) {
        result.push(room)
      }
    }

    return result
  },

  addInteriorWallToRoom: (roomId: RoomId, wallId: WallId) => {
    set(state => {
      const room = state.rooms.get(roomId)
      if (room == null) return state

      const newInteriorWallIds = new Set(room.interiorWallIds)
      newInteriorWallIds.add(wallId)

      const updatedRoom = {
        ...room,
        interiorWallIds: newInteriorWallIds
      }
      return {
        rooms: new Map(state.rooms).set(roomId, updatedRoom)
      }
    })
  },

  removeInteriorWallFromRoom: (roomId: RoomId, wallId: WallId) => {
    set(state => {
      const room = state.rooms.get(roomId)
      if (room == null) return state

      const newInteriorWallIds = new Set(room.interiorWallIds)
      newInteriorWallIds.delete(wallId)

      const updatedRoom = {
        ...room,
        interiorWallIds: newInteriorWallIds
      }
      return {
        rooms: new Map(state.rooms).set(roomId, updatedRoom)
      }
    })
  }
})
