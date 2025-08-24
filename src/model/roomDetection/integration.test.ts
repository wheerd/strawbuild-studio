import { describe, it, expect } from 'vitest'
import { useModelStore } from '../store'
import { createPoint2D, createLength } from '@/types/geometry'
import { createFloorLevel } from '@/types/model'

describe('Room Detection Integration', () => {
  describe('Store integration', () => {
    it('should integrate with store methods', () => {
      // Reset store to clean state
      useModelStore.getState().reset()
      
      // Verify service is available
      const service = useModelStore.getState().getRoomDetectionService()
      expect(service).toBeDefined()
      expect(typeof service.detectRooms).toBe('function')
      expect(typeof service.handleWallAddition).toBe('function')
      expect(typeof service.handleWallRemoval).toBe('function')
      expect(typeof service.validateRoomConsistency).toBe('function')
    })

    it('should detect rooms when walls form complete loops', () => {
      // Reset store to clean state
      useModelStore.getState().reset()
      
      const initialState = useModelStore.getState()
      const floorId = Array.from(initialState.floors.keys())[0]
      
      // Add points for a rectangle
      const point1 = useModelStore.getState().addPoint(createPoint2D(0, 0), floorId)
      const point2 = useModelStore.getState().addPoint(createPoint2D(1000, 0), floorId)
      const point3 = useModelStore.getState().addPoint(createPoint2D(1000, 1000), floorId)
      const point4 = useModelStore.getState().addPoint(createPoint2D(0, 1000), floorId)
      
      // Add walls forming a rectangle
      const wall1 = useModelStore.getState().addWall(
        point1.id, point2.id, floorId, 
        createLength(3000), createLength(3000), createLength(200)
      )
      const wall2 = useModelStore.getState().addWall(
        point2.id, point3.id, floorId, 
        createLength(3000), createLength(3000), createLength(200)
      )
      const wall3 = useModelStore.getState().addWall(
        point3.id, point4.id, floorId, 
        createLength(3000), createLength(3000), createLength(200)
      )
      const wall4 = useModelStore.getState().addWall(
        point4.id, point1.id, floorId, 
        createLength(3000), createLength(3000), createLength(200)
      )
      
      // Detect rooms using the service
      useModelStore.getState().detectAndUpdateRooms(floorId)
      
      const finalState = useModelStore.getState()
      const floor = finalState.floors.get(floorId)
      
      // Should have detected and created a room
      expect(floor?.roomIds.length).toBeGreaterThan(0)
      
      if (floor != null && floor.roomIds.length > 0) {
        const room = finalState.rooms.get(floor.roomIds[0])
        expect(room).toBeDefined()
        expect(room?.wallIds.size).toBe(4)
        expect(room?.wallIds.has(wall1.id)).toBe(true)
        expect(room?.wallIds.has(wall2.id)).toBe(true)
        expect(room?.wallIds.has(wall3.id)).toBe(true)
        expect(room?.wallIds.has(wall4.id)).toBe(true)
      }
    })

    it('should validate room consistency', () => {
      // Reset store to clean state
      useModelStore.getState().reset()
      
      const initialState = useModelStore.getState()
      const floorId = Array.from(initialState.floors.keys())[0]
      
      // Create a simple valid room setup
      const point1 = useModelStore.getState().addPoint(createPoint2D(0, 0), floorId)
      const point2 = useModelStore.getState().addPoint(createPoint2D(1000, 0), floorId)
      const point3 = useModelStore.getState().addPoint(createPoint2D(1000, 1000), floorId)
      const point4 = useModelStore.getState().addPoint(createPoint2D(0, 1000), floorId)
      
      const wall1 = useModelStore.getState().addWall(point1.id, point2.id, floorId)
      const wall2 = useModelStore.getState().addWall(point2.id, point3.id, floorId)
      const wall3 = useModelStore.getState().addWall(point3.id, point4.id, floorId)
      const wall4 = useModelStore.getState().addWall(point4.id, point1.id, floorId)
      
      const room = useModelStore.getState().addRoom(
        'Test Room', 
        floorId, 
        [wall1.id, wall2.id, wall3.id, wall4.id], 
        [point1.id, point2.id, point3.id, point4.id]
      )
      
      // Validate consistency
      const service = useModelStore.getState().getRoomDetectionService()
      const state = useModelStore.getState()
      const validation = service.validateRoomConsistency(state, floorId)
      
      expect(validation.validRooms).toContain(room.id)
      expect(validation.invalidRooms).toHaveLength(0)
      expect(validation.orphanedWalls).toHaveLength(0)
      expect(validation.orphanedPoints).toHaveLength(0)
    })
  })

  describe('Complex scenarios', () => {
    it('should handle multiple floors', () => {
      // Reset store to clean state
      useModelStore.getState().reset()
      
      // Create additional floor
      const floor2 = useModelStore.getState().addFloor('Second Floor', createFloorLevel(1))
      
      const initialState = useModelStore.getState()
      const floor1Id = Array.from(initialState.floors.keys())[0]
      
      // Should be able to detect rooms on different floors independently
      const service = useModelStore.getState().getRoomDetectionService()
      const state = useModelStore.getState()
      
      const floor1Result = service.detectRooms(state, floor1Id)
      const floor2Result = service.detectRooms(state, floor2.id)
      
      expect(floor1Result).toBeDefined()
      expect(floor2Result).toBeDefined()
      
      // Both should return empty results for empty floors
      expect(floor1Result.roomsToCreate).toHaveLength(0)
      expect(floor2Result.roomsToCreate).toHaveLength(0)
    })

    it('should handle complex room splitting scenario', () => {
      // This would be a more complex integration test
      // For now, just verify the service methods work together
      useModelStore.getState().reset()
      
      const service = useModelStore.getState().getRoomDetectionService()
      const state = useModelStore.getState()
      const floorId = Array.from(state.floors.keys())[0]
      
      // Test that service methods can be called without errors
      const detectionResult = service.detectRooms(state, floorId)
      const validationResult = service.validateRoomConsistency(state, floorId)
      
      expect(detectionResult).toBeDefined()
      expect(validationResult).toBeDefined()
    })
  })

  describe('Service configuration', () => {
    it('should allow access to configured service', () => {
      const service = useModelStore.getState().getRoomDetectionService()
      
      // Test that we can call all service methods
      expect(typeof service.detectRooms).toBe('function')
      expect(typeof service.handleWallAddition).toBe('function')
      expect(typeof service.handleWallRemoval).toBe('function')
      expect(typeof service.validateRoomConsistency).toBe('function')
    })
  })

  describe('Error handling', () => {
    it('should handle invalid floor IDs gracefully', () => {
      const service = useModelStore.getState().getRoomDetectionService()
      const state = useModelStore.getState()
      
      const result = service.detectRooms(state, 'invalid-floor-id' as any)
      expect(result.roomsToCreate).toHaveLength(0)
      expect(result.roomsToUpdate).toHaveLength(0)
      expect(result.roomsToDelete).toHaveLength(0)
    })

    it('should handle invalid wall IDs gracefully', () => {
      const service = useModelStore.getState().getRoomDetectionService()
      const state = useModelStore.getState()
      const floorId = Array.from(state.floors.keys())[0]
      
      const addResult = service.handleWallAddition(state, 'invalid-wall-id' as any, floorId)
      expect(addResult.roomsToCreate).toHaveLength(0)
      
      const removeResult = service.handleWallRemoval(state, 'invalid-wall-id' as any, floorId)
      expect(removeResult.roomsToCreate).toHaveLength(0)
    })
  })
})