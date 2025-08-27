import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PointId, RoomId, FloorId } from '@/types/ids'
import { createFloorId } from '@/types/ids'
import { createLength, createPoint2D } from '@/types/geometry'
import { createPointsSlice, type PointsSlice } from './pointsSlice'

// Mock Zustand following the official testing guide
vi.mock('zustand')

describe('PointsSlice', () => {
  let store: PointsSlice
  let roomId1: RoomId
  let roomId2: RoomId
  let testFloorId: FloorId

  beforeEach(() => {
    // Create the slice directly without using create()
    const mockSet = vi.fn()
    const mockGet = vi.fn()
    const mockStore = {} as any

    store = createPointsSlice(mockSet, mockGet, mockStore)

    // Set up test IDs
    roomId1 = 'room_1' as RoomId
    roomId2 = 'room_2' as RoomId
    testFloorId = createFloorId()

    // Mock the get function to return current state
    mockGet.mockImplementation(() => store)

    // Mock the set function to actually update the store
    mockSet.mockImplementation((updater) => {
      if (typeof updater === 'function') {
        const newState = updater(store)
        Object.assign(store, newState)
      } else {
        Object.assign(store, updater)
      }
    })
  })

  describe('addPoint', () => {
    it('should add a point at specified position', () => {
      const position = createPoint2D(100, 200)
      const point = store.addPoint(testFloorId, position)

      expect(store.points.size).toBe(1)
      expect(store.points.has(point.id)).toBe(true)

      const addedPoint = store.points.get(point.id)
      expect(addedPoint).toBeDefined()
      expect(addedPoint?.position).toEqual(position)
      expect(addedPoint?.roomIds).toEqual(new Set())

      // Should return the point
      expect(point.position).toEqual(position)
      expect(point.roomIds).toEqual(new Set())
    })

    it('should add multiple points', () => {
      const position1 = createPoint2D(0, 0)
      const position2 = createPoint2D(100, 100)

      const point1 = store.addPoint(testFloorId, position1)
      const point2 = store.addPoint(testFloorId, position2)

      expect(store.points.size).toBe(2)
      expect(store.points.has(point1.id)).toBe(true)
      expect(store.points.has(point2.id)).toBe(true)
      expect(point1.id).not.toBe(point2.id)
    })

    it('should create points with unique IDs', () => {
      const position = createPoint2D(50, 50)

      const point1 = store.addPoint(testFloorId, position)
      const point2 = store.addPoint(testFloorId, position)
      const point3 = store.addPoint(testFloorId, position)

      expect(point1.id).not.toBe(point2.id)
      expect(point2.id).not.toBe(point3.id)
      expect(point1.id).not.toBe(point3.id)
      expect(store.points.size).toBe(3)
    })
  })

  describe('removePoint', () => {
    it('should remove an existing point', () => {
      const position = createPoint2D(100, 200)
      const point = store.addPoint(testFloorId, position)
      expect(store.points.size).toBe(1)

      store.removePoint(point.id)

      expect(store.points.size).toBe(0)
      expect(store.points.has(point.id)).toBe(false)
    })

    it('should handle removing non-existent point gracefully', () => {
      const initialSize = store.points.size
      const fakePointId = 'point_fake' as PointId

      store.removePoint(fakePointId)

      expect(store.points.size).toBe(initialSize)
    })

    it('should not affect other points when removing one', () => {
      const position1 = createPoint2D(0, 0)
      const position2 = createPoint2D(100, 100)

      const point1 = store.addPoint(testFloorId, position1)
      const point2 = store.addPoint(testFloorId, position2)

      expect(store.points.size).toBe(2)

      store.removePoint(point1.id)

      expect(store.points.size).toBe(1)
      expect(store.points.has(point2.id)).toBe(true)
      expect(store.points.has(point1.id)).toBe(false)
    })
  })

  describe('movePoint', () => {
    it('should update point position', () => {
      const originalPosition = createPoint2D(100, 200)
      const newPosition = createPoint2D(300, 400)

      const point = store.addPoint(testFloorId, originalPosition)

      store.movePoint(point.id, newPosition)

      const updatedPoint = store.points.get(point.id)
      expect(updatedPoint?.position).toEqual(newPosition)
      expect(updatedPoint?.id).toBe(point.id) // Other properties unchanged
      expect(updatedPoint?.roomIds).toEqual(new Set()) // Other properties unchanged
    })

    it('should do nothing if point does not exist', () => {
      const initialPoints = new Map(store.points)
      const fakePointId = 'point_fake' as PointId
      const newPosition = createPoint2D(300, 400)

      store.movePoint(fakePointId, newPosition)

      expect(store.points).toEqual(initialPoints)
    })

    it('should preserve other properties when moving', () => {
      const originalPosition = createPoint2D(100, 200)
      const newPosition = createPoint2D(300, 400)

      const point = store.addPoint(testFloorId, originalPosition)

      // Add some rooms to the point
      store.addRoomToPoint(point.id, roomId1)
      store.addRoomToPoint(point.id, roomId2)

      store.movePoint(point.id, newPosition)

      const updatedPoint = store.points.get(point.id)
      expect(updatedPoint?.position).toEqual(newPosition)
      expect(updatedPoint?.roomIds).toEqual(new Set([roomId1, roomId2]))
    })
  })

  describe('getPointById', () => {
    it('should return existing point', () => {
      const position = createPoint2D(100, 200)
      const addedPoint = store.addPoint(testFloorId, position)

      const point = store.getPointById(addedPoint.id)

      expect(point).toBeDefined()
      expect(point?.position).toEqual(position)
      expect(point?.id).toBe(addedPoint.id)

      // Should be the same object
      expect(point).toEqual(addedPoint)
    })

    it('should return null for non-existent point', () => {
      const fakePointId = 'point_fake' as PointId
      const point = store.getPointById(fakePointId)
      expect(point).toBeNull()
    })
  })

  describe('getPoints', () => {
    it('should return empty array when no points', () => {
      const points = store.getPoints()
      expect(points).toEqual([])
    })

    it('should return single point', () => {
      const position = createPoint2D(100, 200)
      const point = store.addPoint(testFloorId, position)

      const points = store.getPoints()
      expect(points).toHaveLength(1)
      expect(points[0]).toEqual(point)
    })

    it('should return all points', () => {
      const position1 = createPoint2D(0, 0)
      const position2 = createPoint2D(100, 100)
      const position3 = createPoint2D(200, 200)

      const point1 = store.addPoint(testFloorId, position1)
      const point2 = store.addPoint(testFloorId, position2)
      const point3 = store.addPoint(testFloorId, position3)

      const points = store.getPoints()
      expect(points).toHaveLength(3)
      expect(points).toContain(point1)
      expect(points).toContain(point2)
      expect(points).toContain(point3)
    })
  })

  describe('findNearestPoint', () => {
    it('should return null when no points exist', () => {
      const target = createPoint2D(100, 100)
      const nearest = store.findNearestPoint(testFloorId, target)
      expect(nearest).toBeNull()
    })

    it('should return the only point when one exists', () => {
      const position = createPoint2D(50, 50)
      const point = store.addPoint(testFloorId, position)

      const target = createPoint2D(100, 100)
      const nearest = store.findNearestPoint(testFloorId, target)

      expect(nearest).toEqual(point)
    })

    it('should return the nearest point among multiple points', () => {
      store.addPoint(testFloorId, createPoint2D(0, 0)) // distance: ~141
      const point2 = store.addPoint(testFloorId, createPoint2D(90, 90)) // distance: ~14
      store.addPoint(testFloorId, createPoint2D(200, 200)) // distance: ~141

      const target = createPoint2D(100, 100)
      const nearest = store.findNearestPoint(testFloorId, target)

      expect(nearest).toEqual(point2)
    })

    it('should respect maxDistance parameter', () => {
      store.addPoint(testFloorId, createPoint2D(0, 0)) // distance: ~141
      const point2 = store.addPoint(testFloorId, createPoint2D(90, 90)) // distance: ~14

      const target = createPoint2D(100, 100)

      // With no max distance, should return point2
      const nearest1 = store.findNearestPoint(testFloorId, target)
      expect(nearest1).toEqual(point2)

      // With max distance of 10, should return null (point2 is ~14 units away)
      const nearest2 = store.findNearestPoint(testFloorId, target, createLength(10))
      expect(nearest2).toBeNull()

      // With max distance of 20, should return point2
      const nearest3 = store.findNearestPoint(testFloorId, target, createLength(20))
      expect(nearest3).toEqual(point2)
    })

    it('should handle exact position matches', () => {
      const position = createPoint2D(100, 100)
      const point = store.addPoint(testFloorId, position)

      const target = createPoint2D(100, 100) // Exact same position
      const nearest = store.findNearestPoint(testFloorId, target)

      expect(nearest).toEqual(point)
    })

    it('should work with negative coordinates', () => {
      store.addPoint(testFloorId, createPoint2D(-100, -100))
      const point2 = store.addPoint(testFloorId, createPoint2D(-10, -10))

      const target = createPoint2D(0, 0)
      const nearest = store.findNearestPoint(testFloorId, target)

      expect(nearest).toEqual(point2) // -10,-10 is closer to 0,0 than -100,-100
    })
  })

  describe('addRoomToPoint', () => {
    it('should add room to point', () => {
      const position = createPoint2D(100, 200)
      const point = store.addPoint(testFloorId, position)

      store.addRoomToPoint(point.id, roomId1)

      const updatedPoint = store.points.get(point.id)
      expect(updatedPoint?.roomIds).toEqual(new Set([roomId1]))
    })

    it('should add multiple rooms to point', () => {
      const position = createPoint2D(100, 200)
      const point = store.addPoint(testFloorId, position)

      store.addRoomToPoint(point.id, roomId1)
      store.addRoomToPoint(point.id, roomId2)

      const updatedPoint = store.points.get(point.id)
      expect(updatedPoint?.roomIds).toEqual(new Set([roomId1, roomId2]))
    })

    it('should not add duplicate rooms', () => {
      const position = createPoint2D(100, 200)
      const point = store.addPoint(testFloorId, position)

      store.addRoomToPoint(point.id, roomId1)
      store.addRoomToPoint(point.id, roomId1) // Add same room again

      const updatedPoint = store.points.get(point.id)
      expect(updatedPoint?.roomIds).toEqual(new Set([roomId1])) // Should not duplicate
    })

    it('should do nothing if point does not exist', () => {
      const initialPoints = new Map(store.points)
      const fakePointId = 'point_fake' as PointId

      store.addRoomToPoint(fakePointId, roomId1)

      expect(store.points).toEqual(initialPoints)
    })
  })

  describe('removeRoomFromPoint', () => {
    it('should remove room from point', () => {
      const position = createPoint2D(100, 200)
      const point = store.addPoint(testFloorId, position)

      // Add rooms first
      store.addRoomToPoint(point.id, roomId1)
      store.addRoomToPoint(point.id, roomId2)

      // Remove one room
      store.removeRoomFromPoint(point.id, roomId1)

      const updatedPoint = store.points.get(point.id)
      expect(updatedPoint?.roomIds).toEqual(new Set([roomId2]))
    })

    it('should handle removing non-existent room gracefully', () => {
      const position = createPoint2D(100, 200)
      const point = store.addPoint(testFloorId, position)

      // Add one room
      store.addRoomToPoint(point.id, roomId1)

      // Try to remove room that's not on the point
      store.removeRoomFromPoint(point.id, roomId2)

      const updatedPoint = store.points.get(point.id)
      expect(updatedPoint?.roomIds).toEqual(new Set([roomId1])) // Should be unchanged
    })

    it('should do nothing if point does not exist', () => {
      const initialPoints = new Map(store.points)
      const fakePointId = 'point_fake' as PointId

      store.removeRoomFromPoint(fakePointId, roomId1)

      expect(store.points).toEqual(initialPoints)
    })

    it('should remove all rooms when called multiple times', () => {
      const position = createPoint2D(100, 200)
      const point = store.addPoint(testFloorId, position)

      // Add rooms first
      store.addRoomToPoint(point.id, roomId1)
      store.addRoomToPoint(point.id, roomId2)

      // Remove all rooms
      store.removeRoomFromPoint(point.id, roomId1)
      store.removeRoomFromPoint(point.id, roomId2)

      const updatedPoint = store.points.get(point.id)
      expect(updatedPoint?.roomIds).toEqual(new Set())
    })
  })

  describe('complex scenarios', () => {
    it('should handle complex point management correctly', () => {
      // Create multiple points
      const point1 = store.addPoint(testFloorId, createPoint2D(0, 0))
      const point2 = store.addPoint(testFloorId, createPoint2D(100, 0))
      const point3 = store.addPoint(testFloorId, createPoint2D(50, 50))

      // Add rooms to points
      store.addRoomToPoint(point1.id, roomId1)
      store.addRoomToPoint(point2.id, roomId2)
      store.addRoomToPoint(point3.id, roomId1)
      store.addRoomToPoint(point3.id, roomId2)

      // Verify point 1
      let updatedPoint1 = store.points.get(point1.id)
      expect(updatedPoint1?.roomIds).toEqual(new Set([roomId1]))

      // Verify point 2
      let updatedPoint2 = store.points.get(point2.id)
      expect(updatedPoint2?.roomIds).toEqual(new Set([roomId2]))

      // Verify point 3
      const updatedPoint3 = store.points.get(point3.id)
      expect(updatedPoint3?.roomIds).toEqual(new Set([roomId1, roomId2]))

      // Move points
      store.movePoint(point1.id, createPoint2D(10, 10))
      store.movePoint(point2.id, createPoint2D(110, 10))

      updatedPoint1 = store.points.get(point1.id)
      updatedPoint2 = store.points.get(point2.id)

      expect(updatedPoint1?.position).toEqual(createPoint2D(10, 10))
      expect(updatedPoint2?.position).toEqual(createPoint2D(110, 10))

      // Verify room associations are preserved after moving
      expect(updatedPoint1?.roomIds).toEqual(new Set([roomId1]))
      expect(updatedPoint2?.roomIds).toEqual(new Set([roomId2]))
    })

    it('should handle nearest point search correctly', () => {
      // Add points at same positions
      const point1 = store.addPoint(testFloorId, createPoint2D(50, 50))
      const point2 = store.addPoint(testFloorId, createPoint2D(50, 50))

      const target = createPoint2D(50, 50)

      // Should find one of them
      const nearest = store.findNearestPoint(testFloorId, target)
      expect(nearest).toBeDefined()
      expect([point1, point2]).toContain(nearest)
    })

    it('should maintain data consistency after multiple operations', () => {
      const position = createPoint2D(100, 100)
      const point = store.addPoint(testFloorId, position)

      // Add rooms
      store.addRoomToPoint(point.id, roomId1)
      store.addRoomToPoint(point.id, roomId2)

      // Move point
      const newPosition = createPoint2D(200, 200)
      store.movePoint(point.id, newPosition)

      // Remove one room
      store.removeRoomFromPoint(point.id, roomId1)

      const finalPoint = store.points.get(point.id)
      expect(finalPoint?.position).toEqual(newPosition)
      expect(finalPoint?.roomIds).toEqual(new Set([roomId2]))
      expect(finalPoint?.id).toBe(point.id)
    })
  })
})
