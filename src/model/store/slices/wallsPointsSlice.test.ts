import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createWallsPointsSlice, type WallsPointsSlice } from './wallsPointsSlice'
import { createWallsSlice, type WallsSlice } from './wallsSlice'
import { createPointsSlice, type PointsSlice } from './pointsSlice'
import { createFloorId, createPointId, createWallId } from '@/types/ids'
import { createVec2 } from '@/types/geometry'

// Mock Zustand following the official testing guide
vi.mock('zustand')

type CombinedStore = WallsSlice & PointsSlice & WallsPointsSlice

describe('WallsPointsSlice', () => {
  let store: CombinedStore
  let mockSet: any
  let mockGet: any
  let floorId = createFloorId()

  beforeEach(() => {
    // Reset floor ID for each test
    floorId = createFloorId()

    // Create the slices directly without using create()
    mockSet = vi.fn()
    mockGet = vi.fn()
    const mockStore = {} as any

    // Create combined store with all three slices
    const wallsSlice = createWallsSlice(mockSet, mockGet, mockStore)
    const pointsSlice = createPointsSlice(mockSet, mockGet, mockStore)
    const wallsPointsSlice = createWallsPointsSlice(mockSet, mockGet, mockStore)

    store = {
      ...wallsSlice,
      ...pointsSlice,
      ...wallsPointsSlice
    }

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

  describe('getWallLength', () => {
    it('should calculate wall length correctly', () => {
      // Create two points 100 units apart
      const point1 = store.addPoint(floorId, createVec2(100, 100))
      const point2 = store.addPoint(floorId, createVec2(200, 100))

      // Create wall between the points
      const wall = store.addStructuralWall(floorId, point1.id, point2.id)

      const length = store.getWallLength(wall.id)
      expect(length).toBe(100) // Distance should be 100 units
    })

    it('should calculate vertical wall length correctly', () => {
      // Create two points 150 units apart vertically
      const point1 = store.addPoint(floorId, createVec2(100, 100))
      const point2 = store.addPoint(floorId, createVec2(100, 250))

      // Create wall between the points
      const wall = store.addStructuralWall(floorId, point1.id, point2.id)

      const length = store.getWallLength(wall.id)
      expect(length).toBe(150) // Distance should be 150 units
    })

    it('should calculate diagonal wall length correctly', () => {
      // Create two points forming a 3-4-5 right triangle (hypotenuse = 5)
      const point1 = store.addPoint(floorId, createVec2(0, 0))
      const point2 = store.addPoint(floorId, createVec2(30, 40)) // 3:4 ratio scaled by 10

      // Create wall between the points
      const wall = store.addStructuralWall(floorId, point1.id, point2.id)

      const length = store.getWallLength(wall.id)
      expect(length).toBe(50) // Distance should be 50 units (5 * 10)
    })

    it('should return 0 for non-existent wall', () => {
      const fakeWallId = createWallId()

      const length = store.getWallLength(fakeWallId)
      expect(length).toBe(0)
    })

    it('should return 0 for wall with missing start point', () => {
      // Create two points
      const point1 = store.addPoint(floorId, createVec2(100, 100))
      const point2 = store.addPoint(floorId, createVec2(200, 100))

      // Create wall between the points
      const wall = store.addStructuralWall(floorId, point1.id, point2.id)

      // Remove the start point
      store.removePoint(point1.id)

      const length = store.getWallLength(wall.id)
      expect(length).toBe(0)
    })

    it('should return 0 for wall with missing end point', () => {
      // Create two points
      const point1 = store.addPoint(floorId, createVec2(100, 100))
      const point2 = store.addPoint(floorId, createVec2(200, 100))

      // Create wall between the points
      const wall = store.addStructuralWall(floorId, point1.id, point2.id)

      // Remove the end point
      store.removePoint(point2.id)

      const length = store.getWallLength(wall.id)
      expect(length).toBe(0)
    })

    it('should return 0 for wall where both points are at same position', () => {
      // Create two points at the same position
      const samePosition = createVec2(100, 100)
      const point1 = store.addPoint(floorId, samePosition)
      const point2 = store.addPoint(floorId, samePosition)

      // Create wall between the points
      const wall = store.addStructuralWall(floorId, point1.id, point2.id)

      const length = store.getWallLength(wall.id)
      expect(length).toBe(0)
    })
  })

  describe('mergePoints', () => {
    it('should merge two unconnected points', () => {
      const point1 = store.addPoint(floorId, createVec2(100, 100))
      const point2 = store.addPoint(floorId, createVec2(200, 200))

      store.mergePoints(point1.id, point2.id)

      expect(store.points.size).toBe(1) // point1 should be removed
      expect(store.getPointById(point1.id)).toBeNull()
      expect(store.getPointById(point2.id)).not.toBeNull()
    })

    it('should redirect walls from source point to target point', () => {
      const point1 = store.addPoint(floorId, createVec2(100, 100))
      const point2 = store.addPoint(floorId, createVec2(200, 100))
      const point3 = store.addPoint(floorId, createVec2(300, 100))

      // Create wall using point1 as start
      const wall = store.addStructuralWall(floorId, point1.id, point3.id)

      store.mergePoints(point1.id, point2.id)

      const updatedWall = store.getWallById(wall.id)
      expect(updatedWall?.startPointId).toBe(point2.id) // Should now reference point2
      expect(store.getPointById(point1.id)).toBeNull() // point1 should be removed
    })

    it('should update walls that reference source point as end point', () => {
      const point1 = store.addPoint(floorId, createVec2(100, 100))
      const point2 = store.addPoint(floorId, createVec2(200, 100))
      const point3 = store.addPoint(floorId, createVec2(300, 100))

      // Create wall using point1 as end
      const wall = store.addStructuralWall(floorId, point3.id, point1.id)

      store.mergePoints(point1.id, point2.id)

      const updatedWall = store.getWallById(wall.id)
      expect(updatedWall?.endPointId).toBe(point2.id) // Should now reference point2
    })

    it('should remove degenerate walls (same start and end point)', () => {
      const point1 = store.addPoint(floorId, createVec2(100, 100))
      const point2 = store.addPoint(floorId, createVec2(200, 100))

      // Create wall between point1 and point2
      const wall = store.addStructuralWall(floorId, point1.id, point2.id)

      // Merge point2 into point1 - this should create a degenerate wall that gets removed
      store.mergePoints(point2.id, point1.id)

      const updatedWall = store.getWallById(wall.id)
      expect(updatedWall).toBeNull() // Wall should be removed as it would connect point to itself
    })

    it('should remove duplicate walls', () => {
      const point1 = store.addPoint(floorId, createVec2(100, 100))
      const point2 = store.addPoint(floorId, createVec2(200, 100))
      const point3 = store.addPoint(floorId, createVec2(300, 100))

      // Create two walls: point1->point2 and point3->point2
      const wall1 = store.addStructuralWall(floorId, point1.id, point2.id)
      const wall2 = store.addStructuralWall(floorId, point3.id, point2.id)

      // Merge point2 into point1, creating two walls that both connect point1->point3
      store.mergePoints(point2.id, point1.id)

      // One of the duplicate walls should be removed
      const wall1Updated = store.getWallById(wall1.id)
      const wall2Updated = store.getWallById(wall2.id)

      // At least one wall should be removed due to duplication
      expect(wall1Updated === null || wall2Updated === null).toBe(true)

      // The remaining wall should connect point1 to point3
      const remainingWall = wall1Updated ?? wall2Updated
      expect(remainingWall).not.toBeNull()
      expect(remainingWall?.startPointId === point1.id || remainingWall?.endPointId === point1.id).toBe(true)
      expect(remainingWall?.startPointId === point3.id || remainingWall?.endPointId === point3.id).toBe(true)
    })

    it('should transfer room associations from source to target', () => {
      const point1 = store.addPoint(floorId, createVec2(100, 100))
      const point2 = store.addPoint(floorId, createVec2(200, 200))

      // Add room associations to point1
      const roomId1 = 'room_1' as any
      const roomId2 = 'room_2' as any
      store.addRoomToPoint(point1.id, roomId1)
      store.addRoomToPoint(point1.id, roomId2)

      store.mergePoints(point1.id, point2.id)

      const targetPoint = store.getPointById(point2.id)
      expect(targetPoint?.roomIds.has(roomId1)).toBe(true)
      expect(targetPoint?.roomIds.has(roomId2)).toBe(true)
    })

    it('should throw error when merging points on different floors', () => {
      const floor1 = createFloorId()
      const floor2 = createFloorId()

      const point1 = store.addPoint(floor1, createVec2(100, 100))
      const point2 = store.addPoint(floor2, createVec2(200, 200))

      expect(() => {
        store.mergePoints(point1.id, point2.id)
      }).toThrow('Cannot merge points on different floors')
    })

    it('should handle merging the same point gracefully', () => {
      const point1 = store.addPoint(floorId, createVec2(100, 100))

      expect(() => {
        store.mergePoints(point1.id, point1.id)
      }).not.toThrow()

      expect(store.points.size).toBe(1)
      expect(store.getPointById(point1.id)).not.toBeNull()
    })

    it('should handle non-existent source point gracefully', () => {
      const fakePointId = createPointId()
      const point2 = store.addPoint(floorId, createVec2(200, 200))

      expect(() => {
        store.mergePoints(fakePointId, point2.id)
      }).not.toThrow()

      expect(store.getPointById(point2.id)).not.toBeNull() // target point should remain
    })

    it('should handle non-existent target point gracefully', () => {
      const point1 = store.addPoint(floorId, createVec2(100, 100))
      const fakePointId = createPointId()

      expect(() => {
        store.mergePoints(point1.id, fakePointId)
      }).not.toThrow()

      expect(store.getPointById(point1.id)).not.toBeNull() // source point should remain
    })

    it('should handle both points being non-existent gracefully', () => {
      const fakePointId1 = createPointId()
      const fakePointId2 = createPointId()

      expect(() => {
        store.mergePoints(fakePointId1, fakePointId2)
      }).not.toThrow()
    })
  })
})
