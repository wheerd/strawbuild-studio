import type { StateCreator } from 'zustand'
import type { OuterWallPolygon, OuterWallConstructionType, OuterWallSegment, Opening } from '@/types/model'
import type { FloorId, OuterWallId } from '@/types/ids'
import type { Length, Polygon2D, Point2D, Vector2D, LineSegment2D } from '@/types/geometry'
import { createOuterWallId } from '@/types/ids'
import { createLength, createVector2D, createPoint2D } from '@/types/geometry'

export interface OuterWallsState {
  outerWalls: Map<OuterWallId, OuterWallPolygon>
}

export interface OuterWallsActions {
  addOuterWallPolygon: (
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

// Helper function to compute geometric properties for a single segment
const computeSegmentGeometry = (
  startPoint: Point2D,
  endPoint: Point2D,
  thickness: Length
): {
  insideLength: Length
  outsideLength: Length
  insideLine: LineSegment2D
  outsideLine: LineSegment2D
  direction: Vector2D
  outsideDirection: Vector2D
} => {
  // Calculate direction vector (normalized from start -> end)
  const dx = endPoint[0] - startPoint[0]
  const dy = endPoint[1] - startPoint[1]
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) {
    throw new Error('Wall segment cannot have zero length')
  }

  const direction = createVector2D(dx / length, dy / length)

  // Calculate outside direction (normal vector pointing outside)
  // For a clockwise polygon, the outside normal is perpendicular right to the direction
  const outsideDirection = createVector2D(-direction[1], direction[0])

  // Inside line is the original segment
  const insideLine: LineSegment2D = {
    start: startPoint,
    end: endPoint
  }

  // Outside line is offset by thickness in the outside direction
  const outsideStart = createPoint2D(
    startPoint[0] + outsideDirection[0] * thickness,
    startPoint[1] + outsideDirection[1] * thickness
  )
  const outsideEnd = createPoint2D(
    endPoint[0] + outsideDirection[0] * thickness,
    endPoint[1] + outsideDirection[1] * thickness
  )

  const outsideLine: LineSegment2D = {
    start: outsideStart,
    end: outsideEnd
  }

  return {
    insideLength: length as Length,
    outsideLength: length as Length, // For now same as inside length
    insideLine,
    outsideLine,
    direction,
    outsideDirection
  }
}

// Helper function to create segments from boundary points
const createSegmentsFromBoundary = (
  boundary: Polygon2D,
  constructionType: OuterWallConstructionType,
  thickness: Length
): OuterWallSegment[] => {
  const segments: OuterWallSegment[] = []

  // Create one segment for each side of the polygon
  for (let i = 0; i < boundary.points.length; i++) {
    const startPoint = boundary.points[i]
    const endPoint = boundary.points[(i + 1) % boundary.points.length]

    const geometry = computeSegmentGeometry(startPoint, endPoint, thickness)

    segments.push({
      thickness,
      constructionType,
      openings: [],
      ...geometry
    })
  }

  return segments
}

export const createOuterWallsSlice: StateCreator<OuterWallsSlice, [], [], OuterWallsSlice> = (set, get) => ({
  outerWalls: new Map(),

  // CRUD operations
  addOuterWallPolygon: (
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

      // Get the boundary points for this segment
      const startPoint = outerWall.boundary[segmentIndex]
      const endPoint = outerWall.boundary[(segmentIndex + 1) % outerWall.boundary.length]

      // Recompute geometry with new thickness
      const geometry = computeSegmentGeometry(startPoint, endPoint, thickness)

      const updatedSegments = [...outerWall.segments]
      updatedSegments[segmentIndex] = {
        ...updatedSegments[segmentIndex],
        thickness,
        ...geometry
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
