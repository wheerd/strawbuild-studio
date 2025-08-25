import type { StateCreator } from 'zustand'
import type { WallId, PointId } from '@/types/ids'
import type { Corner } from '@/types/model'

export interface CornersState {
  corners: Map<PointId, Corner>
}

// Corners-specific actions
export interface CornersActions {
  addCorner: (pointId: PointId, wall1Id: WallId, wall2Id: WallId, otherWallIds?: WallId[]) => Corner
  removeCorner: (pointId: PointId) => void
  
  // Corner modifications
  updateCornerMainWalls: (pointId: PointId, newWall1Id: WallId, newWall2Id: WallId) => void
  addWallToCorner: (pointId: PointId, wallId: WallId) => void
  removeWallFromCorner: (pointId: PointId, wallId: WallId) => void
  
  // Corner queries
  getCorner: (pointId: PointId) => Corner | null
  getAllCorners: () => Corner[]
}

export type CornersSlice = CornersState & CornersActions

// Create the corners slice (implementation placeholder)
export const createCornersSlice: StateCreator<
  CornersSlice,
  [],
  [],
  CornersSlice
> = (set, get) => ({
  corners: new Map<PointId, Corner>(),

  addCorner: (pointId: PointId, wall1Id: WallId, wall2Id: WallId, otherWallIds?: WallId[]) => {
    // Validate that main wall IDs are distinct
    if (wall1Id === wall2Id) {
      throw new Error(`Corner main walls must be distinct, got duplicate: ${wall1Id}`)
    }
    
    // Validate that all wall IDs are distinct
    if (otherWallIds) {
      const allWallIds = [wall1Id, wall2Id, ...otherWallIds]
      const uniqueWallIds = new Set(allWallIds)
      if (uniqueWallIds.size !== allWallIds.length) {
        throw new Error(`All wall IDs must be distinct in corner`)
      }
    }
    
    const corner: Corner = {
      pointId,
      wall1Id,
      wall2Id,
      otherWallIds
    }
    
    set((state) => ({
      ...state,
      corners: new Map(state.corners).set(pointId, corner),
    }))
    
    return corner
  },

  removeCorner: (pointId: PointId) => {
    set((state) => {
      const newCorners = new Map(state.corners)
      newCorners.delete(pointId)
      return {
        ...state,
        corners: newCorners
      }
    })
  },

  updateCornerMainWalls: (pointId: PointId, newWall1Id: WallId, newWall2Id: WallId) => {
    set((state) => {
      const corner = state.corners.get(pointId)
      if (!corner) return state
      
      // Validate that new main wall IDs are distinct
      if (newWall1Id === newWall2Id) {
        console.warn(`Cannot set main walls - they must be distinct, got duplicate: ${newWall1Id}`)
        return state
      }
      
      // Get all connected walls
      const allWallIds = [corner.wall1Id, corner.wall2Id, ...(corner.otherWallIds || [])]
      
      // Validate that both new main walls are already connected to this corner
      if (!allWallIds.includes(newWall1Id) || !allWallIds.includes(newWall2Id)) {
        console.warn(`Cannot set main walls ${newWall1Id}, ${newWall2Id} - they must already be connected to corner at point ${pointId}`)
        return state
      }
      
      // Create new otherWallIds by removing the new main walls from all walls
      const newOtherWallIds = allWallIds.filter(id => id !== newWall1Id && id !== newWall2Id)
      
      const updatedCorner: Corner = {
        ...corner,
        wall1Id: newWall1Id,
        wall2Id: newWall2Id,
        otherWallIds: newOtherWallIds.length > 0 ? newOtherWallIds : undefined
      }
      
      return {
        ...state,
        corners: new Map(state.corners).set(pointId, updatedCorner)
      }
    })
  },

  addWallToCorner: (pointId: PointId, wallId: WallId) => {
    set((state) => {
      const corner = state.corners.get(pointId)
      if (!corner) return state
      
      // Cannot add a wall that is already a main wall
      if (corner.wall1Id === wallId || corner.wall2Id === wallId) {
        return state
      }
      
      // Add to otherWallIds if not already present
      const otherWallIds = corner.otherWallIds || []
      if (!otherWallIds.includes(wallId)) {
        const updatedCorner: Corner = {
          ...corner,
          otherWallIds: [...otherWallIds, wallId]
        }
        
        return {
          ...state,
          corners: new Map(state.corners).set(pointId, updatedCorner),
        }
      }
      
      return state
    })
  },

  removeWallFromCorner: (pointId: PointId, wallId: WallId) => {
    set((state) => {
      const corner = state.corners.get(pointId)
      if (!corner) return state
      
      const otherWallIds = corner.otherWallIds || []
      let newWall1Id = corner.wall1Id
      let newWall2Id = corner.wall2Id
      let newOtherWallIds = [...otherWallIds]
      
      // Handle main wall removal
      if (corner.wall1Id === wallId) {
        if (otherWallIds.length > 0) {
          // Promote first other wall to main wall
          newWall1Id = otherWallIds[0]
          newOtherWallIds = otherWallIds.slice(1)
        } else {
          // Only one wall left, remove the corner
          const newCorners = new Map(state.corners)
          newCorners.delete(pointId)
          return {
            ...state,
            corners: newCorners
          }
        }
      } else if (corner.wall2Id === wallId) {
        if (otherWallIds.length > 0) {
          // Promote first other wall to main wall
          newWall2Id = otherWallIds[0]
          newOtherWallIds = otherWallIds.slice(1)
        } else {
          // Only one wall left, remove the corner
          const newCorners = new Map(state.corners)
          newCorners.delete(pointId)
          return {
            ...state,
            corners: newCorners
          }
        }
      } else {
        // Remove from otherWallIds
        newOtherWallIds = otherWallIds.filter(id => id !== wallId)
      }
      
      const updatedCorner: Corner = {
        ...corner,
        wall1Id: newWall1Id,
        wall2Id: newWall2Id,
        otherWallIds: newOtherWallIds.length > 0 ? newOtherWallIds : undefined
      }
      
      return {
        ...state,
        corners: new Map(state.corners).set(pointId, updatedCorner)
      }
    })
  },

  getCorner: (pointId: PointId) => {
    const state = get()
    return state.corners.get(pointId) || null
  },

  getAllCorners: () => {
    const state = get()
    return Array.from(state.corners.values())
  }
})

// Selector hooks
export const useCorner = (_cornerId: PointId): Corner | undefined => {
  return undefined // Placeholder
}

export const useCornerAtPoint = (_pointId: PointId): Corner | undefined => {
  return undefined // Placeholder
}