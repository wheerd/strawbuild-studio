import type { StateCreator } from 'zustand'
import type { Wall, Opening } from '@/types/model'
import type { WallId, PointId, RoomId } from '@/types/ids'
import type { Length } from '@/types/geometry'
import { createWallId } from '@/types/ids'
import { createLength } from '@/types/geometry'

export interface WallsState {
  walls: Map<WallId, Wall>
}

export interface WallsActions {
  // CRUD operations
  addOuterWall: (startPointId: PointId, endPointId: PointId, outsideDirection: 'left' | 'right', thickness?: Length) => Wall
  addStructuralWall: (startPointId: PointId, endPointId: PointId, thickness?: Length) => Wall
  addPartitionWall: (startPointId: PointId, endPointId: PointId, thickness?: Length) => Wall
  addOtherWall: (startPointId: PointId, endPointId: PointId, thickness?: Length) => Wall
  removeWall: (wallId: WallId) => void

  updateWallType: (wallId: WallId, type: 'outer' | 'structural' | 'partition' | 'other') => void
  updateWallOutsideDirection: (wallId: WallId, outsideDirection: 'left' | 'right' | null) => void
  updateWallThickness: (wallId: WallId, thickness: Length) => void

  // Openings
  addDoorToWall: (wallId: WallId, offsetFromStart: Length, width: Length, height: Length) => void
  addWindowToWall: (wallId: WallId, offsetFromStart: Length, width: Length, height: Length, sillHeight: Length) => void
  addPassageToWall: (wallId: WallId, offsetFromStart: Length, width: Length, height: Length) => void
  removeOpeningFromWall: (wallId: WallId, openingIndex: number) => void

  // Touches
  updateWallStartTouches: (wallId: WallId, touches: WallId | PointId | null) => void
  updateWallEndTouches: (wallId: WallId, touches: WallId | PointId | null) => void
  addWallTouchedBy: (wallId: WallId, touchedByWallId: WallId) => void
  removeWallTouchedBy: (wallId: WallId, touchedByWallId: WallId) => void

  // Rooms
  updateWallLeftRoom: (wallId: WallId, roomId: RoomId | null) => void
  updateWallRightRoom: (wallId: WallId, roomId: RoomId | null) => void

  // Getters
  getWallById: (wallId: WallId) => Wall | null
  getWalls: () => Wall[]
  getWallsByType: (type: 'outer' | 'structural' | 'partition' | 'other') => Wall[]
  getWallsConnectedToPoint: (pointId: PointId) => Wall[]
}

export type WallsSlice = WallsState & WallsActions

// Default wall thickness values
const DEFAULT_OUTER_WALL_THICKNESS = createLength(440) // 44cm
const DEFAULT_STRUCTURAL_WALL_THICKNESS = createLength(220) // 22cm
const DEFAULT_PARTITION_WALL_THICKNESS = createLength(180) // 18cm
const DEFAULT_OTHER_WALL_THICKNESS = createLength(200) // 20cm

// Helper function to create a wall
const createWall = (startPointId: PointId, endPointId: PointId, type: 'outer' | 'structural' | 'partition' | 'other', thickness: Length, outsideDirection?: 'left' | 'right'): Wall => {
  if (startPointId === endPointId) {
    throw new Error('Wall start and end points cannot be the same')
  }

  if (thickness <= 0) {
    throw new Error('Wall thickness must be greater than 0')
  }

  const wall: Wall = {
    id: createWallId(),
    startPointId,
    endPointId,
    thickness,
    type,
    ...(outsideDirection !== undefined && { outsideDirection })
  }

  return wall
}

// Create the walls slice
export const createWallsSlice: StateCreator<WallsSlice, [], [], WallsSlice> = (set, get) => ({
  walls: new Map(),

  // CRUD operations
  addOuterWall: (startPointId: PointId, endPointId: PointId, outsideDirection: 'left' | 'right', thickness?: Length) => {
    const wallThickness = thickness ?? DEFAULT_OUTER_WALL_THICKNESS

    const wall = createWall(startPointId, endPointId, 'outer', wallThickness, outsideDirection)

    set(state => ({
      walls: new Map(state.walls).set(wall.id, wall)
    }))

    return wall
  },

  addStructuralWall: (startPointId: PointId, endPointId: PointId, thickness?: Length) => {
    const wallThickness = thickness ?? DEFAULT_STRUCTURAL_WALL_THICKNESS

    const wall = createWall(startPointId, endPointId, 'structural', wallThickness)

    set(state => ({
      walls: new Map(state.walls).set(wall.id, wall)
    }))

    return wall
  },

  addPartitionWall: (startPointId: PointId, endPointId: PointId, thickness?: Length) => {
    const wallThickness = thickness ?? DEFAULT_PARTITION_WALL_THICKNESS

    const wall = createWall(startPointId, endPointId, 'partition', wallThickness)

    set(state => ({
      walls: new Map(state.walls).set(wall.id, wall)
    }))

    return wall
  },

  addOtherWall: (startPointId: PointId, endPointId: PointId, thickness?: Length) => {
    const wallThickness = thickness ?? DEFAULT_OTHER_WALL_THICKNESS

    const wall = createWall(startPointId, endPointId, 'other', wallThickness)

    set(state => ({
      walls: new Map(state.walls).set(wall.id, wall)
    }))

    return wall
  },

  removeWall: (wallId: WallId) => {
    set(state => {
      const newWalls = new Map(state.walls)
      newWalls.delete(wallId)
      return { walls: newWalls }
    })
  },

  // Update operations
  updateWallType: (wallId: WallId, type: 'outer' | 'structural' | 'partition' | 'other') => {
    set(state => {
      const wall = state.walls.get(wallId)
      if (wall == null) return state

      const updatedWall = {
        ...wall,
        type,
        // Remove outsideDirection if changing from outer wall to another type
        ...(type !== 'outer' && { outsideDirection: undefined })
      }

      const newWalls = new Map(state.walls)
      newWalls.set(wallId, updatedWall)
      return { walls: newWalls }
    })
  },

  updateWallOutsideDirection: (wallId: WallId, outsideDirection: 'left' | 'right' | null) => {
    set(state => {
      const wall = state.walls.get(wallId)
      if (wall == null) return state

      const updatedWall = {
        ...wall,
        outsideDirection: outsideDirection ?? undefined
      }

      const newWalls = new Map(state.walls)
      newWalls.set(wallId, updatedWall)
      return { walls: newWalls }
    })
  },

  updateWallThickness: (wallId: WallId, thickness: Length) => {
    if (thickness <= 0) {
      throw new Error('Wall thickness must be greater than 0')
    }

    set(state => {
      const wall = state.walls.get(wallId)
      if (wall == null) return state

      const updatedWall = { ...wall, thickness }

      const newWalls = new Map(state.walls)
      newWalls.set(wallId, updatedWall)
      return { walls: newWalls }
    })
  },

  // Opening operations
  addDoorToWall: (wallId: WallId, offsetFromStart: Length, width: Length, height: Length) => {
    if (offsetFromStart < 0) {
      throw new Error('Opening offset from start must be non-negative')
    }
    if (width <= 0) {
      throw new Error('Opening width must be greater than 0')
    }
    if (height <= 0) {
      throw new Error('Opening height must be greater than 0')
    }

    set(state => {
      const wall = state.walls.get(wallId)
      if (wall == null) return state

      const newOpening: Opening = {
        type: 'door',
        offsetFromStart,
        width,
        height
      }

      const openings = (wall.openings != null) ? [...wall.openings] : []
      openings.push(newOpening)

      const updatedWall = { ...wall, openings }

      const newWalls = new Map(state.walls)
      newWalls.set(wallId, updatedWall)
      return { walls: newWalls }
    })
  },

  addWindowToWall: (wallId: WallId, offsetFromStart: Length, width: Length, height: Length, sillHeight: Length) => {
    if (offsetFromStart < 0) {
      throw new Error('Opening offset from start must be non-negative')
    }
    if (width <= 0) {
      throw new Error('Opening width must be greater than 0')
    }
    if (height <= 0) {
      throw new Error('Opening height must be greater than 0')
    }
    if (sillHeight < 0) {
      throw new Error('Window sill height must be non-negative')
    }

    set(state => {
      const wall = state.walls.get(wallId)
      if (wall == null) return state

      const newOpening: Opening = {
        type: 'window',
        offsetFromStart,
        width,
        height,
        sillHeight
      }

      const openings = (wall.openings != null) ? [...wall.openings] : []
      openings.push(newOpening)

      const updatedWall = { ...wall, openings }

      const newWalls = new Map(state.walls)
      newWalls.set(wallId, updatedWall)
      return { walls: newWalls }
    })
  },

  addPassageToWall: (wallId: WallId, offsetFromStart: Length, width: Length, height: Length) => {
    if (offsetFromStart < 0) {
      throw new Error('Opening offset from start must be non-negative')
    }
    if (width <= 0) {
      throw new Error('Opening width must be greater than 0')
    }
    if (height <= 0) {
      throw new Error('Opening height must be greater than 0')
    }

    set(state => {
      const wall = state.walls.get(wallId)
      if (wall == null) return state

      const newOpening: Opening = {
        type: 'passage',
        offsetFromStart,
        width,
        height
      }

      const openings = (wall.openings != null) ? [...wall.openings] : []
      openings.push(newOpening)

      const updatedWall = { ...wall, openings }

      const newWalls = new Map(state.walls)
      newWalls.set(wallId, updatedWall)
      return { walls: newWalls }
    })
  },

  removeOpeningFromWall: (wallId: WallId, openingIndex: number) => {
    set(state => {
      const wall = state.walls.get(wallId)
      if ((wall == null) || (wall.openings == null)) return state

      if (openingIndex < 0 || openingIndex >= wall.openings.length) {
        return state // Invalid index, do nothing
      }

      const openings = [...wall.openings]
      openings.splice(openingIndex, 1)

      const updatedWall = {
        ...wall,
        ...(openings.length > 0 ? { openings } : { openings: undefined })
      }

      const newWalls = new Map(state.walls)
      newWalls.set(wallId, updatedWall)
      return { walls: newWalls }
    })
  },

  // Touch operations
  updateWallStartTouches: (wallId: WallId, touches: WallId | PointId | null) => {
    set(state => {
      const wall = state.walls.get(wallId)
      if (wall == null) return state

      const updatedWall = {
        ...wall,
        ...((touches != null) ? { startTouches: touches } : { startTouches: undefined })
      }

      const newWalls = new Map(state.walls)
      newWalls.set(wallId, updatedWall)
      return { walls: newWalls }
    })
  },

  updateWallEndTouches: (wallId: WallId, touches: WallId | PointId | null) => {
    set(state => {
      const wall = state.walls.get(wallId)
      if (wall == null) return state

      const updatedWall = {
        ...wall,
        ...((touches != null) ? { endTouches: touches } : { endTouches: undefined })
      }

      const newWalls = new Map(state.walls)
      newWalls.set(wallId, updatedWall)
      return { walls: newWalls }
    })
  },

  addWallTouchedBy: (wallId: WallId, touchedByWallId: WallId) => {
    set(state => {
      const wall = state.walls.get(wallId)
      if (wall == null) return state

      const touchedBy = (wall.touchedBy != null) ? [...wall.touchedBy] : []

      // Don't add duplicates
      if (!touchedBy.includes(touchedByWallId)) {
        touchedBy.push(touchedByWallId)
      }

      const updatedWall = { ...wall, touchedBy }

      const newWalls = new Map(state.walls)
      newWalls.set(wallId, updatedWall)
      return { walls: newWalls }
    })
  },

  removeWallTouchedBy: (wallId: WallId, touchedByWallId: WallId) => {
    set(state => {
      const wall = state.walls.get(wallId)
      if ((wall == null) || (wall.touchedBy == null)) return state

      const touchedBy = wall.touchedBy.filter(id => id !== touchedByWallId)

      const updatedWall = {
        ...wall,
        ...(touchedBy.length > 0 ? { touchedBy } : { touchedBy: undefined })
      }

      const newWalls = new Map(state.walls)
      newWalls.set(wallId, updatedWall)
      return { walls: newWalls }
    })
  },

  // Room operations
  updateWallLeftRoom: (wallId: WallId, roomId: RoomId | null) => {
    set(state => {
      const wall = state.walls.get(wallId)
      if (wall == null) return state

      const updatedWall = {
        ...wall,
        ...((roomId != null) ? { leftRoomId: roomId } : { leftRoomId: undefined })
      }

      const newWalls = new Map(state.walls)
      newWalls.set(wallId, updatedWall)
      return { walls: newWalls }
    })
  },

  updateWallRightRoom: (wallId: WallId, roomId: RoomId | null) => {
    set(state => {
      const wall = state.walls.get(wallId)
      if (wall == null) return state

      const updatedWall = {
        ...wall,
        ...((roomId != null) ? { rightRoomId: roomId } : { rightRoomId: undefined })
      }

      const newWalls = new Map(state.walls)
      newWalls.set(wallId, updatedWall)
      return { walls: newWalls }
    })
  },

  // Getters
  getWallById: (wallId: WallId) => {
    return get().walls.get(wallId) ?? null
  },

  getWalls: () => {
    return Array.from(get().walls.values())
  },

  getWallsByType: (type: 'outer' | 'structural' | 'partition' | 'other') => {
    return Array.from(get().walls.values()).filter(wall => wall.type === type)
  },

  getWallsConnectedToPoint: (pointId: PointId) => {
    return Array.from(get().walls.values()).filter(
      wall => wall.startPointId === pointId || wall.endPointId === pointId
    )
  }
})
