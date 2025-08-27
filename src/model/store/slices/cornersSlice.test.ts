import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { WallId, PointId, FloorId } from '@/types/ids'
import { createCornersSlice, type CornersSlice } from './cornersSlice'

// Mock Zustand following the official testing guide
vi.mock('zustand')

describe('CornersSlice', () => {
  let store: CornersSlice
  let pointId1: PointId
  let pointId2: PointId
  let floorId1: FloorId
  let floorId2: FloorId
  let wallId1: WallId
  let wallId2: WallId
  let wallId3: WallId
  let wallId4: WallId

  beforeEach(() => {
    // Create the slice directly without using create()
    const mockSet = vi.fn()
    const mockGet = vi.fn()
    const mockStore = {} as any

    store = createCornersSlice(mockSet, mockGet, mockStore)

    // Set up test IDs
    pointId1 = 'point_1' as PointId
    pointId2 = 'point_2' as PointId
    floorId1 = 'floor_1' as FloorId
    floorId2 = 'floor_2' as FloorId
    wallId1 = 'wall_1' as WallId
    wallId2 = 'wall_2' as WallId
    wallId3 = 'wall_3' as WallId
    wallId4 = 'wall_4' as WallId

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

  describe('addCorner', () => {
    it('should add a corner with required walls only', () => {
      const corner = store.addCorner(pointId1, floorId1, wallId1, wallId2)

      expect(corner.pointId).toBe(pointId1)
      expect(corner.floorId).toBe(floorId1)
      expect(corner.wall1Id).toBe(wallId1)
      expect(corner.wall2Id).toBe(wallId2)
      expect(corner.otherWallIds).toBeUndefined()
      expect(store.corners.get(pointId1)).toBe(corner)
    })

    it('should add a corner with other walls', () => {
      const corner = store.addCorner(pointId1, floorId1, wallId1, wallId2, [wallId3])

      expect(corner.pointId).toBe(pointId1)
      expect(corner.floorId).toBe(floorId1)
      expect(corner.wall1Id).toBe(wallId1)
      expect(corner.wall2Id).toBe(wallId2)
      expect(corner.otherWallIds).toEqual([wallId3])
    })

    it('should add multiple corners', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2)
      store.addCorner(pointId2, floorId2, wallId3, wallId4)

      expect(store.corners.size).toBe(2)
      expect(store.corners.get(pointId1)?.pointId).toBe(pointId1)
      expect(store.corners.get(pointId2)?.pointId).toBe(pointId2)
    })

    it('should throw error for duplicate main walls', () => {
      expect(() => {
        store.addCorner(pointId1, floorId1, wallId1, wallId1)
      }).toThrow('Corner main walls must be distinct')
    })

    it('should throw error for duplicate wall IDs in all walls', () => {
      expect(() => {
        store.addCorner(pointId1, floorId1, wallId1, wallId2, [wallId1])
      }).toThrow('All wall IDs must be distinct in corner')
    })

    it('should throw error for duplicate wall IDs in other walls', () => {
      expect(() => {
        store.addCorner(pointId1, floorId1, wallId1, wallId2, [wallId3, wallId3])
      }).toThrow('All wall IDs must be distinct in corner')
    })
  })

  describe('removeCorner', () => {
    it('should remove an existing corner', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2)
      expect(store.corners.has(pointId1)).toBe(true)

      store.removeCorner(pointId1)
      expect(store.corners.has(pointId1)).toBe(false)
    })

    it('should handle removing non-existent corner gracefully', () => {
      expect(store.corners.size).toBe(0)
      store.removeCorner(pointId1)
      expect(store.corners.size).toBe(0)
    })

    it('should not affect other corners when removing one', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2)
      store.addCorner(pointId2, floorId2, wallId3, wallId4)
      expect(store.corners.size).toBe(2)

      store.removeCorner(pointId1)
      expect(store.corners.size).toBe(1)
      expect(store.corners.has(pointId2)).toBe(true)
    })
  })

  describe('updateCornerMainWalls', () => {
    it('should update main walls when both are connected', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2, [wallId3, wallId4])

      store.updateCornerMainWalls(pointId1, wallId3, wallId4)

      const corner = store.corners.get(pointId1)
      expect(corner?.wall1Id).toBe(wallId3)
      expect(corner?.wall2Id).toBe(wallId4)
      expect(corner?.otherWallIds).toEqual([wallId1, wallId2])
    })

    it('should not update when walls are the same', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2, [wallId3])
      const originalCorner = store.corners.get(pointId1)

      store.updateCornerMainWalls(pointId1, wallId1, wallId1)

      const corner = store.corners.get(pointId1)
      expect(corner).toEqual(originalCorner) // Should remain unchanged
    })

    it('should not update when wall is not connected to corner', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2)
      const originalCorner = store.corners.get(pointId1)

      store.updateCornerMainWalls(pointId1, wallId1, wallId3) // wallId3 not connected

      const corner = store.corners.get(pointId1)
      expect(corner).toEqual(originalCorner) // Should remain unchanged
    })

    it('should do nothing if corner does not exist', () => {
      store.updateCornerMainWalls(pointId1, wallId1, wallId2)
      expect(store.corners.size).toBe(0)
    })
  })

  describe('addWallToCorner', () => {
    it('should add wall to other walls', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2)

      store.addWallToCorner(pointId1, wallId3)

      const corner = store.corners.get(pointId1)
      expect(corner?.otherWallIds).toEqual([wallId3])
    })

    it('should add multiple walls to other walls', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2)

      store.addWallToCorner(pointId1, wallId3)
      store.addWallToCorner(pointId1, wallId4)

      const corner = store.corners.get(pointId1)
      expect(corner?.otherWallIds).toEqual([wallId3, wallId4])
    })

    it('should not add duplicate walls', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2, [wallId3])

      store.addWallToCorner(pointId1, wallId3) // Already exists

      const corner = store.corners.get(pointId1)
      expect(corner?.otherWallIds).toEqual([wallId3]) // Should remain unchanged
    })

    it('should not add main walls to other walls', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2)
      const originalCorner = store.corners.get(pointId1)

      store.addWallToCorner(pointId1, wallId1) // Try to add main wall

      const corner = store.corners.get(pointId1)
      expect(corner).toEqual(originalCorner) // Should remain unchanged
    })

    it('should do nothing if corner does not exist', () => {
      store.addWallToCorner(pointId1, wallId1)
      expect(store.corners.size).toBe(0)
    })
  })

  describe('removeWallFromCorner', () => {
    it('should remove wall from other walls', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2, [wallId3, wallId4])

      store.removeWallFromCorner(pointId1, wallId3)

      const corner = store.corners.get(pointId1)
      expect(corner?.otherWallIds).toEqual([wallId4])
    })

    it('should promote other wall to main when removing wall1', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2, [wallId3])

      store.removeWallFromCorner(pointId1, wallId1)

      const corner = store.corners.get(pointId1)
      expect(corner?.wall1Id).toBe(wallId3) // Promoted from other
      expect(corner?.wall2Id).toBe(wallId2)
      expect(corner?.otherWallIds).toBeUndefined()
    })

    it('should promote other wall to main when removing wall2', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2, [wallId3])

      store.removeWallFromCorner(pointId1, wallId2)

      const corner = store.corners.get(pointId1)
      expect(corner?.wall1Id).toBe(wallId1)
      expect(corner?.wall2Id).toBe(wallId3) // Promoted from other
      expect(corner?.otherWallIds).toBeUndefined()
    })

    it('should remove corner when only two walls remain and one is removed', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2)
      expect(store.corners.size).toBe(1)

      store.removeWallFromCorner(pointId1, wallId1)

      expect(store.corners.size).toBe(0) // Corner should be removed
    })

    it('should do nothing if corner does not exist', () => {
      store.removeWallFromCorner(pointId1, wallId1)
      expect(store.corners.size).toBe(0)
    })
  })

  describe('getCorner', () => {
    it('should return existing corner', () => {
      const addedCorner = store.addCorner(pointId1, floorId1, wallId1, wallId2)
      const retrievedCorner = store.getCorner(pointId1)

      expect(retrievedCorner).toBe(addedCorner)
    })

    it('should return null for non-existent corner', () => {
      const corner = store.getCorner(pointId1)
      expect(corner).toBeNull()
    })
  })

  describe('getAllCorners', () => {
    it('should return empty array when no corners', () => {
      const corners = store.getAllCorners()
      expect(corners).toEqual([])
    })

    it('should return all corners', () => {
      store.addCorner(pointId1, floorId1, wallId1, wallId2)
      store.addCorner(pointId2, floorId2, wallId3, wallId4)

      const corners = store.getAllCorners()
      expect(corners.length).toBe(2)
      expect(corners.some(c => c.pointId === pointId1)).toBe(true)
      expect(corners.some(c => c.pointId === pointId2)).toBe(true)
    })
  })

  describe('getCornersByFloor', () => {
    beforeEach(() => {
      // Add corners on different floors
      store.addCorner(pointId1, floorId1, wallId1, wallId2)
      store.addCorner(pointId2, floorId1, wallId3, wallId4)
      store.addCorner('point_3' as PointId, floorId2, 'wall_5' as WallId, 'wall_6' as WallId)
    })

    it('should return corners for a specific floor', () => {
      const floor1Corners = store.getCornersByFloor(floorId1)
      expect(floor1Corners.length).toBe(2)
      expect(floor1Corners.every(c => c.floorId === floorId1)).toBe(true)
      expect(floor1Corners.some(c => c.pointId === pointId1)).toBe(true)
      expect(floor1Corners.some(c => c.pointId === pointId2)).toBe(true)
    })

    it('should return corners for another floor', () => {
      const floor2Corners = store.getCornersByFloor(floorId2)
      expect(floor2Corners.length).toBe(1)
      expect(floor2Corners[0].floorId).toBe(floorId2)
      expect(floor2Corners[0].pointId).toBe('point_3' as PointId)
    })

    it('should return empty array for floor with no corners', () => {
      const nonExistentFloorCorners = store.getCornersByFloor('non_existent_floor' as FloorId)
      expect(nonExistentFloorCorners).toEqual([])
    })

    it('should return all corners when there are multiple floors', () => {
      const allCorners = store.getAllCorners()
      const floor1Corners = store.getCornersByFloor(floorId1)
      const floor2Corners = store.getCornersByFloor(floorId2)
      
      expect(allCorners.length).toBe(3)
      expect(floor1Corners.length + floor2Corners.length).toBe(3)
    })

    it('should filter correctly when corners are added and removed', () => {
      // Initially floor1 should have 2 corners
      expect(store.getCornersByFloor(floorId1).length).toBe(2)

      // Remove one corner from floor1
      store.removeCorner(pointId1)
      expect(store.getCornersByFloor(floorId1).length).toBe(1)

      // Add a new corner to floor1
      store.addCorner('point_4' as PointId, floorId1, 'wall_7' as WallId, 'wall_8' as WallId)
      expect(store.getCornersByFloor(floorId1).length).toBe(2)

      // Floor2 should still have 1 corner
      expect(store.getCornersByFloor(floorId2).length).toBe(1)
    })
  })
})