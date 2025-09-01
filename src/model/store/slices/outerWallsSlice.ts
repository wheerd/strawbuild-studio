import type { StateCreator } from 'zustand'
import type { OuterWallPolygon, OuterWallConstructionType, OuterWallSegment, Opening } from '@/types/model'
import type { FloorId, OuterWallId } from '@/types/ids'
import type { Length, Polygon2D } from '@/types/geometry'
import { createOuterWallId } from '@/types/ids'
import { createLength } from '@/types/geometry'

export interface OuterWallsState {
  outerWalls: Map<OuterWallId, OuterWallPolygon>
}

export interface OuterWallsActions {
  addOuterWall: (
    floorId: FloorId,
    boundary: Polygon2D,
    constructionType: OuterWallConstructionType,
    thickness?: Length
  ) => void
  removeOuterWall: (wallId: OuterWallId) => void

  updateOuterWallConstructionType: (wallId: OuterWallId, segmentIndex: number, type: OuterWallConstructionType) => void
  updateOuterWallThickness: (wallId: OuterWallId, segmentIndex: number, thickness: Length) => void

  addOpeningToOuterWall: (wallId: OuterWallId, segmentIndex: number, opening: Opening) => void
  removeOpeningFromOuterWall: (wallId: OuterWallId, segmentIndex: number, openingIndex: number) => void

  getOuterWallById: (wallId: OuterWallId) => OuterWallPolygon | null
  getOuterWallSegment: (wallId: OuterWallId, segmentIndex: number) => OuterWallSegment | null
  getOuterWallsByFloor: (floorId: FloorId) => OuterWallPolygon[]
}

export type OuterWallsSlice = OuterWallsState & OuterWallsActions

// Default wall thickness value
const DEFAULT_OUTER_WALL_THICKNESS = createLength(440) // 44cm for strawbale walls

// Helper function to create segments from boundary points
const createSegmentsFromBoundary = (
  boundary: Polygon2D,
  constructionType: OuterWallConstructionType,
  thickness: Length
): OuterWallSegment[] => {
  const segments: OuterWallSegment[] = []

  // Create one segment for each side of the polygon
  for (let i = 0; i < boundary.points.length; i++) {
    segments.push({
      thickness,
      constructionType,
      openings: []
    })
  }

  return segments
}

export const createOuterWallsSlice: StateCreator<OuterWallsSlice, [], [], OuterWallsSlice> = (set, get) => ({
  outerWalls: new Map(),

  // CRUD operations
  addOuterWall: (
    floorId: FloorId,
    boundary: Polygon2D,
    constructionType: OuterWallConstructionType,
    thickness?: Length
  ) => {
    if (boundary.points.length < 3) {
      throw new Error('Outer wall boundary must have at least 3 points')
    }

    const wallThickness = thickness ?? DEFAULT_OUTER_WALL_THICKNESS

    if (wallThickness <= 0) {
      throw new Error('Wall thickness must be greater than 0')
    }

    const segments = createSegmentsFromBoundary(boundary, constructionType, wallThickness)

    const outerWall: OuterWallPolygon = {
      id: createOuterWallId(),
      floorId,
      boundary: boundary.points,
      segments
    }

    set(state => ({
      outerWalls: new Map(state.outerWalls).set(outerWall.id, outerWall)
    }))
  },

  removeOuterWall: (wallId: OuterWallId) => {
    set(state => {
      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.delete(wallId)
      return { outerWalls: newOuterWalls }
    })
  },

  // Update operations
  updateOuterWallConstructionType: (wallId: OuterWallId, segmentIndex: number, type: OuterWallConstructionType) => {
    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      if (segmentIndex < 0 || segmentIndex >= outerWall.segments.length) {
        return state // Invalid index, do nothing
      }

      const updatedSegments = [...outerWall.segments]
      updatedSegments[segmentIndex] = {
        ...updatedSegments[segmentIndex],
        constructionType: type
      }

      const updatedOuterWall = {
        ...outerWall,
        segments: updatedSegments
      }

      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.set(wallId, updatedOuterWall)
      return { outerWalls: newOuterWalls }
    })
  },

  updateOuterWallThickness: (wallId: OuterWallId, segmentIndex: number, thickness: Length) => {
    if (thickness <= 0) {
      throw new Error('Wall thickness must be greater than 0')
    }

    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      if (segmentIndex < 0 || segmentIndex >= outerWall.segments.length) {
        return state // Invalid index, do nothing
      }

      const updatedSegments = [...outerWall.segments]
      updatedSegments[segmentIndex] = {
        ...updatedSegments[segmentIndex],
        thickness
      }

      const updatedOuterWall = {
        ...outerWall,
        segments: updatedSegments
      }

      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.set(wallId, updatedOuterWall)
      return { outerWalls: newOuterWalls }
    })
  },

  // Opening operations
  addOpeningToOuterWall: (wallId: OuterWallId, segmentIndex: number, opening: Opening) => {
    if (opening.offsetFromStart < 0) {
      throw new Error('Opening offset from start must be non-negative')
    }
    if (opening.width <= 0) {
      throw new Error('Opening width must be greater than 0')
    }
    if (opening.height <= 0) {
      throw new Error('Opening height must be greater than 0')
    }
    if (opening.sillHeight != null && opening.sillHeight < 0) {
      throw new Error('Window sill height must be non-negative')
    }

    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      if (segmentIndex < 0 || segmentIndex >= outerWall.segments.length) {
        return state // Invalid index, do nothing
      }

      const updatedSegments = [...outerWall.segments]
      const segment = updatedSegments[segmentIndex]

      updatedSegments[segmentIndex] = {
        ...segment,
        openings: [...segment.openings, { ...opening }]
      }

      const updatedOuterWall = {
        ...outerWall,
        segments: updatedSegments
      }

      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.set(wallId, updatedOuterWall)
      return { outerWalls: newOuterWalls }
    })
  },

  removeOpeningFromOuterWall: (wallId: OuterWallId, segmentIndex: number, openingIndex: number) => {
    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      if (segmentIndex < 0 || segmentIndex >= outerWall.segments.length) {
        return state // Invalid segment index, do nothing
      }

      const segment = outerWall.segments[segmentIndex]
      if (openingIndex < 0 || openingIndex >= segment.openings.length) {
        return state // Invalid opening index, do nothing
      }

      const updatedSegments = [...outerWall.segments]
      const updatedOpenings = [...segment.openings]
      updatedOpenings.splice(openingIndex, 1)

      updatedSegments[segmentIndex] = {
        ...segment,
        openings: updatedOpenings
      }

      const updatedOuterWall = {
        ...outerWall,
        segments: updatedSegments
      }

      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.set(wallId, updatedOuterWall)
      return { outerWalls: newOuterWalls }
    })
  },

  // Getters
  getOuterWallById: (wallId: OuterWallId) => {
    return get().outerWalls.get(wallId) ?? null
  },

  getOuterWallSegment: (wallId: OuterWallId, segmentIndex: number) => {
    const outerWall = get().outerWalls.get(wallId)
    if (outerWall == null) return null

    if (segmentIndex < 0 || segmentIndex >= outerWall.segments.length) {
      return null // Invalid index
    }

    return outerWall.segments[segmentIndex]
  },

  getOuterWallsByFloor: (floorId: FloorId) => {
    return Array.from(get().outerWalls.values()).filter(wall => wall.floorId === floorId)
  }
})
