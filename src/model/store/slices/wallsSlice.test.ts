import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createWallsSlice, type WallsSlice } from './wallsSlice'
import { createWallId, createPointId, createRoomId } from '@/types/ids'
import { createLength } from '@/types/geometry'

// Mock Zustand following the official testing guide
vi.mock('zustand')

describe('WallsSlice', () => {
  let store: WallsSlice
  let mockSet: any
  let mockGet: any

  beforeEach(() => {
    // Create the slice directly without using create()
    mockSet = vi.fn()
    mockGet = vi.fn()
    const mockStore = {} as any

    store = createWallsSlice(mockSet, mockGet, mockStore)

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

  describe('addOuterWall', () => {
    it('should add an outer wall with correct properties', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const wall = store.addOuterWall(startPoint, endPoint, 'left')

      expect(store.walls.size).toBe(1)
      expect(store.walls.has(wall.id)).toBe(true)

      const addedWall = store.walls.get(wall.id)
      expect(addedWall).toBeDefined()
      expect(addedWall?.startPointId).toBe(startPoint)
      expect(addedWall?.endPointId).toBe(endPoint)
      expect(addedWall?.type).toBe('outer')
      expect(addedWall?.outsideDirection).toBe('left')
      expect(addedWall?.thickness).toBe(createLength(440)) // Default outer wall thickness

      // Should return the wall
      expect(wall.startPointId).toBe(startPoint)
      expect(wall.endPointId).toBe(endPoint)
      expect(wall.type).toBe('outer')
      expect(wall.outsideDirection).toBe('left')
    })

    it('should add outer wall with custom thickness', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const customThickness = createLength(250)
      const wall = store.addOuterWall(startPoint, endPoint, 'right', customThickness)

      const addedWall = store.walls.get(wall.id)
      expect(addedWall?.thickness).toBe(customThickness)
      expect(addedWall?.outsideDirection).toBe('right')
    })

    it('should throw error for same start and end points', () => {
      const pointId = createPointId()
      expect(() => store.addOuterWall(pointId, pointId, 'left')).toThrow('Wall start and end points cannot be the same')
    })

    it('should throw error for invalid thickness', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      expect(() => store.addOuterWall(startPoint, endPoint, 'left', createLength(0))).toThrow('Wall thickness must be greater than 0')
      expect(() => store.addOuterWall(startPoint, endPoint, 'left', createLength(-100))).toThrow('Wall thickness must be greater than 0')
    })
  })

  describe('addStructuralWall', () => {
    it('should add a structural wall with correct properties', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const wall = store.addStructuralWall(startPoint, endPoint)

      expect(store.walls.size).toBe(1)
      expect(store.walls.has(wall.id)).toBe(true)

      const addedWall = store.walls.get(wall.id)
      expect(addedWall).toBeDefined()
      expect(addedWall?.startPointId).toBe(startPoint)
      expect(addedWall?.endPointId).toBe(endPoint)
      expect(addedWall?.type).toBe('structural')
      expect(addedWall?.outsideDirection).toBeUndefined()
      expect(addedWall?.thickness).toBe(createLength(220)) // Default structural wall thickness
    })

    it('should add structural wall with custom thickness', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const customThickness = createLength(300)
      const wall = store.addStructuralWall(startPoint, endPoint, customThickness)

      const addedWall = store.walls.get(wall.id)
      expect(addedWall?.thickness).toBe(customThickness)
    })

    it('should throw error for invalid thickness', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      expect(() => store.addStructuralWall(startPoint, endPoint, createLength(0))).toThrow('Wall thickness must be greater than 0')
      expect(() => store.addStructuralWall(startPoint, endPoint, createLength(-50))).toThrow('Wall thickness must be greater than 0')
    })
  })

  describe('addPartitionWall', () => {
    it('should add a partition wall with correct properties', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const wall = store.addPartitionWall(startPoint, endPoint)

      expect(store.walls.size).toBe(1)
      expect(store.walls.has(wall.id)).toBe(true)

      const addedWall = store.walls.get(wall.id)
      expect(addedWall).toBeDefined()
      expect(addedWall?.startPointId).toBe(startPoint)
      expect(addedWall?.endPointId).toBe(endPoint)
      expect(addedWall?.type).toBe('partition')
      expect(addedWall?.outsideDirection).toBeUndefined()
      expect(addedWall?.thickness).toBe(createLength(180)) // Default partition wall thickness
    })

    it('should throw error for invalid thickness', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      expect(() => store.addPartitionWall(startPoint, endPoint, createLength(0))).toThrow('Wall thickness must be greater than 0')
      expect(() => store.addPartitionWall(startPoint, endPoint, createLength(-25))).toThrow('Wall thickness must be greater than 0')
    })
  })

  describe('addOtherWall', () => {
    it('should add an other type wall with correct properties', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const wall = store.addOtherWall(startPoint, endPoint)

      expect(store.walls.size).toBe(1)
      expect(store.walls.has(wall.id)).toBe(true)

      const addedWall = store.walls.get(wall.id)
      expect(addedWall).toBeDefined()
      expect(addedWall?.startPointId).toBe(startPoint)
      expect(addedWall?.endPointId).toBe(endPoint)
      expect(addedWall?.type).toBe('other')
      expect(addedWall?.outsideDirection).toBeUndefined()
      expect(addedWall?.thickness).toBe(createLength(200)) // Default other wall thickness
    })

    it('should throw error for invalid thickness', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      expect(() => store.addOtherWall(startPoint, endPoint, createLength(0))).toThrow('Wall thickness must be greater than 0')
      expect(() => store.addOtherWall(startPoint, endPoint, createLength(-75))).toThrow('Wall thickness must be greater than 0')
    })
  })

  describe('removeWall', () => {
    it('should remove an existing wall', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const wall = store.addOuterWall(startPoint, endPoint, 'left')
      expect(store.walls.size).toBe(1)

      store.removeWall(wall.id)

      expect(store.walls.size).toBe(0)
      expect(store.walls.has(wall.id)).toBe(false)
    })

    it('should handle removing non-existent wall gracefully', () => {
      const initialSize = store.walls.size
      const fakeWallId = createWallId()

      store.removeWall(fakeWallId)

      expect(store.walls.size).toBe(initialSize)
    })
  })

  describe('updateWallType', () => {
    it('should update wall type', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const wall = store.addOuterWall(startPoint, endPoint, 'left')

      store.updateWallType(wall.id, 'structural')

      const updatedWall = store.walls.get(wall.id)
      expect(updatedWall?.type).toBe('structural')
    })

    it('should preserve other properties when updating type', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const wall = store.addPartitionWall(startPoint, endPoint)

      store.updateWallType(wall.id, 'other')

      const updatedWall = store.walls.get(wall.id)
      expect(updatedWall?.type).toBe('other')
      expect(updatedWall?.startPointId).toBe(startPoint) // Other properties unchanged
      expect(updatedWall?.endPointId).toBe(endPoint)
    })

    it('should do nothing if wall does not exist', () => {
      const initialWalls = new Map(store.walls)
      const fakeWallId = createWallId()

      store.updateWallType(fakeWallId, 'structural')

      expect(store.walls).toEqual(initialWalls)
    })
  })

  describe('updateWallOutsideDirection', () => {
    it('should update outside direction', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const wall = store.addOuterWall(startPoint, endPoint, 'left')

      store.updateWallOutsideDirection(wall.id, 'right')

      const updatedWall = store.walls.get(wall.id)
      expect(updatedWall?.outsideDirection).toBe('right')
    })

    it('should remove outside direction when set to null', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const wall = store.addOuterWall(startPoint, endPoint, 'left')

      store.updateWallOutsideDirection(wall.id, null)

      const updatedWall = store.walls.get(wall.id)
      expect(updatedWall?.outsideDirection).toBeUndefined()
    })
  })

  describe('updateWallThickness', () => {
    it('should update wall thickness', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const wall = store.addOuterWall(startPoint, endPoint, 'left')

      const newThickness = createLength(300)
      store.updateWallThickness(wall.id, newThickness)

      const updatedWall = store.walls.get(wall.id)
      expect(updatedWall?.thickness).toBe(newThickness)
    })

    it('should throw error for invalid thickness', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const wall = store.addOuterWall(startPoint, endPoint, 'left')

      expect(() => store.updateWallThickness(wall.id, createLength(0))).toThrow('Wall thickness must be greater than 0')
      expect(() => store.updateWallThickness(wall.id, createLength(-100))).toThrow('Wall thickness must be greater than 0')
    })
  })

  describe('opening operations', () => {
    describe('addDoorToWall', () => {
      it('should add a door opening to wall', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        store.addDoorToWall(wall.id, createLength(500), createLength(800), createLength(2100))

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.openings).toHaveLength(1)
        expect(updatedWall?.openings![0]).toEqual({
          type: 'door',
          offsetFromStart: createLength(500),
          width: createLength(800),
          height: createLength(2100)
        })
      })

      it('should add multiple openings to wall', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        store.addDoorToWall(wall.id, createLength(500), createLength(800), createLength(2100))
        store.addDoorToWall(wall.id, createLength(2000), createLength(900), createLength(2100))

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.openings).toHaveLength(2)
      })

      it('should throw error for invalid parameters', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        expect(() => store.addDoorToWall(wall.id, createLength(-100), createLength(800), createLength(2100))).toThrow('Opening offset from start must be non-negative')
        expect(() => store.addDoorToWall(wall.id, createLength(500), createLength(0), createLength(2100))).toThrow('Opening width must be greater than 0')
        expect(() => store.addDoorToWall(wall.id, createLength(500), createLength(800), createLength(0))).toThrow('Opening height must be greater than 0')
      })
    })

    describe('addWindowToWall', () => {
      it('should add a window opening to wall', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        store.addWindowToWall(wall.id, createLength(1000), createLength(1200), createLength(1000), createLength(900))

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.openings).toHaveLength(1)
        expect(updatedWall?.openings![0]).toEqual({
          type: 'window',
          offsetFromStart: createLength(1000),
          width: createLength(1200),
          height: createLength(1000),
          sillHeight: createLength(900)
        })
      })

      it('should throw error for negative sill height', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        expect(() => store.addWindowToWall(wall.id, createLength(1000), createLength(1200), createLength(1000), createLength(-100))).toThrow('Window sill height must be non-negative')
      })
    })

    describe('addPassageToWall', () => {
      it('should add a passage opening to wall', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        store.addPassageToWall(wall.id, createLength(750), createLength(1000), createLength(2100))

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.openings).toHaveLength(1)
        expect(updatedWall?.openings![0]).toEqual({
          type: 'passage',
          offsetFromStart: createLength(750),
          width: createLength(1000),
          height: createLength(2100)
        })
      })
    })

    describe('removeOpeningFromWall', () => {
      it('should remove opening at valid index', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        store.addDoorToWall(wall.id, createLength(500), createLength(800), createLength(2100))
        store.addWindowToWall(wall.id, createLength(1000), createLength(1200), createLength(1000), createLength(900))

        store.removeOpeningFromWall(wall.id, 0) // Remove first opening

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.openings).toHaveLength(1)
        expect(updatedWall?.openings![0].type).toBe('window')
      })

      it('should handle invalid index gracefully', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        store.addDoorToWall(wall.id, createLength(500), createLength(800), createLength(2100))

        // Try to remove invalid indices
        store.removeOpeningFromWall(wall.id, -1)
        store.removeOpeningFromWall(wall.id, 5)

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.openings).toHaveLength(1) // Should remain unchanged
      })

      it('should clear openings array when removing last opening', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        store.addDoorToWall(wall.id, createLength(500), createLength(800), createLength(2100))
        store.removeOpeningFromWall(wall.id, 0)

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.openings).toBeUndefined()
      })
    })
  })

  describe('touch operations', () => {
    describe('updateWallStartTouches', () => {
      it('should update start touches', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        const touchWallId = createWallId()
        store.updateWallStartTouches(wall.id, touchWallId)

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.startTouches).toBe(touchWallId)
      })

      it('should clear start touches when set to null', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        const touchWallId = createWallId()
        store.updateWallStartTouches(wall.id, touchWallId)
        store.updateWallStartTouches(wall.id, null)

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.startTouches).toBeUndefined()
      })
    })

    describe('updateWallEndTouches', () => {
      it('should update end touches', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        const touchPointId = createPointId()
        store.updateWallEndTouches(wall.id, touchPointId)

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.endTouches).toBe(touchPointId)
      })
    })

    describe('addWallTouchedBy', () => {
      it('should add wall to touchedBy array', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        const touchingWallId = createWallId()
        store.addWallTouchedBy(wall.id, touchingWallId)

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.touchedBy).toEqual([touchingWallId])
      })

      it('should not add duplicate walls', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        const touchingWallId = createWallId()
        store.addWallTouchedBy(wall.id, touchingWallId)
        store.addWallTouchedBy(wall.id, touchingWallId) // Add same wall again

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.touchedBy).toEqual([touchingWallId]) // Should not duplicate
      })
    })

    describe('removeWallTouchedBy', () => {
      it('should remove wall from touchedBy array', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        const touchingWall1 = createWallId()
        const touchingWall2 = createWallId()
        store.addWallTouchedBy(wall.id, touchingWall1)
        store.addWallTouchedBy(wall.id, touchingWall2)

        store.removeWallTouchedBy(wall.id, touchingWall1)

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.touchedBy).toEqual([touchingWall2])
      })

      it('should clear touchedBy when removing last wall', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        const touchingWallId = createWallId()
        store.addWallTouchedBy(wall.id, touchingWallId)
        store.removeWallTouchedBy(wall.id, touchingWallId)

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.touchedBy).toBeUndefined()
      })
    })
  })

  describe('room operations', () => {
    describe('updateWallLeftRoom', () => {
      it('should update left room', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        const roomId = createRoomId()
        store.updateWallLeftRoom(wall.id, roomId)

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.leftRoomId).toBe(roomId)
      })

      it('should clear left room when set to null', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        const roomId = createRoomId()
        store.updateWallLeftRoom(wall.id, roomId)
        store.updateWallLeftRoom(wall.id, null)

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.leftRoomId).toBeUndefined()
      })
    })

    describe('updateWallRightRoom', () => {
      it('should update right room', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const wall = store.addOuterWall(startPoint, endPoint, 'left')

        const roomId = createRoomId()
        store.updateWallRightRoom(wall.id, roomId)

        const updatedWall = store.walls.get(wall.id)
        expect(updatedWall?.rightRoomId).toBe(roomId)
      })
    })
  })

  describe('getter operations', () => {
    describe('getWallById', () => {
      it('should return existing wall', () => {
        const startPoint = createPointId()
        const endPoint = createPointId()
        const addedWall = store.addOuterWall(startPoint, endPoint, 'left')

        const result = store.getWallById(addedWall.id)

        expect(result).toBeDefined()
        expect(result?.id).toBe(addedWall.id)
        expect(result).toEqual(addedWall)
      })

      it('should return null for non-existent wall', () => {
        const fakeWallId = createWallId()
        const result = store.getWallById(fakeWallId)
        expect(result).toBeNull()
      })
    })

    describe('getWalls', () => {
      it('should return empty array when no walls', () => {
        const walls = store.getWalls()
        expect(walls).toEqual([])
      })

      it('should return all walls', () => {
        const startPoint1 = createPointId()
        const endPoint1 = createPointId()
        const startPoint2 = createPointId()
        const endPoint2 = createPointId()

        const wall1 = store.addOuterWall(startPoint1, endPoint1, 'left')
        const wall2 = store.addStructuralWall(startPoint2, endPoint2)

        const walls = store.getWalls()
        expect(walls).toHaveLength(2)
        expect(walls).toContain(wall1)
        expect(walls).toContain(wall2)
      })
    })

    describe('getWallsByType', () => {
      it('should return walls of specific type', () => {
        const startPoint1 = createPointId()
        const endPoint1 = createPointId()
        const startPoint2 = createPointId()
        const endPoint2 = createPointId()
        const startPoint3 = createPointId()
        const endPoint3 = createPointId()

        const outerWall = store.addOuterWall(startPoint1, endPoint1, 'left')
        const structuralWall = store.addStructuralWall(startPoint2, endPoint2)
        const partitionWall = store.addPartitionWall(startPoint3, endPoint3)

        const outerWalls = store.getWallsByType('outer')
        const structuralWalls = store.getWallsByType('structural')
        const partitionWalls = store.getWallsByType('partition')
        const otherWalls = store.getWallsByType('other')

        expect(outerWalls).toEqual([outerWall])
        expect(structuralWalls).toEqual([structuralWall])
        expect(partitionWalls).toEqual([partitionWall])
        expect(otherWalls).toEqual([])
      })
    })

    describe('getWallsConnectedToPoint', () => {
      it('should return walls connected to a point', () => {
        const sharedPoint = createPointId()
        const endPoint1 = createPointId()
        const endPoint2 = createPointId()
        const isolatedPoint1 = createPointId()
        const isolatedPoint2 = createPointId()

        const wall1 = store.addOuterWall(sharedPoint, endPoint1, 'left')
        const wall2 = store.addStructuralWall(sharedPoint, endPoint2)
        const isolatedWall = store.addPartitionWall(isolatedPoint1, isolatedPoint2)

        const connectedWalls = store.getWallsConnectedToPoint(sharedPoint)
        const isolatedWalls = store.getWallsConnectedToPoint(createPointId())

        expect(connectedWalls).toHaveLength(2)
        expect(connectedWalls).toContain(wall1)
        expect(connectedWalls).toContain(wall2)
        expect(connectedWalls).not.toContain(isolatedWall)
        expect(isolatedWalls).toEqual([])
      })
    })
  })

  describe('complex scenarios', () => {
    it('should handle complex wall management correctly', () => {
      // Create multiple walls with different types
      const point1 = createPointId()
      const point2 = createPointId()
      const point3 = createPointId()

      const outerWall = store.addOuterWall(point1, point2, 'left')
      const partitionWall = store.addPartitionWall(point2, point3)

      // Add openings
      store.addDoorToWall(outerWall.id, createLength(500), createLength(800), createLength(2100))
      store.addWindowToWall(outerWall.id, createLength(2000), createLength(1200), createLength(1000), createLength(900))

      // Add touches and rooms
      const touchWallId = createWallId()
      const roomId1 = createRoomId()
      const roomId2 = createRoomId()

      store.addWallTouchedBy(outerWall.id, touchWallId)
      store.updateWallLeftRoom(outerWall.id, roomId1)
      store.updateWallRightRoom(partitionWall.id, roomId2)

      // Verify complex state
      let updatedOuterWall = store.walls.get(outerWall.id)
      const updatedPartitionWall = store.walls.get(partitionWall.id)

      expect(updatedOuterWall?.openings).toHaveLength(2)
      expect(updatedOuterWall?.touchedBy).toEqual([touchWallId])
      expect(updatedOuterWall?.leftRoomId).toBe(roomId1)
      expect(updatedPartitionWall?.rightRoomId).toBe(roomId2)

      // Update wall type and verify properties change
      store.updateWallType(outerWall.id, 'structural')
      updatedOuterWall = store.walls.get(outerWall.id)
      expect(updatedOuterWall?.type).toBe('structural')
      expect(updatedOuterWall?.outsideDirection).toBeUndefined() // Should be removed

      // Verify state consistency
      expect(store.walls.size).toBe(2)
      const allWalls = store.getWalls()
      expect(allWalls).toHaveLength(2)

      // Test filtering by type
      const structuralWalls = store.getWallsByType('structural')
      const partitionWalls = store.getWallsByType('partition')
      expect(structuralWalls).toHaveLength(1)
      expect(partitionWalls).toHaveLength(1)

      // Test point connections
      const wallsOnPoint2 = store.getWallsConnectedToPoint(point2)
      expect(wallsOnPoint2).toHaveLength(2)
    })

    it('should maintain data consistency after multiple operations', () => {
      const startPoint = createPointId()
      const endPoint = createPointId()
      const wall = store.addOuterWall(startPoint, endPoint, 'left', createLength(250))

      // Add openings
      store.addDoorToWall(wall.id, createLength(500), createLength(800), createLength(2100))
      store.addWindowToWall(wall.id, createLength(2000), createLength(1200), createLength(1000), createLength(900))

      // Add touches and rooms
      const touchWall1 = createWallId()
      const touchWall2 = createWallId()
      const roomId = createRoomId()

      store.addWallTouchedBy(wall.id, touchWall1)
      store.addWallTouchedBy(wall.id, touchWall2)
      store.updateWallLeftRoom(wall.id, roomId)
      store.updateWallStartTouches(wall.id, startPoint)

      // Update thickness
      const newThickness = createLength(300)
      store.updateWallThickness(wall.id, newThickness)

      // Remove one opening
      store.removeOpeningFromWall(wall.id, 0)

      // Remove one touched by wall
      store.removeWallTouchedBy(wall.id, touchWall1)

      const finalWall = store.walls.get(wall.id)
      expect(finalWall?.thickness).toBe(newThickness)
      expect(finalWall?.openings).toHaveLength(1)
      expect(finalWall?.openings![0].type).toBe('window')
      expect(finalWall?.touchedBy).toEqual([touchWall2])
      expect(finalWall?.leftRoomId).toBe(roomId)
      expect(finalWall?.startTouches).toBe(startPoint)
      expect(finalWall?.id).toBe(wall.id)
      expect(finalWall?.type).toBe('outer')
      expect(finalWall?.outsideDirection).toBe('left')
    })
  })
})
