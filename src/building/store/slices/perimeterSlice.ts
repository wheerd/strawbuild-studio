import { vec2 } from 'gl-matrix'
import type { StateCreator } from 'zustand'

import type {
  OpeningId,
  PerimeterCornerId,
  PerimeterId,
  PerimeterWallId,
  RingBeamAssemblyId,
  StoreyId,
  WallAssemblyId
} from '@/building/model/ids'
import {
  createOpeningId,
  createPerimeterCornerId,
  createPerimeterId,
  createPerimeterWallId
} from '@/building/model/ids'
import type { Opening, Perimeter, PerimeterCorner, PerimeterReferenceSide, PerimeterWall } from '@/building/model/model'
import type { Length, Line2D, Polygon2D } from '@/shared/geometry'
import {
  direction,
  lineFromPoints,
  lineIntersection,
  midpoint,
  perpendicularCCW,
  projectPointOntoLine,
  radiansToDegrees
} from '@/shared/geometry'
import { ensurePolygonIsClockwise, wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'

export interface PerimetersState {
  perimeters: Record<PerimeterId, Perimeter>
}

export interface PerimetersActions {
  addPerimeter: (
    storeyId: StoreyId,
    boundary: Polygon2D,
    wallAssemblyId: WallAssemblyId,
    thickness?: Length,
    baseRingBeamAssemblyId?: RingBeamAssemblyId,
    topRingBeamAssemblyId?: RingBeamAssemblyId,
    referenceSide?: PerimeterReferenceSide
  ) => Perimeter
  removePerimeter: (perimeterId: PerimeterId) => void

  setPerimeterReferenceSide: (perimeterId: PerimeterId, referenceSide: PerimeterReferenceSide) => void

  // Entity deletion operations
  removePerimeterCorner: (perimeterId: PerimeterId, cornerId: PerimeterCornerId) => boolean
  removePerimeterWall: (perimeterId: PerimeterId, wallId: PerimeterWallId) => boolean

  // Wall splitting operation
  splitPerimeterWall: (
    perimeterId: PerimeterId,
    wallId: PerimeterWallId,
    splitPosition: Length
  ) => PerimeterWallId | null

  // Updated to use IDs instead of indices
  updatePerimeterWallAssembly: (perimeterId: PerimeterId, wallId: PerimeterWallId, assemblyId: WallAssemblyId) => void
  updatePerimeterWallThickness: (perimeterId: PerimeterId, wallId: PerimeterWallId, thickness: Length) => void

  // Bulk update actions for all walls in a perimeter
  updateAllPerimeterWallsAssembly: (perimeterId: PerimeterId, assemblyId: WallAssemblyId) => void
  updateAllPerimeterWallsThickness: (perimeterId: PerimeterId, thickness: Length) => void

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
  movePerimeter: (perimeterId: PerimeterId, offset: vec2) => boolean
  updatePerimeterBoundary: (perimeterId: PerimeterId, newBoundary: vec2[]) => boolean

  // Ring beam configuration
  setPerimeterBaseRingBeam: (perimeterId: PerimeterId, assemblyId: RingBeamAssemblyId) => void
  setPerimeterTopRingBeam: (perimeterId: PerimeterId, assemblyId: RingBeamAssemblyId) => void
  removePerimeterBaseRingBeam: (perimeterId: PerimeterId) => void
  removePerimeterTopRingBeam: (perimeterId: PerimeterId) => void
}

export type PerimetersSlice = PerimetersState & { actions: PerimetersActions }

// Default wall thickness value
const DEFAULT_PERIMETER_WALL_THICKNESS = 420 // 44cm for strawbale walls

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
      wallAssemblyId: WallAssemblyId,
      thickness?: Length,
      baseRingBeamAssemblyId?: RingBeamAssemblyId,
      topRingBeamAssemblyId?: RingBeamAssemblyId,
      referenceSide: PerimeterReferenceSide = 'inside'
    ) => {
      if (boundary.points.length < 3) {
        throw new Error('Perimeter boundary must have at least 3 points')
      }
      boundary = ensurePolygonIsClockwise(boundary)

      const wallThickness = thickness ?? DEFAULT_PERIMETER_WALL_THICKNESS

      if (wallThickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      let perimeter: Perimeter | undefined

      set(state => {
        // Create corners from boundary points
        const corners: PerimeterCorner[] = boundary.points.map(point => ({
          id: createPerimeterCornerId(),
          // The other point will be calculated by updatePerimeterGeometry
          insidePoint: referenceSide === 'inside' ? vec2.clone(point) : vec2.fromValues(0, 0),
          outsidePoint: referenceSide === 'outside' ? vec2.clone(point) : vec2.fromValues(0, 0),
          constructedByWall: 'next',
          interiorAngle: 0, // Will be calculated by updatePerimeterGeometry
          exteriorAngle: 0 // Will be calculated by updatePerimeterGeometry
        }))

        // Create walls with placeholder geometry
        const walls: PerimeterWall[] = boundary.points.map(() => ({
          id: createPerimeterWallId(),
          thickness: wallThickness,
          wallAssemblyId,
          openings: [],
          // Geometry properties will be set by updatePerimeterGeometry
          insideLength: 0,
          outsideLength: 0,
          wallLength: 0,
          insideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(0, 0) },
          outsideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(0, 0) },
          direction: vec2.fromValues(1, 0),
          outsideDirection: vec2.fromValues(0, 1)
        }))

        perimeter = {
          id: createPerimeterId(),
          storeyId,
          referenceSide,
          walls,
          corners,
          baseRingBeamAssemblyId,
          topRingBeamAssemblyId
        }

        // Calculate all geometry using the mutable helper
        updatePerimeterGeometry(perimeter)

        state.perimeters[perimeter.id] = perimeter
      })

      if (!perimeter) {
        throw new Error('Failed to create perimeter')
      }
      return perimeter
    },

    removePerimeter: (perimeterId: PerimeterId) => {
      set(state => {
        const { [perimeterId]: _removed, ...remainingPerimeters } = state.perimeters
        state.perimeters = remainingPerimeters
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
        if (wouldClosingPolygonSelfIntersect({ points: newBoundaryPoints })) return

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

        if (wouldClosingPolygonSelfIntersect({ points: newBoundaryPoints })) return

        // Use helper to do all the work
        removeWallAndMergeAdjacent(perimeter, wallIndex)
        success = true
      })
      return success
    },

    // Wall splitting operation
    splitPerimeterWall: (
      perimeterId: PerimeterId,
      wallId: PerimeterWallId,
      splitPosition: Length
    ): PerimeterWallId | null => {
      let newWallId: PerimeterWallId | null = null

      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        const wallIndex = perimeter.walls.findIndex((wall: PerimeterWall) => wall.id === wallId)
        if (wallIndex === -1) return

        const originalWall = perimeter.walls[wallIndex]

        // Validate split position
        if (splitPosition <= 0 || splitPosition >= originalWall.wallLength) return

        // Check opening intersections
        for (const opening of originalWall.openings) {
          const openingStart = opening.offsetFromStart
          const openingEnd = opening.offsetFromStart + opening.width
          if (splitPosition > openingStart && splitPosition < openingEnd) return
        }

        // Calculate split point in world coordinates
        const wallDirection = originalWall.direction
        const splitPoint = vec2.scaleAndAdd(vec2.create(), originalWall.insideLine.start, wallDirection, splitPosition)

        // Create new corner at split position
        const newCorner: PerimeterCorner = {
          id: createPerimeterCornerId(),
          insidePoint: splitPoint,
          outsidePoint: vec2.fromValues(0, 0), // Will be calculated by updatePerimeterGeometry
          constructedByWall: 'next',
          interiorAngle: 0, // Will be calculated by updatePerimeterGeometry
          exteriorAngle: 0 // Will be calculated by updatePerimeterGeometry
        }

        // Redistribute openings
        const firstWallOpenings = []
        const secondWallOpenings = []
        for (const opening of originalWall.openings) {
          if (opening.offsetFromStart < splitPosition) {
            firstWallOpenings.push(opening)
          } else {
            secondWallOpenings.push({
              ...opening,
              offsetFromStart: opening.offsetFromStart - splitPosition
            })
          }
        }

        // Create two new walls
        const firstWall: PerimeterWall = {
          id: createPerimeterWallId(),
          thickness: originalWall.thickness,
          wallAssemblyId: originalWall.wallAssemblyId,
          openings: firstWallOpenings,
          // Geometry will be set by updatePerimeterGeometry
          insideLength: 0,
          outsideLength: 0,
          wallLength: 0,
          insideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(0, 0) },
          outsideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(0, 0) },
          direction: vec2.fromValues(1, 0),
          outsideDirection: vec2.fromValues(0, 1)
        }

        const secondWall: PerimeterWall = {
          id: createPerimeterWallId(),
          thickness: originalWall.thickness,
          wallAssemblyId: originalWall.wallAssemblyId,
          openings: secondWallOpenings,
          // Geometry will be set by updatePerimeterGeometry
          insideLength: 0,
          outsideLength: 0,
          wallLength: 0,
          insideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(0, 0) },
          outsideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(0, 0) },
          direction: vec2.fromValues(1, 0),
          outsideDirection: vec2.fromValues(0, 1)
        }

        // Insert new corner at the correct position
        const cornerIndex = wallIndex + 1
        perimeter.corners.splice(cornerIndex, 0, newCorner)

        // Replace original wall with two new walls
        perimeter.walls.splice(wallIndex, 1, firstWall, secondWall)

        // Recalculate geometry
        updatePerimeterGeometry(perimeter)

        newWallId = secondWall.id
      })

      return newWallId
    },

    // Update operations
    updatePerimeterWallAssembly: (perimeterId: PerimeterId, wallId: PerimeterWallId, assemblyId: WallAssemblyId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

        const wallIndex = perimeter.walls.findIndex((wall: PerimeterWall) => wall.id === wallId)
        if (wallIndex !== -1) {
          perimeter.walls[wallIndex].wallAssemblyId = assemblyId
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

    // Bulk update operations for all walls in a perimeter
    updateAllPerimeterWallsAssembly: (perimeterId: PerimeterId, assemblyId: WallAssemblyId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

        perimeter.walls.forEach(wall => {
          wall.wallAssemblyId = assemblyId
        })
      })
    },

    updateAllPerimeterWallsThickness: (perimeterId: PerimeterId, thickness: Length) => {
      if (thickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

        perimeter.walls.forEach(wall => {
          wall.thickness = thickness
        })

        // Update geometry since wall thickness affects perimeter shape
        updatePerimeterGeometry(perimeter)
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
          perimeter.corners[cornerIndex].constructedByWall = constructedByWall
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

      if (wall.openings.length === 0) return start

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
        return start
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
        const shiftedOffset = previousOpening.offsetFromStart + previousOpening.width
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
        const shiftedOffset = nextOpening.offsetFromStart - width
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
    movePerimeter: (perimeterId: PerimeterId, offset: vec2) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        // Directly translate all corner points
        perimeter.corners.forEach((corner: PerimeterCorner) => {
          corner.insidePoint = vec2.add(vec2.create(), corner.insidePoint, offset)
          corner.outsidePoint = vec2.add(vec2.create(), corner.outsidePoint, offset)
        })

        // Directly translate all wall line endpoints
        perimeter.walls.forEach((wall: PerimeterWall) => {
          wall.insideLine.start = vec2.add(vec2.create(), wall.insideLine.start, offset)
          wall.insideLine.end = vec2.add(vec2.create(), wall.insideLine.end, offset)
          wall.outsideLine.start = vec2.add(vec2.create(), wall.outsideLine.start, offset)
          wall.outsideLine.end = vec2.add(vec2.create(), wall.outsideLine.end, offset)
        })
      })

      return true
    },

    updatePerimeterBoundary: (perimeterId: PerimeterId, newBoundary: vec2[]) => {
      if (newBoundary.length < 3) {
        return false
      }

      const newPolygon = ensurePolygonIsClockwise({ points: newBoundary })

      // Check if the new polygon would self-intersect
      if (wouldClosingPolygonSelfIntersect(newPolygon)) {
        return false
      }

      let success = false
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter || perimeter.corners.length !== newPolygon.points.length) return

        if (perimeter.referenceSide === 'inside') {
          perimeter.corners.forEach((corner: PerimeterCorner, index: number) => {
            corner.insidePoint = vec2.clone(newPolygon.points[index])
          })
        } else {
          perimeter.corners.forEach((corner: PerimeterCorner, index: number) => {
            corner.outsidePoint = vec2.clone(newPolygon.points[index])
          })
        }

        // Recalculate all geometry with the new boundary
        updatePerimeterGeometry(perimeter)
        success = true
      })

      return success
    },

    // Ring beam configuration
    setPerimeterBaseRingBeam: (perimeterId: PerimeterId, assemblyId: RingBeamAssemblyId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        perimeter.baseRingBeamAssemblyId = assemblyId
      })
    },

    setPerimeterTopRingBeam: (perimeterId: PerimeterId, assemblyId: RingBeamAssemblyId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        perimeter.topRingBeamAssemblyId = assemblyId
      })
    },

    removePerimeterBaseRingBeam: (perimeterId: PerimeterId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        perimeter.baseRingBeamAssemblyId = undefined
      })
    },

    removePerimeterTopRingBeam: (perimeterId: PerimeterId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        perimeter.topRingBeamAssemblyId = undefined
      })
    },

    setPerimeterReferenceSide: (perimeterId: PerimeterId, referenceSide: PerimeterReferenceSide) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return
        if (perimeter.referenceSide === referenceSide) return

        perimeter.referenceSide = referenceSide
        updatePerimeterGeometry(perimeter)
      })
    }
  }
})

// Step 1: Create infinite inside and outside lines for each wall wall
const createInfiniteLines = (
  boundary: Polygon2D,
  thicknesses: Length[],
  referenceSide: PerimeterReferenceSide
): { inside: Line2D; outside: Line2D }[] => {
  const numSides = boundary.points.length
  const infiniteLines: { inside: Line2D; outside: Line2D }[] = []

  for (let i = 0; i < numSides; i++) {
    const startPoint = boundary.points[i]
    const endPoint = boundary.points[(i + 1) % numSides]
    const wallThickness = thicknesses[i]

    // Create line from boundary points
    const baseLine = lineFromPoints(startPoint, endPoint)
    if (!baseLine) {
      throw new Error('Wall wall cannot have zero length')
    }

    const outwardDirection = perpendicularCCW(baseLine.direction)
    let insideLine: Line2D
    let outsideLine: Line2D

    if (referenceSide === 'inside') {
      insideLine = baseLine
      const outsidePoint = vec2.scaleAndAdd(vec2.create(), startPoint, outwardDirection, wallThickness)
      outsideLine = { point: outsidePoint, direction: baseLine.direction }
    } else {
      outsideLine = baseLine
      const insidePoint = vec2.scaleAndAdd(vec2.create(), startPoint, outwardDirection, -wallThickness)
      insideLine = { point: insidePoint, direction: baseLine.direction }
    }

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
    corner.outsidePoint = vec2.scaleAndAdd(vec2.create(), corner.insidePoint, outsideDirection, maxThickness)
  }
}
// Step 2: Calculate corner points (both inside and outside) as intersections of adjacent lines
const updateAllCornerOutsidePoints = (
  corners: PerimeterCorner[],
  thicknesses: Length[],
  infiniteLines: { inside: Line2D; outside: Line2D }[]
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

const updateCornerInsidePoint = (
  corner: PerimeterCorner,
  prevThickness: Length,
  nextThickness: Length,
  prevInsideLine: Line2D,
  nextInsideLine: Line2D
): void => {
  const intersection = lineIntersection(prevInsideLine, nextInsideLine)

  if (intersection) {
    corner.insidePoint = intersection
  } else {
    const minThickness = Math.min(prevThickness, nextThickness)
    const inwardDirection = vec2.negate(vec2.create(), perpendicularCCW(nextInsideLine.direction))
    corner.insidePoint = vec2.scaleAndAdd(vec2.create(), corner.outsidePoint, inwardDirection, minThickness)
  }
}

const updateAllCornerInsidePoints = (
  corners: PerimeterCorner[],
  thicknesses: Length[],
  infiniteLines: { inside: Line2D; outside: Line2D }[]
): void => {
  const numSides = corners.length

  for (let i = 0; i < numSides; i++) {
    const prevIndex = (i - 1 + numSides) % numSides
    const prevInsideLine = infiniteLines[prevIndex].inside
    const currentInsideLine = infiniteLines[i].inside
    const prevThickness = thicknesses[prevIndex]
    const currentThickness = thicknesses[i]
    updateCornerInsidePoint(corners[i], prevThickness, currentThickness, prevInsideLine, currentInsideLine)
  }
}

// Calculate interior and exterior angles at a corner formed by three points (in degrees)
const calculateCornerAngles = (
  previousPoint: vec2,
  cornerPoint: vec2,
  nextPoint: vec2
): { interiorAngle: number; exteriorAngle: number } => {
  // Vectors from corner to adjacent points
  const toPrevious = direction(cornerPoint, previousPoint)
  const toNext = direction(cornerPoint, nextPoint)

  // Calculate the angle between the vectors using atan2 for full range
  const angle1 = Math.atan2(toPrevious[1], toPrevious[0])
  const angle2 = Math.atan2(toNext[1], toNext[0])

  // Calculate the difference, ensuring positive result
  let angleDiff = angle2 - angle1
  if (angleDiff < 0) {
    angleDiff += 2 * Math.PI
  }

  // Convert to degrees and round
  const angleDegrees = Math.round(radiansToDegrees(angleDiff))

  // Assume the angle calculated is the interior angle (this works for convex polygons)
  const interiorAngleDegrees = angleDegrees
  const exteriorAngleDegrees = 360 - angleDegrees

  return {
    interiorAngle: interiorAngleDegrees,
    exteriorAngle: exteriorAngleDegrees
  }
}

// Calculate angles for all corners
const updateAllCornerAngles = (corners: PerimeterCorner[]): void => {
  const numCorners = corners.length

  for (let i = 0; i < numCorners; i++) {
    const prevIndex = (i - 1 + numCorners) % numCorners
    const nextIndex = (i + 1) % numCorners

    const previousPoint = corners[prevIndex].insidePoint
    const cornerPoint = corners[i].insidePoint
    const nextPoint = corners[nextIndex].insidePoint

    const angles = calculateCornerAngles(previousPoint, cornerPoint, nextPoint)
    corners[i].interiorAngle = angles.interiorAngle
    corners[i].exteriorAngle = angles.exteriorAngle
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
    point: vec2.scaleAndAdd(vec2.create(), insideStart, outsideDirection, wall.thickness),
    direction: wallDirection
  }

  // Project boundary points onto outside line
  const boundaryStartOnOutside = projectPointOntoLine(insideStart, outsideLine)
  const boundaryEndOnOutside = projectPointOntoLine(insideEnd, outsideLine)

  // Project corner outside points onto inside line
  const cornerStartOnInside = projectPointOntoLine(startCornerOutside, insideLine)
  const cornerEndOnInside = projectPointOntoLine(endCornerOutside, insideLine)

  // Choose endpoints based on which projection is closer to wall midpoint
  const startDistBoundary = vec2.distance(insideStart, wallMidpoint)
  const startDistCorner = vec2.distance(cornerStartOnInside, wallMidpoint)
  const endDistBoundary = vec2.distance(insideEnd, wallMidpoint)
  const endDistCorner = vec2.distance(cornerEndOnInside, wallMidpoint)

  const finalInsideStart = startDistBoundary <= startDistCorner ? insideStart : cornerStartOnInside
  const finalInsideEnd = endDistBoundary <= endDistCorner ? insideEnd : cornerEndOnInside
  const finalOutsideStart = startDistBoundary <= startDistCorner ? boundaryStartOnOutside : startCornerOutside
  const finalOutsideEnd = endDistBoundary <= endDistCorner ? boundaryEndOnOutside : endCornerOutside

  // Directly mutate wall properties
  wall.insideLength = vec2.distance(insideStart, insideEnd)
  wall.outsideLength = vec2.distance(startCornerOutside, endCornerOutside)
  wall.wallLength = vec2.distance(finalInsideStart, finalInsideEnd)
  wall.insideLine = { start: finalInsideStart, end: finalInsideEnd }
  wall.outsideLine = { start: finalOutsideStart, end: finalOutsideEnd }
  wall.direction = wallDirection
  wall.outsideDirection = outsideDirection
}

// High-level helper to recalculate all perimeter geometry in place
const updatePerimeterGeometry = (perimeter: Perimeter): void => {
  const boundaryPoints =
    perimeter.referenceSide === 'inside'
      ? perimeter.corners.map((c: PerimeterCorner) => vec2.clone(c.insidePoint))
      : perimeter.corners.map((c: PerimeterCorner) => vec2.clone(c.outsidePoint))

  const boundary = { points: boundaryPoints }
  const thicknesses = perimeter.walls.map((wall: PerimeterWall) => wall.thickness)
  const infiniteLines = createInfiniteLines(boundary, thicknesses, perimeter.referenceSide)

  if (perimeter.referenceSide === 'inside') {
    perimeter.corners.forEach((corner: PerimeterCorner, index: number) => {
      corner.insidePoint = vec2.clone(boundary.points[index])
    })
    updateAllCornerOutsidePoints(perimeter.corners, thicknesses, infiniteLines)
  } else {
    perimeter.corners.forEach((corner: PerimeterCorner, index: number) => {
      corner.outsidePoint = vec2.clone(boundary.points[index])
    })
    updateAllCornerInsidePoints(perimeter.corners, thicknesses, infiniteLines)
  }

  // Update corner angles in place
  updateAllCornerAngles(perimeter.corners)

  // Update wall geometry in place
  for (let i = 0; i < perimeter.walls.length; i++) {
    const startCorner = perimeter.corners[i]
    const endCorner = perimeter.corners[(i + 1) % perimeter.corners.length]
    updateWallGeometry(perimeter.walls[i], startCorner, endCorner)
  }
}

// Helper to merge openings when corner is exactly straight (180°)
const mergeOpeningsForStraightCorner = (wall1: PerimeterWall, wall2: PerimeterWall): Opening[] => {
  // Keep all openings from wall1 as-is
  const wall1Openings = [...wall1.openings]

  // Adjust wall2 openings by adding wall1's wall length to their offsets
  const wall2Openings = wall2.openings.map(opening => ({
    ...opening,
    offsetFromStart: opening.offsetFromStart + wall1.wallLength
  }))

  return [...wall1Openings, ...wall2Openings]
}

// Helper to remove a corner and merge adjacent walls
const removeCornerAndMergeWalls = (perimeter: Perimeter, cornerIndex: number): void => {
  const prevWallIndex = (cornerIndex - 1 + perimeter.walls.length) % perimeter.walls.length
  const currentWallIndex = cornerIndex

  // Get wall properties for merging
  const wall1 = perimeter.walls[prevWallIndex]
  const wall2 = perimeter.walls[currentWallIndex]
  const mergedThickness = Math.max(wall1.thickness, wall2.thickness)

  // Check if corner is exactly straight (180°) to preserve openings
  const corner = perimeter.corners[cornerIndex]
  const isExactlyStraight = corner.interiorAngle === 180

  perimeter.corners.splice(cornerIndex, 1)

  const mergedWall: PerimeterWall = {
    id: createPerimeterWallId(),
    thickness: mergedThickness,
    wallAssemblyId: wall1.wallAssemblyId,
    openings: isExactlyStraight ? mergeOpeningsForStraightCorner(wall1, wall2) : [], // Keep current behavior for non-straight corners
    // Geometry properties will be set by updatePerimeterGeometry
    insideLength: 0,
    outsideLength: 0,
    wallLength: 0,
    insideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(0, 0) },
    outsideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(0, 0) },
    direction: vec2.fromValues(1, 0),
    outsideDirection: vec2.fromValues(0, 1)
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
  const mergedThickness = Math.max(prevWall.thickness, targetWall.thickness, nextWall.thickness)

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
    wallAssemblyId: prevWall.wallAssemblyId,
    openings: [], // Openings are deleted
    // Geometry properties will be set by updatePerimeterGeometry
    insideLength: 0,
    outsideLength: 0,
    wallLength: 0,
    insideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(0, 0) },
    outsideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(0, 0) },
    direction: vec2.fromValues(1, 0),
    outsideDirection: vec2.fromValues(0, 1)
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
  const openingEnd = offsetFromStart + width
  if (offsetFromStart < 0 || openingEnd > wall.wallLength) {
    return false
  }

  // Check overlap with existing openings
  for (const existing of wall.openings) {
    if (existing.id === excludedOpening) continue

    const existingStart = existing.offsetFromStart
    const existingEnd = existing.offsetFromStart + existing.width

    if (!(openingEnd <= existingStart || offsetFromStart >= existingEnd)) {
      return false
    }
  }

  return true
}
