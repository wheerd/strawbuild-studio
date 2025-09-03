import type { StateCreator } from 'zustand'
import type { OuterWallPolygon, OuterWallConstructionType, OuterWallSegment, Opening, OuterCorner } from '@/types/model'
import type { FloorId, OuterWallId, WallSegmentId, OuterCornerId, OpeningId } from '@/types/ids'
import type { Length, Polygon2D, Line2D, Vec2 } from '@/types/geometry'
import { createOuterWallId, createWallSegmentId, createOuterCornerId, createOpeningId } from '@/types/ids'
import {
  createLength,
  lineIntersection,
  midpoint,
  projectPointOntoLine,
  distance,
  direction,
  perpendicularCCW,
  lineFromPoints,
  add,
  scale
} from '@/types/geometry'
import { wouldClosingPolygonSelfIntersect } from '@/types/geometry/polygon'

type PartialSegmentInput = Pick<OuterWallSegment, 'id' | 'thickness' | 'constructionType' | 'openings'>

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

  // Entity deletion operations
  removeOuterWallCorner: (wallId: OuterWallId, cornerId: OuterCornerId) => boolean
  removeOuterWallSegment: (wallId: OuterWallId, segmentId: WallSegmentId) => boolean

  // Updated to use IDs instead of indices
  updateOuterWallConstructionType: (
    wallId: OuterWallId,
    segmentId: WallSegmentId,
    type: OuterWallConstructionType
  ) => void
  updateOuterWallThickness: (wallId: OuterWallId, segmentId: WallSegmentId, thickness: Length) => void
  updateCornerBelongsTo: (wallId: OuterWallId, cornerId: OuterCornerId, belongsTo: 'previous' | 'next') => void

  // Updated opening actions with ID-based approach and auto-ID generation
  addOpeningToOuterWall: (
    wallId: OuterWallId,
    segmentId: WallSegmentId,
    openingParams: Omit<Opening, 'id'>
  ) => OpeningId
  removeOpeningFromOuterWall: (wallId: OuterWallId, segmentId: WallSegmentId, openingId: OpeningId) => void
  updateOpening: (
    wallId: OuterWallId,
    segmentId: WallSegmentId,
    openingId: OpeningId,
    updates: Partial<Omit<Opening, 'id'>>
  ) => void

  // Updated getters
  getOuterWallById: (wallId: OuterWallId) => OuterWallPolygon | null
  getSegmentById: (wallId: OuterWallId, segmentId: WallSegmentId) => OuterWallSegment | null
  getCornerById: (wallId: OuterWallId, cornerId: OuterCornerId) => OuterCorner | null
  getOpeningById: (wallId: OuterWallId, segmentId: WallSegmentId, openingId: OpeningId) => Opening | null
  getOuterWallsByFloor: (floorId: FloorId) => OuterWallPolygon[]
}

export type OuterWallsSlice = OuterWallsState & OuterWallsActions

// Default wall thickness value
const DEFAULT_OUTER_WALL_THICKNESS = createLength(440) // 44cm for strawbale walls

// Step 1: Create infinite inside and outside lines for each wall segment
const createInfiniteLines = (
  boundary: Polygon2D,
  thicknesses: Length[]
): Array<{ inside: Line2D; outside: Line2D }> => {
  const numSides = boundary.points.length
  const infiniteLines: Array<{ inside: Line2D; outside: Line2D }> = []

  for (let i = 0; i < numSides; i++) {
    const startPoint = boundary.points[i]
    const endPoint = boundary.points[(i + 1) % numSides]
    const segmentThickness = thicknesses[i]

    // Create line from boundary points
    const insideLine = lineFromPoints(startPoint, endPoint)
    if (!insideLine) {
      throw new Error('Wall segment cannot have zero length')
    }

    // Calculate outside direction and create outside line
    const outsideDirection = perpendicularCCW(insideLine.direction)
    const outsidePoint = add(startPoint, scale(outsideDirection, segmentThickness))
    const outsideLine = { point: outsidePoint, direction: insideLine.direction }

    infiniteLines.push({ inside: insideLine, outside: outsideLine })
  }

  return infiniteLines
}

// Step 2: Calculate corner outside points as intersections of adjacent outside lines
const calculateCornerOutsidePoints = (
  boundary: Polygon2D,
  thicknesses: Length[],
  infiniteLines: Array<{ inside: Line2D; outside: Line2D }>,
  existingCorners?: OuterCorner[]
): OuterCorner[] => {
  const numSides = boundary.points.length
  const corners: OuterCorner[] = []

  for (let i = 0; i < numSides; i++) {
    const prevIndex = (i - 1 + numSides) % numSides
    const prevOutsideLine = infiniteLines[prevIndex].outside
    const currentOutsideLine = infiniteLines[i].outside

    // Find intersection of adjacent outside lines
    const intersection = lineIntersection(prevOutsideLine, currentOutsideLine)

    let outsidePoint: Vec2
    if (intersection) {
      outsidePoint = intersection
    } else {
      // No intersection means the segments are colinear (parallel)
      // Project the boundary point outward by the maximum thickness of adjacent segments
      const prevThickness = thicknesses[prevIndex]
      const currentThickness = thicknesses[i]
      const maxThickness = Math.max(prevThickness, currentThickness)

      // Use the outside direction from either segment (they should be the same for colinear segments)
      const outsideDirection = perpendicularCCW(currentOutsideLine.direction)
      outsidePoint = add(boundary.points[i], scale(outsideDirection, maxThickness))
    }

    // Preserve existing corner data if available
    const existingCorner = existingCorners?.[i]
    corners.push({
      id: existingCorner?.id ?? createOuterCornerId(),
      outsidePoint,
      belongsTo: existingCorner?.belongsTo ?? 'next'
    })
  }

  return corners
}

// Step 3: Determine correct segment endpoints using projection-based distance comparison
const calculateSegmentEndpoints = (
  boundary: Polygon2D,
  segmentInputs: PartialSegmentInput[],
  corners: OuterCorner[],
  infiniteLines: Array<{ inside: Line2D; outside: Line2D }>
): OuterWallSegment[] => {
  const numSides = boundary.points.length
  const finalSegments: OuterWallSegment[] = []

  for (let i = 0; i < numSides; i++) {
    const boundaryStart = boundary.points[i]
    const boundaryEnd = boundary.points[(i + 1) % numSides]
    const segmentMidpoint = midpoint(boundaryStart, boundaryEnd)

    const startCornerOutside = corners[i].outsidePoint
    const endCornerOutside = corners[(i + 1) % numSides].outsidePoint

    const insideLine = infiniteLines[i].inside
    const outsideLine = infiniteLines[i].outside

    // Project boundary points onto outside line
    const boundaryStartOnOutside = projectPointOntoLine(boundaryStart, outsideLine)
    const boundaryEndOnOutside = projectPointOntoLine(boundaryEnd, outsideLine)

    // Project corner outside points onto inside line
    const cornerStartOnInside = projectPointOntoLine(startCornerOutside, insideLine)
    const cornerEndOnInside = projectPointOntoLine(endCornerOutside, insideLine)

    // Choose endpoints based on which projection is closer to segment midpoint
    const startDistBoundary = distance(boundaryStart, segmentMidpoint)
    const startDistCorner = distance(cornerStartOnInside, segmentMidpoint)
    const endDistBoundary = distance(boundaryEnd, segmentMidpoint)
    const endDistCorner = distance(cornerEndOnInside, segmentMidpoint)

    const finalInsideStart = startDistBoundary <= startDistCorner ? boundaryStart : cornerStartOnInside
    const finalInsideEnd = endDistBoundary <= endDistCorner ? boundaryEnd : cornerEndOnInside
    const finalOutsideStart = startDistBoundary <= startDistCorner ? boundaryStartOnOutside : startCornerOutside
    const finalOutsideEnd = endDistBoundary <= endDistCorner ? boundaryEndOnOutside : endCornerOutside

    // Calculate final segment properties using utility functions
    const segmentDirection = direction(finalInsideStart, finalInsideEnd)
    const outsideDirection = perpendicularCCW(segmentDirection)

    const finalInsideLine = { start: finalInsideStart, end: finalInsideEnd }
    const finalOutsideLine = { start: finalOutsideStart, end: finalOutsideEnd }

    const insideLength = distance(boundaryStart, boundaryEnd)
    const outsideLength = distance(startCornerOutside, endCornerOutside)
    const segmentLength = distance(finalInsideStart, finalInsideEnd)

    finalSegments.push({
      ...segmentInputs[i], // Preserve existing segment data like openings and construction type
      insideLength,
      outsideLength,
      segmentLength,
      insideLine: finalInsideLine,
      outsideLine: finalOutsideLine,
      direction: segmentDirection,
      outsideDirection
    })
  }

  return finalSegments
}

// Helper function to create wall segments and corners simultaneously using the simplified approach
const createSegmentsAndCorners = (
  boundary: Polygon2D,
  constructionType: OuterWallConstructionType,
  thickness: Length,
  existingCorners?: OuterCorner[]
): { segments: OuterWallSegment[]; corners: OuterCorner[] } => {
  // Use shared functions for the three-step process
  const thicknesses = Array(boundary.points.length).fill(thickness)
  const infiniteLines = createInfiniteLines(boundary, thicknesses)
  const corners = calculateCornerOutsidePoints(boundary, thicknesses, infiniteLines, existingCorners)

  // Create initial segments with uniform thickness and construction type
  const initialSegments: PartialSegmentInput[] = []
  for (let i = 0; i < boundary.points.length; i++) {
    initialSegments.push({
      id: createWallSegmentId(),
      thickness,
      constructionType,
      openings: []
    })
  }
  const segments = calculateSegmentEndpoints(boundary, initialSegments, corners, infiniteLines)

  return { segments, corners }
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

    const { segments, corners } = createSegmentsAndCorners(boundary, constructionType, wallThickness)

    const outerWall: OuterWallPolygon = {
      id: createOuterWallId(),
      floorId,
      boundary: boundary.points,
      segments,
      corners
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

  // Corner deletion: removes the corner and its corresponding boundary point,
  // merging the two adjacent segments into one
  removeOuterWallCorner: (wallId: OuterWallId, cornerId: OuterCornerId): boolean => {
    const state = get()
    const outerWall = state.outerWalls.get(wallId)
    if (!outerWall) return false

    const cornerIndex = outerWall.corners.findIndex(c => c.id === cornerId)
    if (cornerIndex === -1) return false

    // Need at least 4 corners to remove one (minimum 3 sides after removal)
    if (outerWall.corners.length < 4) return false

    // Create new boundary by removing the point at cornerIndex
    const newBoundaryPoints = [...outerWall.boundary]
    newBoundaryPoints.splice(cornerIndex, 1)

    // Validate the new polygon wouldn't self-intersect
    if (wouldClosingPolygonSelfIntersect(newBoundaryPoints)) return false

    // Create new segments array by:
    // 1. Removing the segment at cornerIndex (which ends at the deleted corner)
    // 2. Removing the segment at (cornerIndex - 1) % length (which starts from the deleted corner)
    // 3. Adding a new segment that bridges these two
    const prevSegmentIndex = (cornerIndex - 1 + outerWall.segments.length) % outerWall.segments.length
    const currentSegmentIndex = cornerIndex

    const newSegments = [...outerWall.segments]
    const removedSegment1 = newSegments[prevSegmentIndex]
    const removedSegment2 = newSegments[currentSegmentIndex]

    // Remove the two segments (remove higher index first to avoid shifting)
    if (currentSegmentIndex > prevSegmentIndex) {
      newSegments.splice(currentSegmentIndex, 1)
      newSegments.splice(prevSegmentIndex, 1)
    } else {
      newSegments.splice(prevSegmentIndex, 1)
      newSegments.splice(currentSegmentIndex, 1)
    }

    // Use the thicker of the two segments for the new merged segment
    const newThickness = createLength(Math.max(removedSegment1.thickness, removedSegment2.thickness))
    const newConstructionType = removedSegment1.constructionType // Use the first segment's construction type

    // Create new segment with merged properties (openings are deleted as they don't make sense on new geometry)
    const mergedSegmentInput: PartialSegmentInput = {
      id: createWallSegmentId(),
      thickness: newThickness,
      constructionType: newConstructionType,
      openings: [] // Openings are deleted as they don't make sense on the new merged segment
    }

    // Insert the merged segment at the correct position
    const insertIndex = Math.min(prevSegmentIndex, currentSegmentIndex)
    newSegments.splice(insertIndex, 0, mergedSegmentInput as OuterWallSegment)

    // Remove the corner from corners array
    const newCorners = [...outerWall.corners]
    newCorners.splice(cornerIndex, 1)

    // Recalculate geometry for the modified polygon
    const newBoundary = { points: newBoundaryPoints }
    const thicknesses = newSegments.map(s => (s as PartialSegmentInput).thickness)
    const infiniteLines = createInfiniteLines(newBoundary, thicknesses)
    const updatedCorners = calculateCornerOutsidePoints(newBoundary, thicknesses, infiniteLines, newCorners)
    const finalSegments = calculateSegmentEndpoints(
      newBoundary,
      newSegments as PartialSegmentInput[],
      updatedCorners,
      infiniteLines
    )

    const updatedOuterWall: OuterWallPolygon = {
      ...outerWall,
      boundary: newBoundaryPoints,
      segments: finalSegments,
      corners: updatedCorners
    }

    set(state => ({
      outerWalls: new Map(state.outerWalls).set(wallId, updatedOuterWall)
    }))

    return true
  },

  // Segment deletion: removes the target segment and merges the two adjacent segments into one,
  // also removing the two corner points that connected these three segments
  removeOuterWallSegment: (wallId: OuterWallId, segmentId: WallSegmentId): boolean => {
    const state = get()
    const outerWall = state.outerWalls.get(wallId)
    if (!outerWall) return false

    const segmentIndex = outerWall.segments.findIndex(s => s.id === segmentId)
    if (segmentIndex === -1) return false

    // Need at least 5 segments to remove one (results in 3 segments minimum: 5 - 3 + 1 = 3)
    if (outerWall.segments.length < 5) return false

    const numSegments = outerWall.segments.length

    // Get indices of the three segments involved: previous, target, next
    const prevSegmentIndex = (segmentIndex - 1 + numSegments) % numSegments
    const nextSegmentIndex = (segmentIndex + 1) % numSegments

    // Create new boundary by removing the two corner points that connected these segments
    // Remove the corner at segmentIndex (between prev and target segments)
    // Remove the corner at (segmentIndex + 1) % length (between target and next segments)
    const newBoundaryPoints = [...outerWall.boundary]
    const cornerIndex1 = segmentIndex
    const cornerIndex2 = (segmentIndex + 1) % outerWall.boundary.length

    // Remove higher index first to avoid shifting
    if (cornerIndex2 > cornerIndex1) {
      newBoundaryPoints.splice(cornerIndex2, 1)
      newBoundaryPoints.splice(cornerIndex1, 1)
    } else {
      newBoundaryPoints.splice(cornerIndex1, 1)
      newBoundaryPoints.splice(cornerIndex2, 1)
    }

    // Validate the new polygon wouldn't self-intersect
    if (wouldClosingPolygonSelfIntersect(newBoundaryPoints)) return false

    // Remove the three segments (target and adjacent ones) and replace with one merged segment
    const prevSegment = outerWall.segments[prevSegmentIndex]
    const targetSegment = outerWall.segments[segmentIndex]
    const nextSegment = outerWall.segments[nextSegmentIndex]

    // Create merged segment with combined properties
    const newThickness = createLength(Math.max(prevSegment.thickness, targetSegment.thickness, nextSegment.thickness))
    const newConstructionType = prevSegment.constructionType // Use the previous segment's construction type

    const mergedSegmentInput: PartialSegmentInput = {
      id: createWallSegmentId(),
      thickness: newThickness,
      constructionType: newConstructionType,
      openings: [] // Openings are deleted as they don't make sense on the new merged segment
    }

    // Create new segments array by removing the three segments and inserting the merged one
    const newSegments = [...outerWall.segments]

    // Remove the three segments (remove from highest index to avoid shifting)
    const indicesToRemove = [prevSegmentIndex, segmentIndex, nextSegmentIndex].sort((a, b) => b - a)
    for (const index of indicesToRemove) {
      newSegments.splice(index, 1)
    }

    // Insert the merged segment at the position where the previous segment was
    const insertIndex = Math.min(prevSegmentIndex, segmentIndex, nextSegmentIndex)
    newSegments.splice(insertIndex, 0, mergedSegmentInput as OuterWallSegment)

    // Remove the corresponding corners
    const newCorners = [...outerWall.corners]
    // Remove higher index first to avoid shifting
    if (cornerIndex2 > cornerIndex1) {
      newCorners.splice(cornerIndex2, 1)
      newCorners.splice(cornerIndex1, 1)
    } else {
      newCorners.splice(cornerIndex1, 1)
      newCorners.splice(cornerIndex2, 1)
    }

    // Recalculate geometry for the modified polygon
    const newBoundary = { points: newBoundaryPoints }
    const thicknesses = newSegments.map(s => (s as PartialSegmentInput).thickness)
    const infiniteLines = createInfiniteLines(newBoundary, thicknesses)
    const updatedCorners = calculateCornerOutsidePoints(newBoundary, thicknesses, infiniteLines, newCorners)
    const finalSegments = calculateSegmentEndpoints(
      newBoundary,
      newSegments as PartialSegmentInput[],
      updatedCorners,
      infiniteLines
    )

    const updatedOuterWall: OuterWallPolygon = {
      ...outerWall,
      boundary: newBoundaryPoints,
      segments: finalSegments,
      corners: updatedCorners
    }

    set(state => ({
      outerWalls: new Map(state.outerWalls).set(wallId, updatedOuterWall)
    }))

    return true
  },

  // Update operations
  updateOuterWallConstructionType: (wallId: OuterWallId, segmentId: WallSegmentId, type: OuterWallConstructionType) => {
    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      const segmentIndex = outerWall.segments.findIndex(s => s.id === segmentId)
      if (segmentIndex === -1) {
        return state // Segment not found
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

  updateOuterWallThickness: (wallId: OuterWallId, segmentId: WallSegmentId, thickness: Length) => {
    if (thickness <= 0) {
      throw new Error('Wall thickness must be greater than 0')
    }

    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      const segmentIndex = outerWall.segments.findIndex(s => s.id === segmentId)
      if (segmentIndex === -1) {
        return state // Segment not found
      }

      // Update the specific segment thickness first
      const updatedSegments = [...outerWall.segments]
      updatedSegments[segmentIndex] = {
        ...updatedSegments[segmentIndex],
        thickness
      }

      // Use shared functions for the three-step process with mixed thickness
      const boundary = { points: outerWall.boundary }
      const thicknesses = updatedSegments.map(s => s.thickness)
      const infiniteLines = createInfiniteLines(boundary, thicknesses)
      const updatedCorners = calculateCornerOutsidePoints(boundary, thicknesses, infiniteLines, outerWall.corners)
      const finalSegments = calculateSegmentEndpoints(boundary, updatedSegments, updatedCorners, infiniteLines)

      const updatedOuterWall = {
        ...outerWall,
        segments: finalSegments,
        corners: updatedCorners
      }

      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.set(wallId, updatedOuterWall)
      return { outerWalls: newOuterWalls }
    })
  },

  updateCornerBelongsTo: (wallId: OuterWallId, cornerId: OuterCornerId, belongsTo: 'previous' | 'next') => {
    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      const cornerIndex = outerWall.corners.findIndex(c => c.id === cornerId)
      if (cornerIndex === -1) {
        return state // Corner not found
      }

      const updatedCorners = [...outerWall.corners]
      updatedCorners[cornerIndex] = {
        ...updatedCorners[cornerIndex],
        belongsTo
      }

      const updatedOuterWall = {
        ...outerWall,
        corners: updatedCorners
      }

      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.set(wallId, updatedOuterWall)
      return { outerWalls: newOuterWalls }
    })
  },

  // Opening operations
  addOpeningToOuterWall: (wallId: OuterWallId, segmentId: WallSegmentId, openingParams: Omit<Opening, 'id'>) => {
    if (openingParams.offsetFromStart < 0) {
      throw new Error('Opening offset from start must be non-negative')
    }
    if (openingParams.width <= 0) {
      throw new Error('Opening width must be greater than 0')
    }
    if (openingParams.height <= 0) {
      throw new Error('Opening height must be greater than 0')
    }
    if (openingParams.sillHeight != null && openingParams.sillHeight < 0) {
      throw new Error('Window sill height must be non-negative')
    }

    // Auto-generate ID for the new opening
    const openingId = createOpeningId()
    const newOpening: Opening = {
      id: openingId,
      ...openingParams
    }

    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      const segmentIndex = outerWall.segments.findIndex(s => s.id === segmentId)
      if (segmentIndex === -1) {
        return state // Segment not found
      }

      const updatedSegments = [...outerWall.segments]
      const segment = updatedSegments[segmentIndex]

      updatedSegments[segmentIndex] = {
        ...segment,
        openings: [...segment.openings, newOpening]
      }

      const updatedOuterWall = {
        ...outerWall,
        segments: updatedSegments
      }

      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.set(wallId, updatedOuterWall)
      return { outerWalls: newOuterWalls }
    })

    return openingId
  },

  removeOpeningFromOuterWall: (wallId: OuterWallId, segmentId: WallSegmentId, openingId: OpeningId) => {
    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      const segmentIndex = outerWall.segments.findIndex(s => s.id === segmentId)
      if (segmentIndex === -1) {
        return state // Segment not found
      }

      const segment = outerWall.segments[segmentIndex]
      const openingIndex = segment.openings.findIndex(o => o.id === openingId)
      if (openingIndex === -1) {
        return state // Opening not found
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

  // Updated and new getter methods
  getSegmentById: (wallId: OuterWallId, segmentId: WallSegmentId) => {
    const outerWall = get().outerWalls.get(wallId)
    if (outerWall == null) return null

    return outerWall.segments.find(s => s.id === segmentId) ?? null
  },

  getCornerById: (wallId: OuterWallId, cornerId: OuterCornerId) => {
    const outerWall = get().outerWalls.get(wallId)
    if (outerWall == null) return null

    return outerWall.corners.find(c => c.id === cornerId) ?? null
  },

  getOpeningById: (wallId: OuterWallId, segmentId: WallSegmentId, openingId: OpeningId) => {
    const outerWall = get().outerWalls.get(wallId)
    if (outerWall == null) return null

    const segment = outerWall.segments.find(s => s.id === segmentId)
    if (segment == null) return null

    return segment.openings.find(o => o.id === openingId) ?? null
  },

  updateOpening: (
    wallId: OuterWallId,
    segmentId: WallSegmentId,
    openingId: OpeningId,
    updates: Partial<Omit<Opening, 'id'>>
  ) => {
    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      const segmentIndex = outerWall.segments.findIndex(s => s.id === segmentId)
      if (segmentIndex === -1) return state

      const segment = outerWall.segments[segmentIndex]
      const openingIndex = segment.openings.findIndex(o => o.id === openingId)
      if (openingIndex === -1) return state

      const updatedSegments = [...outerWall.segments]
      const updatedOpenings = [...segment.openings]

      updatedOpenings[openingIndex] = {
        ...updatedOpenings[openingIndex],
        ...updates
      }

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

  getOuterWallsByFloor: (floorId: FloorId) => {
    return Array.from(get().outerWalls.values()).filter(wall => wall.floorId === floorId)
  }
})
