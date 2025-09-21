import type { StateCreator } from 'zustand'
import type { Perimeter, PerimeterWall, Opening, PerimeterCorner } from '@/types/model'
import type {
  StoreyId,
  PerimeterId,
  PerimeterWallId,
  PerimeterCornerId,
  OpeningId,
  RingBeamConstructionMethodId,
  PerimeterConstructionMethodId
} from '@/types/ids'
import type { Length, Polygon2D, Line2D, Vec2 } from '@/types/geometry'
import { createPerimeterId, createPerimeterWallId, createPerimeterCornerId, createOpeningId } from '@/types/ids'

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

type PartialWallInput = Pick<PerimeterWall, 'id' | 'thickness' | 'constructionMethodId' | 'openings'>

export interface PerimetersState {
  perimeters: Record<PerimeterId, Perimeter>
}

export interface PerimetersActions {
  addPerimeter: (
    storeyId: StoreyId,
    boundary: Polygon2D,
    constructionMethodId: PerimeterConstructionMethodId,
    thickness?: Length,
    baseRingBeamMethodId?: RingBeamConstructionMethodId,
    topRingBeamMethodId?: RingBeamConstructionMethodId
  ) => Perimeter
  removePerimeter: (perimeterId: PerimeterId) => void

  // Entity deletion operations
  removePerimeterCorner: (perimeterId: PerimeterId, cornerId: PerimeterCornerId) => boolean
  removePerimeterWall: (perimeterId: PerimeterId, wallId: PerimeterWallId) => boolean

  // Updated to use IDs instead of indices
  updatePerimeterWallConstructionMethod: (
    perimeterId: PerimeterId,
    wallId: PerimeterWallId,
    methodId: PerimeterConstructionMethodId
  ) => void
  updatePerimeterWallThickness: (perimeterId: PerimeterId, wallId: PerimeterWallId, thickness: Length) => void
  updatePerimeterCornerConstructedByWall: (
    perimeterId: PerimeterId,
    cornerId: PerimeterCornerId,
    constructedByWall: 'previous' | 'next'
  ) => void

  // Updated opening actions with ID-based approach and auto-ID generation
  addPerimeterWallOpening: (
    perimeterId: PerimeterId,
    wallId: PerimeterWallId,
    openingParams: Omit<Opening, 'id'>
  ) => OpeningId
  removePerimeterWallOpening: (perimeterId: PerimeterId, wallId: PerimeterWallId, openingId: OpeningId) => void
  updatePerimeterWallOpening: (
    perimeterId: PerimeterId,
    wallId: PerimeterWallId,
    openingId: OpeningId,
    updates: Partial<Omit<Opening, 'id'>>
  ) => void

  // Opening validation methods
  isPerimeterWallOpeningPlacementValid: (
    perimeterId: PerimeterId,
    wallId: PerimeterWallId,
    offsetFromStart: Length,
    width: Length,
    excludedOpening?: OpeningId
  ) => boolean
  findNearestValidPerimeterWallOpeningPosition: (
    perimeterId: PerimeterId,
    wallId: PerimeterWallId,
    preferredOffset: Length,
    width: Length,
    excludedOpening?: OpeningId
  ) => Length | null

  // Updated getters
  getPerimeterById: (perimeterId: PerimeterId) => Perimeter | null
  getPerimeterWallById: (perimeterId: PerimeterId, wallId: PerimeterWallId) => PerimeterWall | null
  getPerimeterCornerById: (perimeterId: PerimeterId, cornerId: PerimeterCornerId) => PerimeterCorner | null
  getPerimeterWallOpeningById: (
    perimeterId: PerimeterId,
    wallId: PerimeterWallId,
    openingId: OpeningId
  ) => Opening | null
  getPerimetersByStorey: (storeyId: StoreyId) => Perimeter[]

  // Movement operations for MoveTool
  movePerimeter: (perimeterId: PerimeterId, offset: Vec2) => boolean
  updatePerimeterBoundary: (perimeterId: PerimeterId, newBoundary: Vec2[]) => boolean

  // Ring beam configuration
  setPerimeterBaseRingBeam: (perimeterId: PerimeterId, methodId: RingBeamConstructionMethodId) => void
  setPerimeterTopRingBeam: (perimeterId: PerimeterId, methodId: RingBeamConstructionMethodId) => void
  removePerimeterBaseRingBeam: (perimeterId: PerimeterId) => void
  removePerimeterTopRingBeam: (perimeterId: PerimeterId) => void
}

export type PerimetersSlice = PerimetersState & { actions: PerimetersActions }

// Default wall thickness value
const DEFAULT_PERIMETER_WALL_THICKNESS = createLength(440) // 44cm for strawbale walls

// Step 1: Create infinite inside and outside lines for each wall wall
const createInfiniteLines = (
  boundary: Polygon2D,
  thicknesses: Length[]
): Array<{ inside: Line2D; outside: Line2D }> => {
  const numSides = boundary.points.length
  const infiniteLines: Array<{ inside: Line2D; outside: Line2D }> = []

  for (let i = 0; i < numSides; i++) {
    const startPoint = boundary.points[i]
    const endPoint = boundary.points[(i + 1) % numSides]
    const wallThickness = thicknesses[i]

    // Create line from boundary points
    const insideLine = lineFromPoints(startPoint, endPoint)
    if (!insideLine) {
      throw new Error('Wall wall cannot have zero length')
    }

    // Calculate outside direction and create outside line
    const outsideDirection = perpendicularCCW(insideLine.direction)
    const outsidePoint = add(startPoint, scale(outsideDirection, wallThickness))
    const outsideLine = { point: outsidePoint, direction: insideLine.direction }

    infiniteLines.push({ inside: insideLine, outside: outsideLine })
  }

  return infiniteLines
}

// Step 2: Calculate corner points (both inside and outside) as intersections of adjacent lines
const calculateCornerPoints = (
  boundary: Polygon2D,
  thicknesses: Length[],
  infiniteLines: Array<{ inside: Line2D; outside: Line2D }>,
  existingCorners?: PerimeterCorner[]
): PerimeterCorner[] => {
  const numSides = boundary.points.length
  const corners: PerimeterCorner[] = []

  for (let i = 0; i < numSides; i++) {
    const prevIndex = (i - 1 + numSides) % numSides
    const prevOutsideLine = infiniteLines[prevIndex].outside
    const currentOutsideLine = infiniteLines[i].outside

    // Inside point is the boundary point
    const insidePoint = boundary.points[i]

    // Find intersection of adjacent outside lines
    const intersection = lineIntersection(prevOutsideLine, currentOutsideLine)

    let outsidePoint: Vec2
    if (intersection) {
      outsidePoint = intersection
    } else {
      // No intersection means the walls are colinear (parallel)
      // Project the boundary point outward by the maximum thickness of adjacent walls
      const prevThickness = thicknesses[prevIndex]
      const currentThickness = thicknesses[i]
      const maxThickness = Math.max(prevThickness, currentThickness)

      // Use the outside direction from either wall (they should be the same for colinear walls)
      const outsideDirection = perpendicularCCW(currentOutsideLine.direction)
      outsidePoint = add(boundary.points[i], scale(outsideDirection, maxThickness))
    }

    // Preserve existing corner data if available
    const existingCorner = existingCorners?.[i]
    corners.push({
      id: existingCorner?.id ?? createPerimeterCornerId(),
      insidePoint,
      outsidePoint,
      constuctedByWall: existingCorner?.constuctedByWall ?? 'next'
    })
  }

  return corners
}

// Step 3: Determine correct wall endpoints using projection-based distance comparison
const calculateWallEndpoints = (
  boundary: Polygon2D,
  wallInputs: PartialWallInput[],
  corners: PerimeterCorner[],
  infiniteLines: Array<{ inside: Line2D; outside: Line2D }>
): PerimeterWall[] => {
  const numSides = boundary.points.length
  const finalWalls: PerimeterWall[] = []

  for (let i = 0; i < numSides; i++) {
    const boundaryStart = corners[i].insidePoint
    const boundaryEnd = corners[(i + 1) % numSides].insidePoint
    const wallMidpoint = midpoint(boundaryStart, boundaryEnd)

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

    // Choose endpoints based on which projection is closer to wall midpoint
    const startDistBoundary = distance(boundaryStart, wallMidpoint)
    const startDistCorner = distance(cornerStartOnInside, wallMidpoint)
    const endDistBoundary = distance(boundaryEnd, wallMidpoint)
    const endDistCorner = distance(cornerEndOnInside, wallMidpoint)

    const finalInsideStart = startDistBoundary <= startDistCorner ? boundaryStart : cornerStartOnInside
    const finalInsideEnd = endDistBoundary <= endDistCorner ? boundaryEnd : cornerEndOnInside
    const finalOutsideStart = startDistBoundary <= startDistCorner ? boundaryStartOnOutside : startCornerOutside
    const finalOutsideEnd = endDistBoundary <= endDistCorner ? boundaryEndOnOutside : endCornerOutside

    // Calculate final wall properties using utility functions
    const wallDirection = direction(finalInsideStart, finalInsideEnd)
    const outsideDirection = perpendicularCCW(wallDirection)

    const finalInsideLine = { start: finalInsideStart, end: finalInsideEnd }
    const finalOutsideLine = { start: finalOutsideStart, end: finalOutsideEnd }

    const insideLength = distance(boundaryStart, boundaryEnd)
    const outsideLength = distance(startCornerOutside, endCornerOutside)
    const wallLength = distance(finalInsideStart, finalInsideEnd)

    finalWalls.push({
      ...wallInputs[i], // Preserve existing wall data like openings and construction method
      insideLength,
      outsideLength,
      wallLength,
      insideLine: finalInsideLine,
      outsideLine: finalOutsideLine,
      direction: wallDirection,
      outsideDirection
    })
  }

  return finalWalls
}

// Helper function to create wall walls and corners simultaneously using the simplified approach
const createWallsAndCorners = (
  boundary: Polygon2D,
  constructionMethodId: PerimeterConstructionMethodId,
  thickness: Length,
  existingCorners?: PerimeterCorner[]
): { walls: PerimeterWall[]; corners: PerimeterCorner[] } => {
  // Use shared functions for the three-step process
  const thicknesses = Array(boundary.points.length).fill(thickness)
  const infiniteLines = createInfiniteLines(boundary, thicknesses)
  const corners = calculateCornerPoints(boundary, thicknesses, infiniteLines, existingCorners)

  // Create initial walls with uniform thickness and construction type
  const initialWalls: PartialWallInput[] = []
  for (let i = 0; i < boundary.points.length; i++) {
    initialWalls.push({
      id: createPerimeterWallId(),
      thickness,
      constructionMethodId,
      openings: []
    })
  }
  const walls = calculateWallEndpoints(boundary, initialWalls, corners, infiniteLines)

  return { walls, corners }
}

// Helper function to find valid gaps in a wall wall for opening placement

// Private helper function to validate opening placement on a wall
const validateOpeningOnWall = (
  wall: PerimeterWall,
  offsetFromStart: Length,
  width: Length,
  excludedOpening?: OpeningId | undefined
): boolean => {
  // Validate width
  if (width <= 0) {
    return false
  }

  // Check bounds - wallLength and opening dimensions should be in same units
  const openingEnd = createLength(offsetFromStart + width)
  if (offsetFromStart < 0 || openingEnd > wall.wallLength) {
    return false
  }

  // Check overlap with existing openings
  for (const existing of wall.openings) {
    if (existing.id === excludedOpening) continue

    const existingStart = existing.offsetFromStart
    const existingEnd = createLength(existing.offsetFromStart + existing.width)

    if (!(openingEnd <= existingStart || offsetFromStart >= existingEnd)) {
      return false
    }
  }

  return true
}

export const createPerimetersSlice: StateCreator<PerimetersSlice, [['zustand/immer', never]], [], PerimetersSlice> = (
  set,
  get
) => ({
  perimeters: {},

  actions: {
    // CRUD operations
    addPerimeter: (
      storeyId: StoreyId,
      boundary: Polygon2D,
      constructionMethodId: PerimeterConstructionMethodId,
      thickness?: Length,
      baseRingBeamMethodId?: RingBeamConstructionMethodId,
      topRingBeamMethodId?: RingBeamConstructionMethodId
    ) => {
      if (boundary.points.length < 3) {
        throw new Error('Perimeter boundary must have at least 3 points')
      }

      const wallThickness = thickness ?? DEFAULT_PERIMETER_WALL_THICKNESS

      if (wallThickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      const { walls, corners } = createWallsAndCorners(boundary, constructionMethodId, wallThickness)

      const perimeter: Perimeter = {
        id: createPerimeterId(),
        storeyId,
        walls,
        corners,
        baseRingBeamMethodId,
        topRingBeamMethodId
      }

      set(state => {
        state.perimeters[perimeter.id] = perimeter
      })

      return perimeter
    },

    removePerimeter: (perimeterId: PerimeterId) => {
      set(state => {
        delete state.perimeters[perimeterId]
      })
    },

    // Corner deletion: removes the corner and its corresponding boundary point,
    // merging the two adjacent walls into one
    removePerimeterCorner: (perimeterId: PerimeterId, cornerId: PerimeterCornerId): boolean => {
      const state = get()
      const perimeter = state.perimeters[perimeterId]
      if (!perimeter) return false

      const cornerIndex = perimeter.corners.findIndex(c => c.id === cornerId)
      if (cornerIndex === -1) return false

      // Need at least 4 corners to remove one (minimum 3 sides after removal)
      if (perimeter.corners.length < 4) return false

      // Create new boundary by removing the point at cornerIndex
      const newBoundaryPoints = perimeter.corners.map(c => c.insidePoint)
      newBoundaryPoints.splice(cornerIndex, 1)

      // Validate the new polygon wouldn't self-intersect
      if (wouldClosingPolygonSelfIntersect(newBoundaryPoints)) return false

      // Create new walls array by:
      // 1. Removing the wall at cornerIndex (which ends at the deleted corner)
      // 2. Removing the wall at (cornerIndex - 1) % length (which starts from the deleted corner)
      // 3. Adding a new wall that bridges these two
      const prevWallIndex = (cornerIndex - 1 + perimeter.walls.length) % perimeter.walls.length
      const currentWallIndex = cornerIndex

      const newWalls = [...perimeter.walls]
      const removedWall1 = newWalls[prevWallIndex]
      const removedWall2 = newWalls[currentWallIndex]

      // Remove the two walls (remove higher index first to avoid shifting)
      if (currentWallIndex > prevWallIndex) {
        newWalls.splice(currentWallIndex, 1)
        newWalls.splice(prevWallIndex, 1)
      } else {
        newWalls.splice(prevWallIndex, 1)
        newWalls.splice(currentWallIndex, 1)
      }

      // Use the thicker of the two walls for the new merged wall
      const newThickness = createLength(Math.max(removedWall1.thickness, removedWall2.thickness))
      const newConstructionMethodId = removedWall1.constructionMethodId // Use the first wall's construction method

      // Create new wall with merged properties (openings are deleted as they don't make sense on new geometry)
      const mergedWallInput: PartialWallInput = {
        id: createPerimeterWallId(),
        thickness: newThickness,
        constructionMethodId: newConstructionMethodId,
        openings: [] // Openings are deleted as they don't make sense on the new merged wall
      }

      // Insert the merged wall at the correct position
      const insertIndex = Math.min(prevWallIndex, currentWallIndex)
      newWalls.splice(insertIndex, 0, mergedWallInput as PerimeterWall)

      // Remove the corner from corners array
      const newCorners = [...perimeter.corners]
      newCorners.splice(cornerIndex, 1)

      // Recalculate geometry for the modified polygon
      const newBoundary = { points: newBoundaryPoints }
      const thicknesses = newWalls.map((s: PartialWallInput) => s.thickness)
      const infiniteLines = createInfiniteLines(newBoundary, thicknesses)
      const updatedCorners = calculateCornerPoints(newBoundary, thicknesses, infiniteLines, newCorners)
      const finalWalls = calculateWallEndpoints(
        newBoundary,
        newWalls as PartialWallInput[],
        updatedCorners,
        infiniteLines
      )

      const updatedPerimeter: Perimeter = {
        ...perimeter,
        walls: finalWalls,
        corners: updatedCorners
      }

      set(state => {
        state.perimeters[perimeterId] = updatedPerimeter
      })

      return true
    },

    // Wall deletion: removes the target wall and merges the two adjacent walls into one,
    // also removing the two corner points that connected these three walls
    removePerimeterWall: (perimeterId: PerimeterId, wallId: PerimeterWallId): boolean => {
      const state = get()
      const perimeter = state.perimeters[perimeterId]
      if (!perimeter) return false

      const wallIndex = perimeter.walls.findIndex(s => s.id === wallId)
      if (wallIndex === -1) return false

      // Need at least 5 walls to remove one (results in 3 walls minimum: 5 - 3 + 1 = 3)
      if (perimeter.walls.length < 5) return false

      const numWalls = perimeter.walls.length

      // Get indices of the three walls involved: previous, target, next
      const prevWallIndex = (wallIndex - 1 + numWalls) % numWalls
      const nextWallIndex = (wallIndex + 1) % numWalls

      // Create new boundary by removing the two corner points that connected these walls
      // Remove the corner at wallIndex (between prev and target walls)
      // Remove the corner at (wallIndex + 1) % length (between target and next walls)
      const newBoundaryPoints = perimeter.corners.map(c => c.insidePoint)
      const cornerIndex1 = wallIndex
      const cornerIndex2 = (wallIndex + 1) % perimeter.corners.length

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

      // Remove the three walls (target and adjacent ones) and replace with one merged wall
      const prevWall = perimeter.walls[prevWallIndex]
      const targetWall = perimeter.walls[wallIndex]
      const nextWall = perimeter.walls[nextWallIndex]

      // Create merged wall with combined properties
      const newThickness = createLength(Math.max(prevWall.thickness, targetWall.thickness, nextWall.thickness))
      const newConstructionMethodId = prevWall.constructionMethodId // Use the previous wall's construction method

      const mergedWallInput: PartialWallInput = {
        id: createPerimeterWallId(),
        thickness: newThickness,
        constructionMethodId: newConstructionMethodId,
        openings: [] // Openings are deleted as they don't make sense on the new merged wall
      }

      // Create new walls array by removing the three walls and inserting the merged one
      const newWalls = [...perimeter.walls]

      // Remove the three walls (remove from highest index to avoid shifting)
      const indicesToRemove = [prevWallIndex, wallIndex, nextWallIndex].sort((a, b) => b - a)
      for (const index of indicesToRemove) {
        newWalls.splice(index, 1)
      }

      // Insert the merged wall at the position where the previous wall was
      const insertIndex = Math.min(prevWallIndex, wallIndex, nextWallIndex)
      newWalls.splice(insertIndex, 0, mergedWallInput as PerimeterWall)

      // Remove the corresponding corners
      const newCorners = [...perimeter.corners]
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
      const thicknesses = newWalls.map((s: PartialWallInput) => s.thickness)
      const infiniteLines = createInfiniteLines(newBoundary, thicknesses)
      const updatedCorners = calculateCornerPoints(newBoundary, thicknesses, infiniteLines, newCorners)
      const finalWalls = calculateWallEndpoints(
        newBoundary,
        newWalls as PartialWallInput[],
        updatedCorners,
        infiniteLines
      )

      const updatedPerimeter: Perimeter = {
        ...perimeter,
        walls: finalWalls,
        corners: updatedCorners
      }

      set(state => {
        state.perimeters[perimeterId] = updatedPerimeter
      })

      return true
    },

    // Update operations
    updatePerimeterWallConstructionMethod: (
      perimeterId: PerimeterId,
      wallId: PerimeterWallId,
      methodId: PerimeterConstructionMethodId
    ) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

        const wallIndex = perimeter.walls.findIndex((wall: PerimeterWall) => wall.id === wallId)
        if (wallIndex !== -1) {
          perimeter.walls[wallIndex].constructionMethodId = methodId
        }
      })
    },

    updatePerimeterWallThickness: (perimeterId: PerimeterId, wallId: PerimeterWallId, thickness: Length) => {
      if (thickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

        const wallIndex = perimeter.walls.findIndex((wall: PerimeterWall) => wall.id === wallId)
        if (wallIndex !== -1) {
          // Update the specific wall thickness first
          perimeter.walls[wallIndex].thickness = thickness

          // Use shared functions for the three-step process with mixed thickness
          const boundary = { points: perimeter.corners.map((c: PerimeterCorner) => c.insidePoint) }
          const thicknesses = perimeter.walls.map((wall: PerimeterWall) => wall.thickness)
          const infiniteLines = createInfiniteLines(boundary, thicknesses)
          const updatedCorners = calculateCornerPoints(boundary, thicknesses, infiniteLines, perimeter.corners)
          const finalWalls = calculateWallEndpoints(boundary, perimeter.walls, updatedCorners, infiniteLines)

          perimeter.walls = finalWalls
          perimeter.corners = updatedCorners
        }
      })
    },

    updatePerimeterCornerConstructedByWall: (
      perimeterId: PerimeterId,
      cornerId: PerimeterCornerId,
      constructedByWall: 'previous' | 'next'
    ) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

        const cornerIndex = perimeter.corners.findIndex((c: PerimeterCorner) => c.id === cornerId)
        if (cornerIndex !== -1) {
          perimeter.corners[cornerIndex].constuctedByWall = constructedByWall
        }
      })
    },

    // Opening operations
    addPerimeterWallOpening: (
      perimeterId: PerimeterId,
      wallId: PerimeterWallId,
      openingParams: Omit<Opening, 'id'>
    ) => {
      if (openingParams.width <= 0) {
        throw new Error('Opening width must be greater than 0')
      }
      if (openingParams.height <= 0) {
        throw new Error('Opening height must be greater than 0')
      }
      if (openingParams.sillHeight != null && openingParams.sillHeight < 0) {
        throw new Error('Window sill height must be non-negative')
      }

      // Basic validation checks
      if (openingParams.offsetFromStart < 0) {
        throw new Error('Opening offset from start must be non-negative')
      }

      const wall = get().perimeters[perimeterId]?.walls.find((wall: PerimeterWall) => wall.id === wallId) ?? null
      if (!wall) {
        throw new Error('Wall does not exist')
      }

      if (!validateOpeningOnWall(wall, openingParams.offsetFromStart, openingParams.width)) {
        throw new Error('Opening placement is not valid')
      }

      // Auto-generate ID for the new opening
      const openingId = createOpeningId()
      const newOpening: Opening = {
        id: openingId,
        ...openingParams
      }

      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

        const wallIndex = perimeter.walls.findIndex((wall: PerimeterWall) => wall.id === wallId)
        if (wallIndex !== -1) {
          perimeter.walls[wallIndex].openings.push(newOpening)
        }
      })

      return openingId
    },

    removePerimeterWallOpening: (perimeterId: PerimeterId, wallId: PerimeterWallId, openingId: OpeningId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

        const wallIndex = perimeter.walls.findIndex((wall: PerimeterWall) => wall.id === wallId)
        if (wallIndex !== -1) {
          const wall = perimeter.walls[wallIndex]
          const openingIndex = wall.openings.findIndex((o: Opening) => o.id === openingId)
          if (openingIndex !== -1) {
            wall.openings.splice(openingIndex, 1)
          }
        }
      })
    },

    // Getters
    getPerimeterById: (perimeterId: PerimeterId) => {
      return get().perimeters[perimeterId] ?? null
    },

    // Updated and new getter methods
    getPerimeterWallById: (perimeterId: PerimeterId, wallId: PerimeterWallId) => {
      const perimeter = get().perimeters[perimeterId]
      if (perimeter == null) return null

      return perimeter.walls.find((wall: PerimeterWall) => wall.id === wallId) ?? null
    },

    getPerimeterCornerById: (perimeterId: PerimeterId, cornerId: PerimeterCornerId) => {
      const perimeter = get().perimeters[perimeterId]
      if (perimeter == null) return null

      return perimeter.corners.find((corner: PerimeterCorner) => corner.id === cornerId) ?? null
    },

    getPerimeterWallOpeningById: (perimeterId: PerimeterId, wallId: PerimeterWallId, openingId: OpeningId) => {
      const perimeter = get().perimeters[perimeterId]
      if (perimeter == null) return null

      const wall = perimeter.walls.find((wall: PerimeterWall) => wall.id === wallId)
      if (wall == null) return null

      return wall.openings.find((opening: Opening) => opening.id === openingId) ?? null
    },

    updatePerimeterWallOpening: (
      perimeterId: PerimeterId,
      wallId: PerimeterWallId,
      openingId: OpeningId,
      updates: Partial<Omit<Opening, 'id'>>
    ) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

        const wallIndex = perimeter.walls.findIndex((wall: PerimeterWall) => wall.id === wallId)
        if (wallIndex !== -1) {
          const wall = perimeter.walls[wallIndex]
          const openingIndex = wall.openings.findIndex((o: Opening) => o.id === openingId)
          if (openingIndex !== -1) {
            const updatedOpening = {
              ...wall.openings[openingIndex],
              ...updates
            }

            if (validateOpeningOnWall(wall, updatedOpening.offsetFromStart, updatedOpening.width, openingId)) {
              Object.assign(wall.openings[openingIndex], updates)
            }
          }
        }
      })
    },

    getPerimetersByStorey: (storeyId: StoreyId) => {
      return Object.values(get().perimeters).filter((p: Perimeter) => p.storeyId === storeyId)
    },

    // Opening validation methods implementation
    isPerimeterWallOpeningPlacementValid: (
      perimeterId: PerimeterId,
      wallId: PerimeterWallId,
      offsetFromStart: Length,
      width: Length,
      excludedOpening?: OpeningId
    ) => {
      const wall = get().perimeters[perimeterId]?.walls.find((wall: PerimeterWall) => wall.id === wallId) ?? null
      if (!wall) {
        throw new Error(`Wall wall not found: perimeter ${perimeterId}, wall ${wallId}`)
      }

      // Validate width
      if (width <= 0) {
        throw new Error(`Opening width must be greater than 0, got ${width}`)
      }

      return validateOpeningOnWall(wall, offsetFromStart, width, excludedOpening)
    },

    findNearestValidPerimeterWallOpeningPosition: (
      perimeterId: PerimeterId,
      wallId: PerimeterWallId,
      preferredStartOffset: Length,
      width: Length,
      excludedOpening?: OpeningId
    ): Length | null => {
      const wall = get().perimeters[perimeterId]?.walls.find((wall: PerimeterWall) => wall.id === wallId) ?? null
      if (!wall) return null
      // wallLength and opening dimensions should be in same units
      if (width > wall.wallLength) return null

      // Snap to wall bounds
      let start = Math.max(preferredStartOffset, 0)
      let end = start + width
      if (end > wall.wallLength) {
        end = wall.wallLength
        start = end - width
      }

      if (wall.openings.length === 0) return start as Length

      // Sort existing openings by position
      const sortedOpenings = [...wall.openings]
        .filter(o => o.id !== excludedOpening)
        .sort((a, b) => a.offsetFromStart - b.offsetFromStart)

      const afterIndex = sortedOpenings.findIndex(o => o.offsetFromStart >= start)

      const previousOpening =
        afterIndex > 0
          ? sortedOpenings[afterIndex - 1]
          : afterIndex === -1
            ? sortedOpenings[sortedOpenings.length - 1]
            : null
      const nextOpening = afterIndex !== -1 ? sortedOpenings[afterIndex] : null

      const intersectsPrevious = previousOpening && start < previousOpening.offsetFromStart + previousOpening.width
      const intersectsNext = nextOpening && end > nextOpening.offsetFromStart

      if (!intersectsPrevious && !intersectsNext) {
        return start as Length
      }

      // If we intersect with both, the gap is too small
      if (intersectsPrevious && intersectsNext) {
        return null
      }

      // Otherwise find the shortest shift
      let bestOffset: Length | null = null
      let bestDistance = Infinity

      // If we intersect with previous opening, try shifting right (after previous)
      if (intersectsPrevious && previousOpening) {
        const shiftedOffset = createLength(previousOpening.offsetFromStart + previousOpening.width)
        const shiftDistance = Math.abs(shiftedOffset - preferredStartOffset)
        const shiftedEnd = shiftedOffset + width

        // Check if shift is within the wall and doesn't intersect with next
        if (shiftedEnd <= wall.wallLength && (!nextOpening || shiftedEnd <= nextOpening.offsetFromStart)) {
          bestOffset = shiftedOffset
          bestDistance = shiftDistance
        }
      }

      // If we intersect with next opening, try shifting left (before next)
      if (intersectsNext && nextOpening) {
        const shiftedOffset = createLength(nextOpening.offsetFromStart - width)
        const shiftDistance = Math.abs(shiftedOffset - preferredStartOffset)

        // Check if shift is within the wall and doesn't intersect with previous
        if (
          shiftedOffset >= 0 &&
          (!previousOpening || shiftedOffset >= previousOpening.offsetFromStart + previousOpening.width)
        ) {
          if (shiftDistance < bestDistance) {
            bestOffset = shiftedOffset
            bestDistance = shiftDistance
          }
        }
      }

      return bestOffset
    },

    // Movement operations for MoveTool
    movePerimeter: (perimeterId: PerimeterId, offset: Vec2) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        // Translate all boundary points by the offset
        const newBoundary = perimeter.corners.map((corner: PerimeterCorner) => add(corner.insidePoint, offset))

        // Create new boundary polygon and recalculate all geometry
        const newBoundaryPolygon = { points: newBoundary }
        const thicknesses = perimeter.walls.map((wall: PerimeterWall) => wall.thickness)
        const infiniteLines = createInfiniteLines(newBoundaryPolygon, thicknesses)
        const updatedCorners = calculateCornerPoints(newBoundaryPolygon, thicknesses, infiniteLines, perimeter.corners)

        // Create wall inputs preserving existing data
        const wallInputs: PartialWallInput[] = perimeter.walls.map((wall: PerimeterWall) => ({
          id: wall.id,
          thickness: wall.thickness,
          constructionMethodId: wall.constructionMethodId,
          openings: wall.openings
        }))

        const finalWalls = calculateWallEndpoints(newBoundaryPolygon, wallInputs, updatedCorners, infiniteLines)

        perimeter.walls = finalWalls
        perimeter.corners = updatedCorners
      })

      return true
    },

    updatePerimeterBoundary: (perimeterId: PerimeterId, newBoundary: Vec2[]) => {
      if (newBoundary.length < 3) {
        return false
      }

      // Check if the new polygon would self-intersect
      if (wouldClosingPolygonSelfIntersect(newBoundary)) {
        return false
      }

      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        // Create new boundary polygon and recalculate all geometry
        const newBoundaryPolygon = { points: newBoundary }
        const thicknesses = perimeter.walls.map((wall: PerimeterWall) => wall.thickness)
        const infiniteLines = createInfiniteLines(newBoundaryPolygon, thicknesses)
        const updatedCorners = calculateCornerPoints(newBoundaryPolygon, thicknesses, infiniteLines, perimeter.corners)

        // Create wall inputs preserving existing data
        const wallInputs: PartialWallInput[] = perimeter.walls.map((wall: PerimeterWall) => ({
          id: wall.id,
          thickness: wall.thickness,
          constructionMethodId: wall.constructionMethodId,
          openings: wall.openings
        }))

        const finalWalls = calculateWallEndpoints(newBoundaryPolygon, wallInputs, updatedCorners, infiniteLines)

        perimeter.walls = finalWalls
        perimeter.corners = updatedCorners
      })

      return true
    },

    // Ring beam configuration
    setPerimeterBaseRingBeam: (perimeterId: PerimeterId, methodId: RingBeamConstructionMethodId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        perimeter.baseRingBeamMethodId = methodId
      })
    },

    setPerimeterTopRingBeam: (perimeterId: PerimeterId, methodId: RingBeamConstructionMethodId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        perimeter.topRingBeamMethodId = methodId
      })
    },

    removePerimeterBaseRingBeam: (perimeterId: PerimeterId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        perimeter.baseRingBeamMethodId = undefined
      })
    },

    removePerimeterTopRingBeam: (perimeterId: PerimeterId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        perimeter.topRingBeamMethodId = undefined
      })
    }
  }
})
