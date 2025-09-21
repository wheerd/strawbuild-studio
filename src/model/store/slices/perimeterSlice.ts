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
  createVec2,
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

      let perimeter: Perimeter | undefined

      set(state => {
        // Create corners from boundary points
        const corners: PerimeterCorner[] = boundary.points.map(point => ({
          id: createPerimeterCornerId(),
          insidePoint: point,
          outsidePoint: createVec2(0, 0), // Will be calculated by updatePerimeterGeometry
          constuctedByWall: 'next'
        }))

        // Create walls with placeholder geometry
        const walls: PerimeterWall[] = boundary.points.map(() => ({
          id: createPerimeterWallId(),
          thickness: wallThickness,
          constructionMethodId,
          openings: [],
          // Geometry properties will be set by updatePerimeterGeometry
          insideLength: createLength(0),
          outsideLength: createLength(0),
          wallLength: createLength(0),
          insideLine: { start: createVec2(0, 0), end: createVec2(0, 0) },
          outsideLine: { start: createVec2(0, 0), end: createVec2(0, 0) },
          direction: createVec2(1, 0),
          outsideDirection: createVec2(0, 1)
        }))

        perimeter = {
          id: createPerimeterId(),
          storeyId,
          walls,
          corners,
          baseRingBeamMethodId,
          topRingBeamMethodId
        }

        // Calculate all geometry using the mutable helper
        updatePerimeterGeometry(perimeter)

        state.perimeters[perimeter.id] = perimeter
      })

      return perimeter!
    },

    removePerimeter: (perimeterId: PerimeterId) => {
      set(state => {
        delete state.perimeters[perimeterId]
      })
    },

    // Corner deletion: removes the corner and its corresponding boundary point,
    // merging the two adjacent walls into one
    removePerimeterCorner: (perimeterId: PerimeterId, cornerId: PerimeterCornerId): boolean => {
      let success = false
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        const cornerIndex = perimeter.corners.findIndex((c: PerimeterCorner) => c.id === cornerId)
        if (cornerIndex === -1 || perimeter.corners.length < 4) return

        // Validation - check if removal would create self-intersecting polygon
        const newBoundaryPoints = perimeter.corners.map((c: PerimeterCorner) => c.insidePoint)
        newBoundaryPoints.splice(cornerIndex, 1)
        if (wouldClosingPolygonSelfIntersect(newBoundaryPoints)) return

        // Use helper to do all the work
        removeCornerAndMergeWalls(perimeter, cornerIndex)
        success = true
      })
      return success
    },

    // Wall deletion: removes the target wall and merges the two adjacent walls into one,
    // also removing the two corner points that connected these three walls
    removePerimeterWall: (perimeterId: PerimeterId, wallId: PerimeterWallId): boolean => {
      let success = false
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        const wallIndex = perimeter.walls.findIndex((wall: PerimeterWall) => wall.id === wallId)
        if (wallIndex === -1 || perimeter.walls.length < 5) return

        // Validation - check if removal would create self-intersecting polygon
        const newBoundaryPoints = perimeter.corners.map((c: PerimeterCorner) => c.insidePoint)
        const cornerIndex1 = wallIndex
        const cornerIndex2 = (wallIndex + 1) % perimeter.corners.length

        // Remove corners to test for self-intersection
        if (cornerIndex2 > cornerIndex1) {
          newBoundaryPoints.splice(cornerIndex2, 1)
          newBoundaryPoints.splice(cornerIndex1, 1)
        } else {
          newBoundaryPoints.splice(cornerIndex1, 1)
          newBoundaryPoints.splice(cornerIndex2, 1)
        }

        if (wouldClosingPolygonSelfIntersect(newBoundaryPoints)) return

        // Use helper to do all the work
        removeWallAndMergeAdjacent(perimeter, wallIndex)
        success = true
      })
      return success
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

        const wallIndex = perimeter.walls.findIndex(w => w.id === wallId)
        if (wallIndex !== -1) {
          perimeter.walls[wallIndex].thickness = thickness
          updatePerimeterGeometry(perimeter)
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

        const cornerIndex = perimeter.corners.findIndex(c => c.id === cornerId)
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
            const opening = wall.openings[openingIndex]
            if (
              validateOpeningOnWall(
                wall,
                updates.offsetFromStart ?? opening.offsetFromStart,
                updates.width ?? opening.width,
                openingId
              )
            ) {
              Object.assign(opening, updates)
            }
          }
        }
      })
    },

    getPerimetersByStorey: (storeyId: StoreyId) => Object.values(get().perimeters).filter(p => p.storeyId === storeyId),

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

        // Directly translate all corner points
        perimeter.corners.forEach((corner: PerimeterCorner) => {
          corner.insidePoint = add(corner.insidePoint, offset)
          corner.outsidePoint = add(corner.outsidePoint, offset)
        })

        // Directly translate all wall line endpoints
        perimeter.walls.forEach((wall: PerimeterWall) => {
          wall.insideLine.start = add(wall.insideLine.start, offset)
          wall.insideLine.end = add(wall.insideLine.end, offset)
          wall.outsideLine.start = add(wall.outsideLine.start, offset)
          wall.outsideLine.end = add(wall.outsideLine.end, offset)
        })
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

        // Update corner inside points directly
        perimeter.corners.forEach((corner: PerimeterCorner, index: number) => {
          corner.insidePoint = newBoundary[index]
        })

        // Recalculate all geometry with the new boundary
        updatePerimeterGeometry(perimeter)
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

// Step 2: Recalculate corner outside point as intersections of adjacent lines
const updateCornerOutsidePoint = (
  corner: PerimeterCorner,
  prevThickness: Length,
  nextThickness: Length,
  prevOutsideLine: Line2D,
  nextOutsideLine: Line2D
): void => {
  const intersection = lineIntersection(prevOutsideLine, nextOutsideLine)

  if (intersection) {
    corner.outsidePoint = intersection
  } else {
    // No intersection means the walls are colinear (parallel)
    // Project the boundary point outward by the maximum thickness of adjacent walls
    const maxThickness = Math.max(prevThickness, nextThickness)

    // Use the outside direction from either wall (they should be the same for colinear walls)
    const outsideDirection = perpendicularCCW(nextOutsideLine.direction)
    corner.outsidePoint = add(corner.insidePoint, scale(outsideDirection, maxThickness))
  }
}
// Step 2: Calculate corner points (both inside and outside) as intersections of adjacent lines
const updateAllCornerOutsidePoints = (
  corners: PerimeterCorner[],
  thicknesses: Length[],
  infiniteLines: Array<{ inside: Line2D; outside: Line2D }>
): void => {
  const numSides = corners.length

  for (let i = 0; i < numSides; i++) {
    const prevIndex = (i - 1 + numSides) % numSides
    const prevOutsideLine = infiniteLines[prevIndex].outside
    const currentOutsideLine = infiniteLines[i].outside
    const prevThickness = thicknesses[prevIndex]
    const currentThickness = thicknesses[i]
    updateCornerOutsidePoint(corners[i], prevThickness, currentThickness, prevOutsideLine, currentOutsideLine)
  }
}
const updateWallGeometry = (wall: PerimeterWall, startCorner: PerimeterCorner, endCorner: PerimeterCorner): void => {
  const insideStart = startCorner.insidePoint
  const insideEnd = endCorner.insidePoint
  const wallMidpoint = midpoint(insideStart, insideEnd)

  const startCornerOutside = startCorner.outsidePoint
  const endCornerOutside = endCorner.outsidePoint

  // Calculate wall direction and outside direction
  const wallDirection = direction(insideStart, insideEnd)
  const outsideDirection = perpendicularCCW(wallDirection)

  // Create the infinite lines for this wall
  const insideLine: Line2D = {
    point: insideStart,
    direction: wallDirection
  }
  const outsideLine: Line2D = {
    point: add(insideStart, scale(outsideDirection, wall.thickness)),
    direction: wallDirection
  }

  // Project boundary points onto outside line
  const boundaryStartOnOutside = projectPointOntoLine(insideStart, outsideLine)
  const boundaryEndOnOutside = projectPointOntoLine(insideEnd, outsideLine)

  // Project corner outside points onto inside line
  const cornerStartOnInside = projectPointOntoLine(startCornerOutside, insideLine)
  const cornerEndOnInside = projectPointOntoLine(endCornerOutside, insideLine)

  // Choose endpoints based on which projection is closer to wall midpoint
  const startDistBoundary = distance(insideStart, wallMidpoint)
  const startDistCorner = distance(cornerStartOnInside, wallMidpoint)
  const endDistBoundary = distance(insideEnd, wallMidpoint)
  const endDistCorner = distance(cornerEndOnInside, wallMidpoint)

  const finalInsideStart = startDistBoundary <= startDistCorner ? insideStart : cornerStartOnInside
  const finalInsideEnd = endDistBoundary <= endDistCorner ? insideEnd : cornerEndOnInside
  const finalOutsideStart = startDistBoundary <= startDistCorner ? boundaryStartOnOutside : startCornerOutside
  const finalOutsideEnd = endDistBoundary <= endDistCorner ? boundaryEndOnOutside : endCornerOutside

  // Directly mutate wall properties
  wall.insideLength = distance(insideStart, insideEnd)
  wall.outsideLength = distance(startCornerOutside, endCornerOutside)
  wall.wallLength = distance(finalInsideStart, finalInsideEnd)
  wall.insideLine = { start: finalInsideStart, end: finalInsideEnd }
  wall.outsideLine = { start: finalOutsideStart, end: finalOutsideEnd }
  wall.direction = wallDirection
  wall.outsideDirection = outsideDirection
}

// High-level helper to recalculate all perimeter geometry in place
const updatePerimeterGeometry = (perimeter: Perimeter): void => {
  const boundary = { points: perimeter.corners.map((c: PerimeterCorner) => c.insidePoint) }
  const thicknesses = perimeter.walls.map((wall: PerimeterWall) => wall.thickness)
  const infiniteLines = createInfiniteLines(boundary, thicknesses)

  // Update corner outside points in place
  updateAllCornerOutsidePoints(perimeter.corners, thicknesses, infiniteLines)

  // Update wall geometry in place
  for (let i = 0; i < perimeter.walls.length; i++) {
    const startCorner = perimeter.corners[i]
    const endCorner = perimeter.corners[(i + 1) % perimeter.corners.length]
    updateWallGeometry(perimeter.walls[i], startCorner, endCorner)
  }
}

// Helper to remove a corner and merge adjacent walls
const removeCornerAndMergeWalls = (perimeter: Perimeter, cornerIndex: number): void => {
  const prevWallIndex = (cornerIndex - 1 + perimeter.walls.length) % perimeter.walls.length
  const currentWallIndex = cornerIndex

  // Get wall properties for merging
  const wall1 = perimeter.walls[prevWallIndex]
  const wall2 = perimeter.walls[currentWallIndex]
  const mergedThickness = createLength(Math.max(wall1.thickness, wall2.thickness))

  perimeter.corners.splice(cornerIndex, 1)

  const mergedWall: PerimeterWall = {
    id: createPerimeterWallId(),
    thickness: mergedThickness,
    constructionMethodId: wall1.constructionMethodId,
    openings: [], // Openings are deleted as they don't make sense on new merged wall
    // Geometry properties will be set by updatePerimeterGeometry
    insideLength: createLength(0),
    outsideLength: createLength(0),
    wallLength: createLength(0),
    insideLine: { start: createVec2(0, 0), end: createVec2(0, 0) },
    outsideLine: { start: createVec2(0, 0), end: createVec2(0, 0) },
    direction: createVec2(1, 0),
    outsideDirection: createVec2(0, 1)
  }

  // Remove the two walls (remove higher index first to avoid shifting)
  if (currentWallIndex !== 0) {
    perimeter.walls.splice(prevWallIndex, 2, mergedWall)
  } else {
    perimeter.walls.splice(prevWallIndex, 1, mergedWall)
    perimeter.walls.splice(0, 1)
  }

  // Recalculate all geometry
  updatePerimeterGeometry(perimeter)
}

// Helper to remove a wall and merge the adjacent walls
const removeWallAndMergeAdjacent = (perimeter: Perimeter, wallIndex: number): void => {
  const numWalls = perimeter.walls.length
  const prevWallIndex = (wallIndex - 1 + numWalls) % numWalls
  const nextWallIndex = (wallIndex + 1) % numWalls

  // Get wall properties for merging
  const prevWall = perimeter.walls[prevWallIndex]
  const targetWall = perimeter.walls[wallIndex]
  const nextWall = perimeter.walls[nextWallIndex]
  const mergedThickness = createLength(Math.max(prevWall.thickness, targetWall.thickness, nextWall.thickness))

  // Remove the two corner points that connected these walls
  const cornerIndex1 = wallIndex
  const cornerIndex2 = (wallIndex + 1) % perimeter.corners.length

  // Remove corners (higher index first)
  if (cornerIndex2 > cornerIndex1) {
    perimeter.corners.splice(cornerIndex2, 1)
    perimeter.corners.splice(cornerIndex1, 1)
  } else {
    perimeter.corners.splice(cornerIndex1, 1)
    perimeter.corners.splice(cornerIndex2, 1)
  }

  // Remove the three walls (remove from highest index to avoid shifting)
  const indicesToRemove = [prevWallIndex, wallIndex, nextWallIndex].sort((a, b) => b - a)
  for (const index of indicesToRemove) {
    perimeter.walls.splice(index, 1)
  }

  // Add merged wall at the correct position
  const insertIndex = Math.min(prevWallIndex, wallIndex, nextWallIndex)
  const mergedWall: PerimeterWall = {
    id: createPerimeterWallId(),
    thickness: mergedThickness,
    constructionMethodId: prevWall.constructionMethodId,
    openings: [], // Openings are deleted
    // Geometry properties will be set by updatePerimeterGeometry
    insideLength: createLength(0),
    outsideLength: createLength(0),
    wallLength: createLength(0),
    insideLine: { start: createVec2(0, 0), end: createVec2(0, 0) },
    outsideLine: { start: createVec2(0, 0), end: createVec2(0, 0) },
    direction: createVec2(1, 0),
    outsideDirection: createVec2(0, 1)
  }
  perimeter.walls.splice(insertIndex, 0, mergedWall)

  // Recalculate all geometry
  updatePerimeterGeometry(perimeter)
}

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
