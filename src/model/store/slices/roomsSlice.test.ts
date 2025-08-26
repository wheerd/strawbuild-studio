import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRoomsSlice, type RoomsSlice } from './roomsSlice'
import { createRoomId, createWallId, createPointId } from '@/types/ids'

// Mock Zustand following the official testing guide
vi.mock('zustand')

describe('roomsSlice', () => {
  let store: RoomsSlice
  let mockSet: any
  let mockGet: any

  beforeEach(() => {
    // Create the slice directly without using create()
    mockSet = vi.fn()
    mockGet = vi.fn()
    const mockStore = {} as any

    store = createRoomsSlice(mockSet, mockGet, mockStore)

    // Mock the get function to return current state
    mockGet.mockImplementation(() => store)

    // Mock the set function to actually update the store
    mockSet.mockImplementation((updater: any) => {
      if (typeof updater === 'function') {
        const newState = updater(store)
        Object.assign(store, newState)
      } else {
        Object.assign(store, updater)
      }
    })
  })

  describe('addRoom', () => {
    it('should add a new room with correct properties', () => {
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]
      const name = 'Living Room'

      const result = store.addRoom(name, pointIds, wallIds)

      expect(store.rooms.size).toBe(1)
      expect(store.rooms.has(result.id)).toBe(true)

      const addedRoom = store.rooms.get(result.id)
      expect(addedRoom).toBeDefined()
      expect(addedRoom?.name).toBe(name)
      expect(addedRoom?.outerBoundary.pointIds).toEqual(pointIds)
      expect(addedRoom?.outerBoundary.wallIds).toEqual(new Set(wallIds))
      expect(addedRoom?.holes).toEqual([])
      expect(addedRoom?.interiorWallIds).toEqual(new Set())

      // Should return the room
      expect(result.name).toBe(name)
      expect(result.outerBoundary.pointIds).toEqual(pointIds)
      expect(result.outerBoundary.wallIds).toEqual(new Set(wallIds))
    })

    it('should add multiple rooms with unique IDs', () => {
      const pointIds1 = [createPointId(), createPointId(), createPointId()]
      const wallIds1 = [createWallId(), createWallId(), createWallId()]
      const pointIds2 = [createPointId(), createPointId(), createPointId()]
      const wallIds2 = [createWallId(), createWallId(), createWallId()]

      const room1 = store.addRoom('Living Room', pointIds1, wallIds1)
      const room2 = store.addRoom('Kitchen', pointIds2, wallIds2)

      expect(store.rooms.size).toBe(2)
      expect(store.rooms.has(room1.id)).toBe(true)
      expect(store.rooms.has(room2.id)).toBe(true)
      expect(room1.id).not.toBe(room2.id)
    })

    it('should trim room name', () => {
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]
      const result = store.addRoom('  Test Room  ', pointIds, wallIds)

      expect(store.rooms.size).toBe(1)
      const addedRoom = store.rooms.get(result.id)
      expect(addedRoom?.name).toBe('Test Room')
      expect(result.name).toBe('Test Room')
    })

    it('should throw error for empty name', () => {
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]

      expect(() => store.addRoom('', pointIds, wallIds)).toThrow('Room name must not be empty')
      expect(() => store.addRoom('   ', pointIds, wallIds)).toThrow('Room name must not be empty')
    })

    it('should throw error when pointIds and wallIds have different lengths', () => {
      const pointIds = [createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]

      expect(() => store.addRoom('Test Room', pointIds, wallIds)).toThrow('Point IDs and wall IDs must have the same length')
    })

    it('should throw error when boundary has less than 3 elements', () => {
      const pointIds = [createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId()]

      expect(() => store.addRoom('Test Room', pointIds, wallIds)).toThrow('Room boundary must have at least 3 points and walls')
    })

    it('should throw error for duplicate point IDs', () => {
      const pointId = createPointId()
      const pointIds = [pointId, pointId, createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]

      expect(() => store.addRoom('Test Room', pointIds, wallIds)).toThrow('Point IDs must not contain duplicates')
    })

    it('should throw error for duplicate wall IDs', () => {
      const wallId = createWallId()
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [wallId, wallId, createWallId()]

      expect(() => store.addRoom('Test Room', pointIds, wallIds)).toThrow('Wall IDs must not contain duplicates')
    })
  })

  describe('removeRoom', () => {
    it('should remove an existing room', () => {
      // Add room first
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]
      const room = store.addRoom('Test Room', pointIds, wallIds)
      expect(store.rooms.size).toBe(1)

      // Remove it
      store.removeRoom(room.id)

      expect(store.rooms.size).toBe(0)
      expect(store.rooms.has(room.id)).toBe(false)
    })

    it('should handle removing non-existent room gracefully', () => {
      const initialSize = store.rooms.size
      const fakeRoomId = createRoomId()

      // Try to remove non-existent room
      store.removeRoom(fakeRoomId)

      expect(store.rooms.size).toBe(initialSize)
    })

    it('should not affect other rooms when removing one', () => {
      // Add two rooms
      const pointIds1 = [createPointId(), createPointId(), createPointId()]
      const wallIds1 = [createWallId(), createWallId(), createWallId()]
      const pointIds2 = [createPointId(), createPointId(), createPointId()]
      const wallIds2 = [createWallId(), createWallId(), createWallId()]
      const room1 = store.addRoom('Living Room', pointIds1, wallIds1)
      const room2 = store.addRoom('Kitchen', pointIds2, wallIds2)

      expect(store.rooms.size).toBe(2)

      // Remove one
      store.removeRoom(room1.id)

      expect(store.rooms.size).toBe(1)
      expect(store.rooms.has(room2.id)).toBe(true)
      expect(store.rooms.has(room1.id)).toBe(false)
    })
  })

  describe('updateRoomName', () => {
    it('should update room name when room exists', () => {
      // Add room first
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]
      const room = store.addRoom('Old Name', pointIds, wallIds)

      // Update name
      store.updateRoomName(room.id, 'New Name')

      const updatedRoom = store.rooms.get(room.id)
      expect(updatedRoom?.name).toBe('New Name')
      expect(updatedRoom?.outerBoundary.pointIds).toEqual(pointIds) // Other properties unchanged
      expect(updatedRoom?.outerBoundary.wallIds).toEqual(new Set(wallIds)) // Other properties unchanged
    })

    it('should trim room name when updating', () => {
      // Add room first
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]
      const room = store.addRoom('Old Name', pointIds, wallIds)

      // Update name with whitespace
      store.updateRoomName(room.id, '  New Name  ')

      const updatedRoom = store.rooms.get(room.id)
      expect(updatedRoom?.name).toBe('New Name')
    })

    it('should throw error for empty name', () => {
      expect(() => store.updateRoomName(createRoomId(), '')).toThrow('Room name must not be empty')
      expect(() => store.updateRoomName(createRoomId(), '   ')).toThrow('Room name must not be empty')
    })

    it('should do nothing if room does not exist', () => {
      const initialRooms = new Map(store.rooms)
      const fakeRoomId = createRoomId()

      // Try to update non-existent room
      store.updateRoomName(fakeRoomId, 'New Name')

      expect(store.rooms).toEqual(initialRooms)
    })
  })

  describe('updateRoomBoundary', () => {
    it('should update room boundary when room exists', () => {
      // Add room first
      const originalPointIds = [createPointId(), createPointId(), createPointId()]
      const originalWallIds = [createWallId(), createWallId(), createWallId()]
      const room = store.addRoom('Test Room', originalPointIds, originalWallIds)

      // Update boundary
      const newPointIds = [createPointId(), createPointId(), createPointId()]
      const newWallIds = [createWallId(), createWallId(), createWallId()]
      store.updateRoomBoundary(room.id, newPointIds, newWallIds)

      const updatedRoom = store.rooms.get(room.id)
      expect(updatedRoom?.outerBoundary.pointIds).toEqual(newPointIds)
      expect(updatedRoom?.outerBoundary.wallIds).toEqual(new Set(newWallIds))
      expect(updatedRoom?.name).toBe('Test Room') // Other properties unchanged
    })

    it('should throw error when pointIds and wallIds have different lengths', () => {
      const roomId = createRoomId()
      const newPointIds = [createPointId(), createPointId()]
      const newWallIds = [createWallId(), createWallId(), createWallId()]

      expect(() => store.updateRoomBoundary(roomId, newPointIds, newWallIds)).toThrow('Point IDs and wall IDs must have the same length')
    })

    it('should throw error when boundary has less than 3 elements', () => {
      const roomId = createRoomId()
      const newPointIds = [createPointId(), createPointId()]
      const newWallIds = [createWallId(), createWallId()]

      expect(() => store.updateRoomBoundary(roomId, newPointIds, newWallIds)).toThrow('Room boundary must have at least 3 points and walls')
    })

    it('should throw error for duplicate point IDs', () => {
      const roomId = createRoomId()
      const pointId = createPointId()
      const newPointIds = [pointId, pointId, createPointId()]
      const newWallIds = [createWallId(), createWallId(), createWallId()]

      expect(() => store.updateRoomBoundary(roomId, newPointIds, newWallIds)).toThrow('Point IDs must not contain duplicates')
    })

    it('should throw error for duplicate wall IDs', () => {
      const roomId = createRoomId()
      const wallId = createWallId()
      const newPointIds = [createPointId(), createPointId(), createPointId()]
      const newWallIds = [wallId, wallId, createWallId()]

      expect(() => store.updateRoomBoundary(roomId, newPointIds, newWallIds)).toThrow('Wall IDs must not contain duplicates')
    })
  })

  describe('addHoleToRoom', () => {
    it('should add a hole to existing room', () => {
      // Add room first
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]
      const room = store.addRoom('Test Room', pointIds, wallIds)

      // Add hole
      const holePointIds = [createPointId(), createPointId(), createPointId()]
      const holeWallIds = [createWallId(), createWallId(), createWallId()]
      store.addHoleToRoom(room.id, holePointIds, holeWallIds)

      const updatedRoom = store.rooms.get(room.id)
      expect(updatedRoom?.holes).toHaveLength(1)
      expect(updatedRoom?.holes[0].pointIds).toEqual(holePointIds)
      expect(updatedRoom?.holes[0].wallIds).toEqual(new Set(holeWallIds))
    })

    it('should throw error when pointIds and wallIds have different lengths', () => {
      const roomId = createRoomId()
      const holePointIds = [createPointId(), createPointId()]
      const holeWallIds = [createWallId(), createWallId(), createWallId()]

      expect(() => store.addHoleToRoom(roomId, holePointIds, holeWallIds)).toThrow('Point IDs and wall IDs must have the same length')
    })

    it('should throw error when hole has less than 3 elements', () => {
      const roomId = createRoomId()
      const holePointIds = [createPointId(), createPointId()]
      const holeWallIds = [createWallId(), createWallId()]

      expect(() => store.addHoleToRoom(roomId, holePointIds, holeWallIds)).toThrow('Room boundary must have at least 3 points and walls')
    })

    it('should throw error for duplicate point IDs in hole', () => {
      const roomId = createRoomId()
      const pointId = createPointId()
      const holePointIds = [pointId, pointId, createPointId()]
      const holeWallIds = [createWallId(), createWallId(), createWallId()]

      expect(() => store.addHoleToRoom(roomId, holePointIds, holeWallIds)).toThrow('Point IDs must not contain duplicates')
    })

    it('should throw error for duplicate wall IDs in hole', () => {
      const roomId = createRoomId()
      const wallId = createWallId()
      const holePointIds = [createPointId(), createPointId(), createPointId()]
      const holeWallIds = [wallId, wallId, createWallId()]

      expect(() => store.addHoleToRoom(roomId, holePointIds, holeWallIds)).toThrow('Wall IDs must not contain duplicates')
    })

    it('should do nothing when room does not exist', () => {
      const initialRooms = new Map(store.rooms)
      const fakeRoomId = createRoomId()

      const holePointIds = [createPointId(), createPointId(), createPointId()]
      const holeWallIds = [createWallId(), createWallId(), createWallId()]

      store.addHoleToRoom(fakeRoomId, holePointIds, holeWallIds)

      expect(store.rooms).toEqual(initialRooms)
    })
  })

  describe('removeHoleFromRoom', () => {
    it('should remove hole at valid index', () => {
      // Add room first
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]
      const room = store.addRoom('Test Room', pointIds, wallIds)

      // Add holes
      const hole1PointIds = [createPointId(), createPointId(), createPointId()]
      const hole1WallIds = [createWallId(), createWallId(), createWallId()]
      const hole2PointIds = [createPointId(), createPointId(), createPointId()]
      const hole2WallIds = [createWallId(), createWallId(), createWallId()]

      store.addHoleToRoom(room.id, hole1PointIds, hole1WallIds)
      store.addHoleToRoom(room.id, hole2PointIds, hole2WallIds)

      // Remove first hole
      store.removeHoleFromRoom(room.id, 0)

      const updatedRoom = store.rooms.get(room.id)
      expect(updatedRoom?.holes).toHaveLength(1)
      expect(updatedRoom?.holes[0].pointIds).toEqual(hole2PointIds)
      expect(updatedRoom?.holes[0].wallIds).toEqual(new Set(hole2WallIds))
    })

    it('should handle removing hole with invalid index gracefully', () => {
      // Add room first
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]
      const room = store.addRoom('Test Room', pointIds, wallIds)

      const initialHoles = [...room.holes]

      // Try to remove hole at invalid index
      store.removeHoleFromRoom(room.id, 0)

      const updatedRoom = store.rooms.get(room.id)
      expect(updatedRoom?.holes).toEqual(initialHoles)
    })

    it('should do nothing if room does not exist', () => {
      const initialRooms = new Map(store.rooms)
      const fakeRoomId = createRoomId()

      // Try to remove hole from non-existent room
      store.removeHoleFromRoom(fakeRoomId, 0)

      expect(store.rooms).toEqual(initialRooms)
    })
  })

  describe('getRoomById', () => {
    it('should return room when it exists', () => {
      // Add room first
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]
      const addedRoom = store.addRoom('Test Room', pointIds, wallIds)

      // Get the room
      const result = store.getRoomById(addedRoom.id)

      expect(result).toBeDefined()
      expect(result?.name).toBe('Test Room')
      expect(result?.id).toBe(addedRoom.id)

      // Should be the same object
      expect(result).toEqual(addedRoom)
    })

    it('should return null when room does not exist', () => {
      const fakeRoomId = createRoomId()
      const result = store.getRoomById(fakeRoomId)
      expect(result).toBeNull()
    })
  })

  describe('getRoomsContainingWall', () => {
    it('should return rooms containing wall in outer boundary', () => {
      const wallId = createWallId()
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [wallId, createWallId(), createWallId()]

      const room = store.addRoom('Test Room', pointIds, wallIds)

      const result = store.getRoomsContainingWall(wallId)
      expect(result).toEqual([room])
    })

    it('should return rooms containing wall in holes', () => {
      const wallId = createWallId()
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]

      const room = store.addRoom('Test Room', pointIds, wallIds)

      // Add hole with the target wall
      const holePointIds = [createPointId(), createPointId(), createPointId()]
      const holeWallIds = [wallId, createWallId(), createWallId()]
      store.addHoleToRoom(room.id, holePointIds, holeWallIds)

      const result = store.getRoomsContainingWall(wallId)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(room.id)
    })

    it('should return rooms containing wall as interior wall', () => {
      const wallId = createWallId()
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]

      const room = store.addRoom('Test Room', pointIds, wallIds)

      // Add interior wall
      store.addInteriorWallToRoom(room.id, wallId)

      const result = store.getRoomsContainingWall(wallId)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(room.id)
    })

    it('should return empty array when no rooms contain the wall', () => {
      const result = store.getRoomsContainingWall(createWallId())
      expect(result).toEqual([])
    })
  })

  describe('getRoomsContainingPoint', () => {
    it('should return rooms containing point in outer boundary', () => {
      const pointId = createPointId()
      const pointIds = [pointId, createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]

      const room = store.addRoom('Test Room', pointIds, wallIds)

      const result = store.getRoomsContainingPoint(pointId)
      expect(result).toEqual([room])
    })

    it('should return rooms containing point in holes', () => {
      const pointId = createPointId()
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]

      const room = store.addRoom('Test Room', pointIds, wallIds)

      // Add hole with the target point
      const holePointIds = [pointId, createPointId(), createPointId()]
      const holeWallIds = [createWallId(), createWallId(), createWallId()]
      store.addHoleToRoom(room.id, holePointIds, holeWallIds)

      const result = store.getRoomsContainingPoint(pointId)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(room.id)
    })

    it('should return empty array when no rooms contain the point', () => {
      const result = store.getRoomsContainingPoint(createPointId())
      expect(result).toEqual([])
    })
  })

  describe('addInteriorWallToRoom', () => {
    it('should add interior wall to existing room', () => {
      const wallId = createWallId()
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]

      const room = store.addRoom('Test Room', pointIds, wallIds)

      store.addInteriorWallToRoom(room.id, wallId)

      const updatedRoom = store.rooms.get(room.id)
      expect(updatedRoom?.interiorWallIds).toEqual(new Set([wallId]))
    })

    it('should add multiple interior walls to room', () => {
      const wallId1 = createWallId()
      const wallId2 = createWallId()
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]

      const room = store.addRoom('Test Room', pointIds, wallIds)

      store.addInteriorWallToRoom(room.id, wallId1)
      store.addInteriorWallToRoom(room.id, wallId2)

      const updatedRoom = store.rooms.get(room.id)
      expect(updatedRoom?.interiorWallIds).toEqual(new Set([wallId1, wallId2]))
    })

    it('should not add duplicate interior walls', () => {
      const wallId = createWallId()
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]

      const room = store.addRoom('Test Room', pointIds, wallIds)

      store.addInteriorWallToRoom(room.id, wallId)
      store.addInteriorWallToRoom(room.id, wallId) // Add same wall again

      const updatedRoom = store.rooms.get(room.id)
      expect(updatedRoom?.interiorWallIds).toEqual(new Set([wallId])) // Should not duplicate
    })

    it('should do nothing when room does not exist', () => {
      const initialRooms = new Map(store.rooms)
      const fakeRoomId = createRoomId()

      store.addInteriorWallToRoom(fakeRoomId, createWallId())

      expect(store.rooms).toEqual(initialRooms)
    })
  })

  describe('removeInteriorWallFromRoom', () => {
    it('should remove interior wall from existing room', () => {
      const wallId1 = createWallId()
      const wallId2 = createWallId()
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]

      const room = store.addRoom('Test Room', pointIds, wallIds)

      // Add interior walls
      store.addInteriorWallToRoom(room.id, wallId1)
      store.addInteriorWallToRoom(room.id, wallId2)

      // Remove one wall
      store.removeInteriorWallFromRoom(room.id, wallId1)

      const updatedRoom = store.rooms.get(room.id)
      expect(updatedRoom?.interiorWallIds).toEqual(new Set([wallId2]))
    })

    it('should handle removing non-existent interior wall gracefully', () => {
      const wallId1 = createWallId()
      const wallId2 = createWallId()
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]

      const room = store.addRoom('Test Room', pointIds, wallIds)

      // Add one interior wall
      store.addInteriorWallToRoom(room.id, wallId1)

      // Try to remove wall that's not in the room
      store.removeInteriorWallFromRoom(room.id, wallId2)

      const updatedRoom = store.rooms.get(room.id)
      expect(updatedRoom?.interiorWallIds).toEqual(new Set([wallId1])) // Should be unchanged
    })

    it('should do nothing when room does not exist', () => {
      const initialRooms = new Map(store.rooms)
      const fakeRoomId = createRoomId()

      store.removeInteriorWallFromRoom(fakeRoomId, createWallId())

      expect(store.rooms).toEqual(initialRooms)
    })
  })

  describe('complex scenarios', () => {
    it('should handle complex room management correctly', () => {
      // Create multiple rooms
      const pointIds1 = [createPointId(), createPointId(), createPointId()]
      const wallIds1 = [createWallId(), createWallId(), createWallId()]
      const pointIds2 = [createPointId(), createPointId(), createPointId(), createPointId()]
      const wallIds2 = [createWallId(), createWallId(), createWallId(), createWallId()]

      const room1 = store.addRoom('Living Room', pointIds1, wallIds1)
      const room2 = store.addRoom('Kitchen', pointIds2, wallIds2)

      // Add holes and interior walls
      const holePointIds = [createPointId(), createPointId(), createPointId()]
      const holeWallIds = [createWallId(), createWallId(), createWallId()]
      const interiorWallId = createWallId()

      store.addHoleToRoom(room1.id, holePointIds, holeWallIds)
      store.addInteriorWallToRoom(room2.id, interiorWallId)

      // Verify room 1
      let updatedRoom1 = store.rooms.get(room1.id)
      expect(updatedRoom1?.name).toBe('Living Room')
      expect(updatedRoom1?.holes).toHaveLength(1)
      expect(updatedRoom1?.holes[0].pointIds).toEqual(holePointIds)
      expect(updatedRoom1?.interiorWallIds.size).toBe(0)

      // Verify room 2
      let updatedRoom2 = store.rooms.get(room2.id)
      expect(updatedRoom2?.name).toBe('Kitchen')
      expect(updatedRoom2?.holes).toHaveLength(0)
      expect(updatedRoom2?.interiorWallIds).toEqual(new Set([interiorWallId]))

      // Update room properties
      store.updateRoomName(room1.id, 'Main Living Area')
      const newPointIds = [createPointId(), createPointId(), createPointId()]
      const newWallIds = [createWallId(), createWallId(), createWallId()]
      store.updateRoomBoundary(room2.id, newPointIds, newWallIds)

      updatedRoom1 = store.rooms.get(room1.id)
      updatedRoom2 = store.rooms.get(room2.id)

      expect(updatedRoom1?.name).toBe('Main Living Area')
      expect(updatedRoom2?.outerBoundary.pointIds).toEqual(newPointIds)
      expect(updatedRoom2?.outerBoundary.wallIds).toEqual(new Set(newWallIds))

      // Verify state consistency
      expect(store.rooms.size).toBe(2)
      const allRooms = Array.from(store.rooms.values())
      expect(allRooms).toContain(updatedRoom1)
      expect(allRooms).toContain(updatedRoom2)
    })

    it('should maintain data consistency after multiple operations', () => {
      const pointIds = [createPointId(), createPointId(), createPointId()]
      const wallIds = [createWallId(), createWallId(), createWallId()]
      const room = store.addRoom('Test Room', pointIds, wallIds)

      // Add hole
      const holePointIds = [createPointId(), createPointId(), createPointId()]
      const holeWallIds = [createWallId(), createWallId(), createWallId()]
      store.addHoleToRoom(room.id, holePointIds, holeWallIds)

      // Add interior walls
      const interiorWall1 = createWallId()
      const interiorWall2 = createWallId()
      store.addInteriorWallToRoom(room.id, interiorWall1)
      store.addInteriorWallToRoom(room.id, interiorWall2)

      // Update name
      store.updateRoomName(room.id, 'Updated Room')

      // Remove one interior wall
      store.removeInteriorWallFromRoom(room.id, interiorWall1)

      const finalRoom = store.rooms.get(room.id)
      expect(finalRoom?.name).toBe('Updated Room')
      expect(finalRoom?.outerBoundary.pointIds).toEqual(pointIds)
      expect(finalRoom?.outerBoundary.wallIds).toEqual(new Set(wallIds))
      expect(finalRoom?.holes).toHaveLength(1)
      expect(finalRoom?.holes[0].pointIds).toEqual(holePointIds)
      expect(finalRoom?.interiorWallIds).toEqual(new Set([interiorWall2]))
      expect(finalRoom?.id).toBe(room.id)
    })

    it('should handle search operations correctly', () => {
      const wallId = createWallId()
      const pointId = createPointId()

      // Create room with specific wall and point
      const pointIds = [pointId, createPointId(), createPointId()]
      const wallIds = [wallId, createWallId(), createWallId()]
      const room = store.addRoom('Search Room', pointIds, wallIds)

      // Create another room without these IDs
      const otherPointIds = [createPointId(), createPointId(), createPointId()]
      const otherWallIds = [createWallId(), createWallId(), createWallId()]
      store.addRoom('Other Room', otherPointIds, otherWallIds)

      // Search for wall
      const roomsWithWall = store.getRoomsContainingWall(wallId)
      expect(roomsWithWall).toHaveLength(1)
      expect(roomsWithWall[0].id).toBe(room.id)

      // Search for point
      const roomsWithPoint = store.getRoomsContainingPoint(pointId)
      expect(roomsWithPoint).toHaveLength(1)
      expect(roomsWithPoint[0].id).toBe(room.id)

      // Search for non-existent wall/point
      expect(store.getRoomsContainingWall(createWallId())).toEqual([])
      expect(store.getRoomsContainingPoint(createPointId())).toEqual([])
    })
  })
})
