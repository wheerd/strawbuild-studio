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
    store = {
      walls: new Map(),
      points: new Map(),
      rooms: new Map(),
      floors: new Map([[floorId, { id: floorId, level: createFloorLevel(1), name: 'First Floor', height: createLength(3000) }]]),
      corners: new Map(),
      // Add mock store actions for testing
      addRoom: vi.fn((floorId: FloorId, name: string, pointIds: PointId[], wallIds: WallId[]) => {
        const room = {
          id: 'room1' as RoomId,
          floorId,
          name,
          outerBoundary: { pointIds, wallIds: new Set(wallIds) },
          holes: [],
          interiorWallIds: new Set<WallId>()
        }
        store.rooms.set(room.id, room)
        return room
      }),
      removeRoom: vi.fn(),
      addHoleToRoom: vi.fn(),
      addInteriorWallToRoom: vi.fn()
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
    it('should detect a single rectangular room', () => {
      const wall1: Wall = { id: 'wall1' as WallId, startPointId: points[0][0].id, endPointId: points[0][3].id, floorId, thickness: createLength(400), type: 'other' }
      const wall2: Wall = { id: 'wall2' as WallId, startPointId: points[0][0].id, endPointId: points[3][0].id, floorId, thickness: createLength(400), type: 'other' }
      const wall3: Wall = { id: 'wall3' as WallId, startPointId: points[3][0].id, endPointId: points[3][3].id, floorId, thickness: createLength(400), type: 'other' }
      const wall4: Wall = { id: 'wall4' as WallId, startPointId: points[3][3].id, endPointId: points[0][3].id, floorId, thickness: createLength(400), type: 'other' }
      store.walls.set(wall1.id, wall1)
      store.walls.set(wall2.id, wall2)
      store.walls.set(wall3.id, wall3)
      store.walls.set(wall4.id, wall4)

      service.updateRoomsAfterWallAddition(floorId, wall1.id)

      expect(store.rooms.size).toBe(1)
    })
  })
})
