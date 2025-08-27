import type { StateCreator } from 'zustand'
import type { PointId, WallId } from '@/types/ids'
import type { WallsSlice } from './wallsSlice'
import type { PointsSlice } from './pointsSlice'
import { distance, type Length } from '@/types/geometry'

export interface WallsPointsActions {
  getWallLength: (wallId: WallId) => Length
  mergePoints: (sourcePointId: PointId, targetPointId: PointId) => void
}

export type WallsPointsSlice = WallsPointsActions

export const createWallsPointsSlice: StateCreator<
  WallsSlice & PointsSlice,
  [],
  [],
  WallsPointsSlice
> = (set, get) => ({

  getWallLength: (wallId: WallId): Length => {
    const state = get()
    const wall = state.getWallById(wallId)
    if (wall == null) return 0 as Length

    const startPoint = state.getPointById(wall.startPointId)
    const endPoint = state.getPointById(wall.endPointId)
    if (startPoint == null || endPoint == null) return 0 as Length

    return distance(startPoint.position, endPoint.position)
  },
  
  // Merge two points, updating all walls that reference the source point
  mergePoints: (sourcePointId: PointId, targetPointId: PointId) => {
    const state = get()
    const sourcePoint = state.getPointById(sourcePointId)
    const targetPoint = state.getPointById(targetPointId)
    
    if (sourcePoint == null || targetPoint == null) return
    if (sourcePointId === targetPointId) return

    if (sourcePoint.floorId !== targetPoint.floorId) {
      throw new Error('Cannot merge points on different floors')
    }
    
    // Find all walls connected to the source point
    const connectedWalls = state.getWallsConnectedToPoint(sourcePointId, sourcePoint.floorId)
    
    // Track walls to remove (degenerate and duplicates)
    const wallsToRemove: Set<WallId> = new Set()
    
    // Update each wall to reference the target point instead
    for (const wall of connectedWalls) {
      let updatedWall = { ...wall }
      
      if (wall.startPointId === sourcePointId) {
        updatedWall.startPointId = targetPointId
      }
      if (wall.endPointId === sourcePointId) {
        updatedWall.endPointId = targetPointId
      }
      
      // Check for degenerate wall (same start and end point)
      if (updatedWall.startPointId === updatedWall.endPointId) {
        wallsToRemove.add(wall.id)
        continue
      }
      
      // Check for duplicate walls
      const existingWalls = state.getWalls()
      for (const existingWall of existingWalls) {
        if (existingWall.id === wall.id) continue // Skip the current wall
        
        // Check if this wall duplicates an existing wall (same endpoints in either direction)
        const sameDirection = (updatedWall.startPointId === existingWall.startPointId && 
                              updatedWall.endPointId === existingWall.endPointId)
        const reverseDirection = (updatedWall.startPointId === existingWall.endPointId && 
                                 updatedWall.endPointId === existingWall.startPointId)
        
        if (sameDirection || reverseDirection) {
          wallsToRemove.add(wall.id)
          break
        }
      }
      
      // Update the wall if it's not being removed
      if (!wallsToRemove.has(wall.id)) {
        set(state => {
          const newWalls = new Map(state.walls)
          newWalls.set(wall.id, updatedWall)
          return { walls: newWalls }
        })
      }
    }
    
    // Remove degenerate and duplicate walls
    for (const wallId of wallsToRemove) {
      state.removeWall(wallId)
    }
    
    // Transfer room associations from source to target
    for (const roomId of sourcePoint.roomIds) {
      state.addRoomToPoint(targetPointId, roomId)
    }
    
    // Remove the source point
    state.removePoint(sourcePointId)
  },
})