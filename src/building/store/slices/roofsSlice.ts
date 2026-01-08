import type { StateCreator } from 'zustand'

import type { Roof, RoofOverhang, RoofType } from '@/building/model'
import type { PerimeterId, RoofAssemblyId, RoofId, RoofOverhangId, StoreyId } from '@/building/model/ids'
import { createRoofId, createRoofOverhangId } from '@/building/model/ids'
import { getConfigActions } from '@/construction/config/store'
import { polygonEdges } from '@/construction/helpers'
import {
  type Length,
  type LineSegment2D,
  type Polygon2D,
  type Vec2,
  ZERO_VEC2,
  copyVec2,
  degreesToRadians,
  direction,
  distVec2,
  dotVec2,
  ensurePolygonIsClockwise,
  lenVec2,
  lineIntersection,
  midpoint,
  perpendicular,
  perpendicularCCW,
  perpendicularCW,
  polygonEdgeOffset,
  projectVec2,
  simplifyPolygon,
  subVec2,
  wouldClosingPolygonSelfIntersect
} from '@/shared/geometry'

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

  updateRoofOverhangById: (roofId: RoofId, overhangId: RoofOverhangId, value: Length) => boolean

  setAllRoofOverhangs: (roofId: RoofId, value: Length) => boolean

  getRoofOverhangById: (roofId: RoofId, overhangId: RoofOverhangId) => RoofOverhang | null

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

// Helper function to compute overhang polygon from RoofOverhang array
const computeOverhangPolygon = (referencePolygon: Polygon2D, overhangs: RoofOverhang[]): Polygon2D => {
  const overhangValues = overhangs.map(o => o.value)
  return polygonEdgeOffset(referencePolygon, overhangValues)
}

// Helper function to compute trapezoid area for an overhang side
const computeOverhangArea = (referencePolygon: Polygon2D, overhangPolygon: Polygon2D, sideIndex: number): Polygon2D => {
  const n = referencePolygon.points.length

  const innerStart = referencePolygon.points[sideIndex]
  const innerEnd = referencePolygon.points[(sideIndex + 1) % n]
  const outerStart = overhangPolygon.points[sideIndex]
  const outerEnd = overhangPolygon.points[(sideIndex + 1) % n]

  return {
    points: [innerStart, innerEnd, outerEnd, outerStart]
  }
}

// Helper function to compute ridge line
const computeRidgeLine = (polygon: Polygon2D, mainSideIndex: number, roofType: RoofType): LineSegment2D => {
  const points = polygon.points
  const mainStart = points[mainSideIndex]
  const mainEnd = points[(mainSideIndex + 1) % points.length]

  if (roofType === 'shed') {
    // Ridge is simply the main side edge
    return { start: copyVec2(mainStart), end: copyVec2(mainEnd) }
  }

  // Gable roof: ridge runs from midpoint of gable side perpendicular to opposite edge
  const point = midpoint(mainStart, mainEnd)

  // Direction perpendicular to main side
  const mainDirection = direction(mainStart, mainEnd)
  const ridgeDirection = perpendicular(mainDirection)

  // Create infinite line from midpoint in ridge direction
  const ridgeLine = {
    point,
    direction: ridgeDirection
  }

  // Find intersection with polygon edges (excluding main side and adjacent edges)
  let bestIntersection: Vec2 | null = null
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
      const edgeVector = subVec2(edgeEnd, edgeStart)
      const toIntersection = subVec2(intersection, edgeStart)
      const edgeLength = lenVec2(edgeVector)

      if (edgeLength > 0) {
        const t = dotVec2(toIntersection, edgeVector) / (edgeLength * edgeLength)

        if (t >= -0.001 && t <= 1.001) {
          // Intersection is within edge bounds
          const dist = distVec2(point, intersection)
          if (dist > maxDistance) {
            maxDistance = dist
            bestIntersection = intersection
          }
        }
      }
    }
  }

  return { start: copyVec2(point), end: bestIntersection ?? copyVec2(point) }
}

const getValidMainSideIndices = (polygon: Polygon2D): number[] => {
  const points = polygon.points
  const n = points.length

  if (n <= 3) {
    return Array.from({ length: n }, (_, i) => i)
  }

  const validIndices = [...polygonEdges(polygon)]
    .map((edge, i) => {
      const outwardDir = perpendicularCCW(direction(edge.start, edge.end))
      const allProjections = polygon.points.map(p => projectVec2(edge.start, p, outwardDir))
      const maxProjection = Math.max(...allProjections)
      return maxProjection <= 0.1 ? i : -1
    })
    .filter(i => i >= 0)

  return validIndices.length > 0 ? validIndices : Array.from({ length: n }, (_, i) => i)
}

export const computeRoofDerivedProperties = (roof: Roof): void => {
  roof.slopeAngleRad = degreesToRadians(roof.slope)
  roof.ridgeDirection = direction(roof.ridgeLine.start, roof.ridgeLine.end)
  roof.downSlopeDirection = perpendicularCW(roof.ridgeDirection)

  const projections = roof.referencePolygon.points.map(p =>
    projectVec2(roof.ridgeLine.start, p, roof.downSlopeDirection)
  )
  const minProjection = Math.min(...projections)
  const maxProjection = Math.max(...projections)
  const maxRun = Math.max(Math.abs(minProjection), Math.abs(maxProjection))

  roof.span = maxProjection - minProjection
  roof.rise = maxRun * Math.tan(roof.slopeAngleRad)
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

      // Validate overhang
      if (overhang < 0) {
        throw new Error('Overhang must be non-negative')
      }

      // Note: Reference perimeter validation is deferred to runtime usage
      // The store structure doesn't allow cross-slice validation during creation

      // Create overhang array with same value for all sides (for computing overhang polygon)
      const overhangArray = new Array(validatedPolygon.points.length).fill(overhang)

      // Compute overhang polygon first (needed for trapezoid computation)
      const overhangPolygonTemp = polygonEdgeOffset(validatedPolygon, overhangArray)

      // Create overhang objects with IDs and computed geometry
      const overhangs: RoofOverhang[] = validatedPolygon.points.map((_, index) => ({
        id: createRoofOverhangId(),
        sideIndex: index,
        value: overhang,
        area: computeOverhangArea(validatedPolygon, overhangPolygonTemp, index)
      }))

      // Final overhang polygon (same as temp, but now we have RoofOverhang objects)
      const overhangPolygon = overhangPolygonTemp

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
        overhangs,
        assemblyId: assemblyId ?? getConfigActions().getDefaultRoofAssemblyId(),
        referencePerimeter,
        // Initialize computed properties (will be set by helper)
        slopeAngleRad: 0,
        ridgeDirection: ZERO_VEC2,
        downSlopeDirection: ZERO_VEC2,
        rise: 0,
        span: 0
      }

      // Compute all derived properties
      computeRoofDerivedProperties(newRoof)

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

    updateRoofOverhangById: (roofId: RoofId, overhangId: RoofOverhangId, value: Length): boolean => {
      if (value < 0) {
        throw new Error('Overhang must be non-negative')
      }

      let success = false
      set(state => {
        const roof = state.roofs[roofId]
        if (!roof) return

        const overhangIndex = roof.overhangs.findIndex(o => o.id === overhangId)
        if (overhangIndex === -1) return

        // Update value
        roof.overhangs[overhangIndex].value = value

        // Recompute overhang polygon
        roof.overhangPolygon = computeOverhangPolygon(roof.referencePolygon, roof.overhangs)

        // Recompute ALL overhang areas (since overhang polygon changed)
        roof.overhangs.forEach((overhang, idx) => {
          overhang.area = computeOverhangArea(roof.referencePolygon, roof.overhangPolygon, idx)
        })

        success = true
      })
      return success
    },

    setAllRoofOverhangs: (roofId: RoofId, value: Length): boolean => {
      if (value < 0) {
        throw new Error('Overhang must be non-negative')
      }

      let success = false
      set(state => {
        const roof = state.roofs[roofId]
        if (!roof) return

        // Update all overhangs to same value
        roof.overhangs.forEach(overhang => {
          overhang.value = value
        })

        // Recompute overhang polygon
        roof.overhangPolygon = computeOverhangPolygon(roof.referencePolygon, roof.overhangs)

        // Recompute ALL overhang areas
        roof.overhangs.forEach((overhang, idx) => {
          overhang.area = computeOverhangArea(roof.referencePolygon, roof.overhangPolygon, idx)
        })

        success = true
      })
      return success
    },

    getRoofOverhangById: (roofId: RoofId, overhangId: RoofOverhangId): RoofOverhang | null => {
      const roof = get().roofs[roofId]
      if (!roof) return null

      return roof.overhangs.find(o => o.id === overhangId) ?? null
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

        // Recompute derived properties if slope or mainSideIndex changed
        if (updates.slope !== undefined || updates.mainSideIndex !== undefined) {
          computeRoofDerivedProperties(roof)
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
        roof.overhangPolygon = computeOverhangPolygon(validatedPolygon, roof.overhangs)

        // Recompute ALL overhang areas (geometry changed)
        roof.overhangs.forEach((overhang, idx) => {
          overhang.area = computeOverhangArea(validatedPolygon, roof.overhangPolygon, idx)
        })

        // Recompute ridge line
        roof.ridgeLine = computeRidgeLine(validatedPolygon, roof.mainSideIndex, roof.type)

        // Recompute derived properties since geometry changed
        computeRoofDerivedProperties(roof)

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
