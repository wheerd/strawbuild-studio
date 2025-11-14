import { vec2 } from 'gl-matrix'
import type { StateCreator } from 'zustand'

import type { PerimeterId, RoofAssemblyId, RoofId, StoreyId } from '@/building/model/ids'
import { createRoofId } from '@/building/model/ids'
import type { Roof, RoofType } from '@/building/model/model'
import { getConfigActions } from '@/construction/config/store'
import type { Length, LineSegment2D, Polygon2D } from '@/shared/geometry'
import {
  direction,
  ensurePolygonIsClockwise,
  lineIntersection,
  perpendicular,
  polygonEdgeOffset,
  simplifyPolygon,
  wouldClosingPolygonSelfIntersect
} from '@/shared/geometry'
import { convexHullOfPolygon } from '@/shared/geometry/polygon'

export interface RoofsState {
  roofs: Record<RoofId, Roof>
}

export interface RoofsActions {
  addRoof: (
    storeyId: StoreyId,
    type: RoofType,
    polygon: Polygon2D,
    mainSideIndex: number,
    slope: number,
    verticalOffset: Length,
    overhang: Length,
    assemblyId?: RoofAssemblyId,
    referencePerimeter?: PerimeterId
  ) => Roof

  removeRoof: (roofId: RoofId) => void

  updateRoofOverhang: (roofId: RoofId, sideIndex: number, overhang: Length) => boolean

  updateRoofProperties: (
    roofId: RoofId,
    updates: {
      slope?: number
      mainSideIndex?: number
      verticalOffset?: Length
      assemblyId?: RoofAssemblyId
    }
  ) => boolean

  updateRoofArea: (roofId: RoofId, newPolygon: Polygon2D) => boolean

  cycleRoofMainSide: (roofId: RoofId) => boolean

  getValidMainSides: (roofId: RoofId) => number[]

  getRoofById: (roofId: RoofId) => Roof | null
  getRoofsByStorey: (storeyId: StoreyId) => Roof[]
}

export type RoofsSlice = RoofsState & { actions: RoofsActions }

// Helper function to validate and prepare roof polygon
const ensureRoofPolygon = (polygon: Polygon2D): Polygon2D => {
  if (polygon.points.length < 3) {
    throw new Error('Roof polygon must have at least 3 points')
  }

  if (wouldClosingPolygonSelfIntersect(polygon)) {
    throw new Error('Roof polygon must not self-intersect')
  }

  // Simplify polygon to remove redundant points
  const simplified = simplifyPolygon(polygon)

  // Normalize to clockwise
  return ensurePolygonIsClockwise(simplified)
}

// Helper function to compute overhang polygon
const computeOverhangPolygon = (referencePolygon: Polygon2D, overhangs: Length[]): Polygon2D => {
  return polygonEdgeOffset(referencePolygon, overhangs)
}

// Helper function to compute ridge line
const computeRidgeLine = (polygon: Polygon2D, mainSideIndex: number, roofType: RoofType): LineSegment2D => {
  const points = polygon.points
  const mainStart = points[mainSideIndex]
  const mainEnd = points[(mainSideIndex + 1) % points.length]

  if (roofType === 'shed') {
    // Ridge is simply the main side edge
    return { start: vec2.clone(mainStart), end: vec2.clone(mainEnd) }
  }

  // Gable roof: ridge runs from midpoint of gable side perpendicular to opposite edge
  const midpoint = vec2.scale(vec2.create(), vec2.add(vec2.create(), mainStart, mainEnd), 0.5)

  // Direction perpendicular to main side
  const mainDirection = direction(mainStart, mainEnd)
  const ridgeDirection = perpendicular(mainDirection)

  // Create infinite line from midpoint in ridge direction
  const ridgeLine = {
    point: midpoint,
    direction: ridgeDirection
  }

  // Find intersection with polygon edges (excluding main side and adjacent edges)
  let bestIntersection: vec2 | null = null
  let maxDistance = 0

  for (let i = 0; i < points.length; i++) {
    // Skip main side and adjacent sides
    if (
      i === mainSideIndex ||
      i === (mainSideIndex - 1 + points.length) % points.length ||
      i === (mainSideIndex + 1) % points.length
    ) {
      continue
    }

    const edgeStart = points[i]
    const edgeEnd = points[(i + 1) % points.length]
    const edgeDir = direction(edgeStart, edgeEnd)

    const edgeLine = {
      point: edgeStart,
      direction: edgeDir
    }

    const intersection = lineIntersection(ridgeLine, edgeLine)

    if (intersection) {
      // Check if intersection is within the edge segment
      const edgeVector = vec2.subtract(vec2.create(), edgeEnd, edgeStart)
      const toIntersection = vec2.subtract(vec2.create(), intersection, edgeStart)
      const edgeLength = vec2.length(edgeVector)

      if (edgeLength > 0) {
        const t = vec2.dot(toIntersection, edgeVector) / (edgeLength * edgeLength)

        if (t >= -0.001 && t <= 1.001) {
          // Intersection is within edge bounds
          const dist = vec2.distance(midpoint, intersection)
          if (dist > maxDistance) {
            maxDistance = dist
            bestIntersection = intersection
          }
        }
      }
    }
  }

  if (!bestIntersection) {
    // Fallback: ridge is just a point at the midpoint
    return { start: vec2.clone(midpoint), end: vec2.clone(midpoint) }
  }

  return { start: vec2.clone(midpoint), end: bestIntersection }
}

// Helper function to get valid main side indices (edges on convex hull)
const getValidMainSideIndices = (polygon: Polygon2D): number[] => {
  const points = polygon.points
  const n = points.length

  if (n <= 3) {
    // All sides are valid for triangles or smaller
    return Array.from({ length: n }, (_, i) => i)
  }

  // Get convex hull
  const hull = convexHullOfPolygon(polygon)
  const hullPoints = hull.points

  // Find which edges of the original polygon are on the convex hull
  const validIndices: number[] = []

  for (let i = 0; i < n; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % n]

    // Check if this edge exists in the hull
    // An edge is on the hull if both its vertices are consecutive in the hull
    for (let j = 0; j < hullPoints.length; j++) {
      const h1 = hullPoints[j]
      const h2 = hullPoints[(j + 1) % hullPoints.length]

      // Check if (p1, p2) matches (h1, h2) in either direction
      if ((vec2.equals(p1, h1) && vec2.equals(p2, h2)) || (vec2.equals(p1, h2) && vec2.equals(p2, h1))) {
        validIndices.push(i)
        break
      }
    }
  }

  return validIndices.length > 0 ? validIndices : Array.from({ length: n }, (_, i) => i)
}

export const createRoofsSlice: StateCreator<RoofsSlice, [['zustand/immer', never]], [], RoofsSlice> = (set, get) => ({
  roofs: {},

  actions: {
    addRoof: (
      storeyId: StoreyId,
      type: RoofType,
      polygon: Polygon2D,
      mainSideIndex: number,
      slope: number,
      verticalOffset: Length,
      overhang: Length,
      assemblyId?: RoofAssemblyId,
      referencePerimeter?: PerimeterId
    ) => {
      const validatedPolygon = ensureRoofPolygon(polygon)

      // Get valid main sides and use first valid side if mainSideIndex is invalid
      const validSides = getValidMainSideIndices(validatedPolygon)
      let finalMainSideIndex = mainSideIndex

      if (!validSides.includes(mainSideIndex)) {
        // If provided index is not valid, use first valid side
        finalMainSideIndex = validSides[0] ?? 0
      }

      // Validate slope
      if (slope < 0 || slope > 90) {
        throw new Error('Roof slope must be between 0 and 90 degrees')
      }

      // Validate vertical offset
      if (verticalOffset < 0) {
        throw new Error('Vertical offset must be non-negative')
      }

      // Validate overhang
      if (overhang < 0) {
        throw new Error('Overhang must be non-negative')
      }

      // Note: Reference perimeter validation is deferred to runtime usage
      // The store structure doesn't allow cross-slice validation during creation

      // Create overhang array with same value for all sides
      const overhangArray = new Array(validatedPolygon.points.length).fill(overhang)

      // Compute overhang polygon
      const overhangPolygon = computeOverhangPolygon(validatedPolygon, overhangArray)

      // Compute ridge line
      const ridgeLine = computeRidgeLine(validatedPolygon, finalMainSideIndex, type)

      const roofId = createRoofId()

      const newRoof: Roof = {
        id: roofId,
        storeyId,
        type,
        referencePolygon: validatedPolygon,
        overhangPolygon,
        ridgeLine,
        mainSideIndex: finalMainSideIndex,
        slope,
        verticalOffset,
        overhang: overhangArray,
        assemblyId: assemblyId ?? getConfigActions().getDefaultRoofAssemblyId(),
        referencePerimeter
      }

      set(state => {
        state.roofs[roofId] = newRoof
      })

      return newRoof
    },

    removeRoof: (roofId: RoofId) => {
      set(state => {
        const { [roofId]: _removed, ...remainingRoofs } = state.roofs
        state.roofs = remainingRoofs
      })
    },

    updateRoofOverhang: (roofId: RoofId, sideIndex: number, overhang: Length): boolean => {
      if (overhang < 0) {
        throw new Error('Overhang must be non-negative')
      }

      let success = false
      set(state => {
        const roof = state.roofs[roofId]
        if (!roof) return

        // Validate index
        if (sideIndex < 0 || sideIndex >= roof.overhang.length) {
          return
        }

        roof.overhang[sideIndex] = overhang

        // Recompute overhang polygon
        roof.overhangPolygon = computeOverhangPolygon(roof.referencePolygon, roof.overhang)

        success = true
      })
      return success
    },

    updateRoofProperties: (
      roofId: RoofId,
      updates: {
        slope?: number
        mainSideIndex?: number
        verticalOffset?: Length
        assemblyId?: RoofAssemblyId
      }
    ): boolean => {
      const roof = get().roofs[roofId]
      if (!roof) return false

      // Validate slope if provided
      if (updates.slope !== undefined && (updates.slope < 0 || updates.slope > 90)) {
        throw new Error('Roof slope must be between 0 and 90 degrees')
      }

      // Validate mainSideIndex if provided
      if (updates.mainSideIndex !== undefined) {
        if (updates.mainSideIndex < 0 || updates.mainSideIndex >= roof.referencePolygon.points.length) {
          throw new Error(`mainSideIndex must be between 0 and ${roof.referencePolygon.points.length - 1}`)
        }
      }

      // Validate vertical offset if provided
      if (updates.verticalOffset !== undefined && updates.verticalOffset < 0) {
        throw new Error('Vertical offset must be non-negative')
      }

      let success = false
      set(state => {
        const roof = state.roofs[roofId]
        if (!roof) return

        // Apply partial updates
        if (updates.slope !== undefined) {
          roof.slope = updates.slope
        }
        if (updates.mainSideIndex !== undefined) {
          roof.mainSideIndex = updates.mainSideIndex
          // Recompute ridge line when main side changes
          roof.ridgeLine = computeRidgeLine(roof.referencePolygon, updates.mainSideIndex, roof.type)
        }
        if (updates.verticalOffset !== undefined) {
          roof.verticalOffset = updates.verticalOffset
        }
        if (updates.assemblyId !== undefined) {
          roof.assemblyId = updates.assemblyId
        }

        success = true
      })

      return success
    },

    updateRoofArea: (roofId: RoofId, newPolygon: Polygon2D): boolean => {
      const validatedPolygon = ensureRoofPolygon(newPolygon)

      const roof = get().roofs[roofId]
      if (!roof) {
        return false
      }

      const currentSideCount = roof.referencePolygon.points.length
      const newSideCount = validatedPolygon.points.length

      // Reject if point count changed
      if (currentSideCount !== newSideCount) {
        throw new Error(`Cannot change roof polygon point count (current: ${currentSideCount}, new: ${newSideCount})`)
      }

      let success = false
      set(state => {
        const roof = state.roofs[roofId]
        if (!roof) return

        roof.referencePolygon = validatedPolygon

        // Recompute overhang polygon
        roof.overhangPolygon = computeOverhangPolygon(validatedPolygon, roof.overhang)

        // Recompute ridge line
        roof.ridgeLine = computeRidgeLine(validatedPolygon, roof.mainSideIndex, roof.type)

        success = true
      })

      return success
    },

    cycleRoofMainSide: (roofId: RoofId): boolean => {
      const roof = get().roofs[roofId]
      if (!roof) return false

      const validSides = get().actions.getValidMainSides(roofId)
      if (validSides.length === 0) return false

      // Find current index in valid sides array
      const currentIndexInValid = validSides.indexOf(roof.mainSideIndex)
      if (currentIndexInValid === -1) {
        // Current side is invalid, use first valid side
        return get().actions.updateRoofProperties(roofId, { mainSideIndex: validSides[0] })
      }

      // Cycle to next valid side
      const nextIndexInValid = (currentIndexInValid + 1) % validSides.length
      return get().actions.updateRoofProperties(roofId, { mainSideIndex: validSides[nextIndexInValid] })
    },

    getValidMainSides: (roofId: RoofId): number[] => {
      const roof = get().roofs[roofId]
      if (!roof) return []

      return getValidMainSideIndices(roof.referencePolygon)
    },

    getRoofById: (roofId: RoofId) => {
      return get().roofs[roofId] ?? null
    },

    getRoofsByStorey: (storeyId: StoreyId) => {
      return Object.values(get().roofs).filter(roof => roof.storeyId === storeyId)
    }
  }
})
