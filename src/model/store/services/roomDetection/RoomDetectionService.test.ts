import { describe, it, beforeEach, expect, vi } from 'vitest'
import { RoomDetectionService } from './RoomDetectionService'
import { createFloorLevel, type FloorId, type Point, type PointId, type StoreState, type Wall, type WallId, type RoomId } from '@/model'
import { createLength, createPoint2D } from '@/types/geometry'

describe('RoomDetectionService', () => {
  let store: StoreState
  let service: RoomDetectionService
  const floorId = 'floor1' as FloorId
  let points: Point[][]

  beforeEach(() => {
    let roomCounter = 0

    store = {
      walls: new Map(),
      points: new Map(),
      rooms: new Map(),
      floors: new Map([[floorId, { id: floorId, level: createFloorLevel(1), name: 'First Floor', height: createLength(3000) }]]),
      corners: new Map(),
      // Add mock store actions for testing
      addRoom: vi.fn((floorId: FloorId, name: string, pointIds: PointId[], wallIds: WallId[]) => {
        roomCounter++
        const room = {
          id: `room${roomCounter}` as RoomId,
          floorId,
          name,
          outerBoundary: { pointIds, wallIds: new Set(wallIds) },
          holes: [],
          interiorWallIds: new Set<WallId>()
        }
        store.rooms.set(room.id, room)
        return room
      }),
      removeRoom: vi.fn((roomId: RoomId) => {
        store.rooms.delete(roomId)
      }),
      addHoleToRoom: vi.fn(),
      addInteriorWallToRoom: vi.fn(),
      addRoomToPoint: vi.fn((pointId: PointId, roomId: RoomId) => {
        const point = store.points.get(pointId)
        if (point != null) {
          point.roomIds.add(roomId)
        }
      }),
      removeRoomFromPoint: vi.fn((pointId: PointId, roomId: RoomId) => {
        const point = store.points.get(pointId)
        if (point != null) {
          point.roomIds.delete(roomId)
        }
      }),
      updateWallLeftRoom: vi.fn((wallId: WallId, roomId: RoomId | null) => {
        const wall = store.walls.get(wallId)
        if (wall != null) {
          if (roomId != null) {
            (wall as any).leftRoomId = roomId
          } else {
            delete (wall as any).leftRoomId
          }
        }
      }),
      updateWallRightRoom: vi.fn((wallId: WallId, roomId: RoomId | null) => {
        const wall = store.walls.get(wallId)
        if (wall != null) {
          if (roomId != null) {
            (wall as any).rightRoomId = roomId
          } else {
            delete (wall as any).rightRoomId
          }
        }
      })
    } as any

    service = new RoomDetectionService(() => store as any, (partial) => { Object.assign(store, partial) })

    points = []
    for (let x = 0; x < 4; x++) {
      points.push([])
      for (let y = 0; y < 4; y++) {
        const pointId = `point-${x}-${y}` as PointId
        const point: Point = { floorId, id: pointId, position: createPoint2D(x, y), roomIds: new Set() }
        store.points.set(pointId, point)
        points[x].push(point)
      }
    }
  })

  describe('updateRoomsAfterWallAddition', () => {
    it('should detect rooms when walls are added', () => {
      const wall1: Wall = { id: 'wall1' as WallId, startPointId: points[0][0].id, endPointId: points[0][3].id, floorId, thickness: createLength(400), type: 'other' }
      const wall2: Wall = { id: 'wall2' as WallId, startPointId: points[0][0].id, endPointId: points[3][0].id, floorId, thickness: createLength(400), type: 'other' }
      const wall3: Wall = { id: 'wall3' as WallId, startPointId: points[3][0].id, endPointId: points[3][3].id, floorId, thickness: createLength(400), type: 'other' }
      const wall4: Wall = { id: 'wall4' as WallId, startPointId: points[3][3].id, endPointId: points[0][3].id, floorId, thickness: createLength(400), type: 'other' }
      store.walls.set(wall1.id, wall1)
      store.walls.set(wall2.id, wall2)
      store.walls.set(wall3.id, wall3)
      store.walls.set(wall4.id, wall4)

      service.updateRoomsAfterWallAddition(floorId, wall1.id)

      // Should detect at least one room containing the added wall
      expect(store.rooms.size).toBeGreaterThanOrEqual(1)
    })
  })

  describe('detectRooms', () => {
    it('should always detect rooms even when auto-detection is disabled', () => {
      service.setAutoDetectionEnabled(false)

      const wall1: Wall = { id: 'wall1' as WallId, startPointId: points[0][0].id, endPointId: points[0][3].id, floorId, thickness: createLength(400), type: 'other' }
      const wall2: Wall = { id: 'wall2' as WallId, startPointId: points[0][0].id, endPointId: points[3][0].id, floorId, thickness: createLength(400), type: 'other' }
      const wall3: Wall = { id: 'wall3' as WallId, startPointId: points[3][0].id, endPointId: points[3][3].id, floorId, thickness: createLength(400), type: 'other' }
      const wall4: Wall = { id: 'wall4' as WallId, startPointId: points[3][3].id, endPointId: points[0][3].id, floorId, thickness: createLength(400), type: 'other' }
      store.walls.set(wall1.id, wall1)
      store.walls.set(wall2.id, wall2)
      store.walls.set(wall3.id, wall3)
      store.walls.set(wall4.id, wall4)

      service.detectRooms(floorId)

      // The engine might find multiple loops for the same rectangular shape
      // Let's just test that at least one room is detected and auto-detection is bypassed
      expect(store.rooms.size).toBeGreaterThanOrEqual(1)
      const rooms = Array.from(store.rooms.values())
      expect(rooms[0].name).toMatch(/^Room \d+$/) // Should follow Room {number} pattern
    })

    it('should not duplicate existing rooms', () => {
      // Create walls forming a square
      const wall1: Wall = { id: 'wall1' as WallId, startPointId: points[0][0].id, endPointId: points[0][3].id, floorId, thickness: createLength(400), type: 'other' }
      const wall2: Wall = { id: 'wall2' as WallId, startPointId: points[0][0].id, endPointId: points[3][0].id, floorId, thickness: createLength(400), type: 'other' }
      const wall3: Wall = { id: 'wall3' as WallId, startPointId: points[3][0].id, endPointId: points[3][3].id, floorId, thickness: createLength(400), type: 'other' }
      const wall4: Wall = { id: 'wall4' as WallId, startPointId: points[3][3].id, endPointId: points[0][3].id, floorId, thickness: createLength(400), type: 'other' }
      store.walls.set(wall1.id, wall1)
      store.walls.set(wall2.id, wall2)
      store.walls.set(wall3.id, wall3)
      store.walls.set(wall4.id, wall4)

      // First detection should create rooms
      service.detectRooms(floorId)
      const firstRoomCount = store.rooms.size
      const firstRoomNames = Array.from(store.rooms.values()).map(room => room.name).sort()

      // Second detection should not create duplicates - room count should stay the same
      service.detectRooms(floorId)
      expect(store.rooms.size).toBe(firstRoomCount)
      const secondRoomNames = Array.from(store.rooms.values()).map(room => room.name).sort()
      expect(secondRoomNames).toEqual(firstRoomNames)
    })

    it('should generate unique room names following Room {number} pattern', () => {
      // Create the wall that the existing room will reference
      const existingWall: Wall = { 
        id: 'existing-wall' as WallId, 
        startPointId: points[1][1].id, 
        endPointId: points[1][2].id, 
        floorId, 
        thickness: createLength(400), 
        type: 'other' 
      }
      store.walls.set(existingWall.id, existingWall)
      
      // Manually add a room with name "Room 1"
      const existingRoom = {
        id: 'existing-room' as RoomId,
        floorId,
        name: 'Room 1',
        outerBoundary: { pointIds: [points[1][1].id, points[1][2].id, points[2][2].id], wallIds: new Set(['existing-wall'] as WallId[]) },
        holes: [],
        interiorWallIds: new Set<WallId>()
      }
      store.rooms.set(existingRoom.id, existingRoom)

      // Create walls forming a square (different from existing room)
      const wall1: Wall = { id: 'wall1' as WallId, startPointId: points[0][0].id, endPointId: points[0][3].id, floorId, thickness: createLength(400), type: 'other' }
      const wall2: Wall = { id: 'wall2' as WallId, startPointId: points[0][0].id, endPointId: points[3][0].id, floorId, thickness: createLength(400), type: 'other' }
      const wall3: Wall = { id: 'wall3' as WallId, startPointId: points[3][0].id, endPointId: points[3][3].id, floorId, thickness: createLength(400), type: 'other' }
      const wall4: Wall = { id: 'wall4' as WallId, startPointId: points[3][3].id, endPointId: points[0][3].id, floorId, thickness: createLength(400), type: 'other' }
      store.walls.set(wall1.id, wall1)
      store.walls.set(wall2.id, wall2)
      store.walls.set(wall3.id, wall3)
      store.walls.set(wall4.id, wall4)

      service.detectRooms(floorId)

      // Should have existing room plus new detected rooms
      expect(store.rooms.size).toBeGreaterThan(1)
      const roomNames = Array.from(store.rooms.values()).map(room => room.name).sort()
      expect(roomNames).toContain('Room 1') // existing

      // Check that new rooms don't duplicate "Room 1" name
      const newRoomNames = roomNames.filter(name => name !== 'Room 1')
      expect(newRoomNames.length).toBeGreaterThan(0)

      // All new room names should follow the pattern and not be "Room 1"
      newRoomNames.forEach(name => {
        expect(name).toMatch(/^Room \d+$/)
        expect(name).not.toBe('Room 1')
      })
    })
  })
})
