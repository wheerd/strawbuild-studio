import type { Constraint, SketchPoint } from '@salusoft89/planegcs'

import type { PerimeterCornerId, PerimeterId } from '@/building/model'
import { polygonEdges } from '@/construction/helpers'
import {
  nodeNonRefSidePointForNextWall,
  nodeNonRefSidePointForPrevWall,
  nodeRefSidePointId
} from '@/editor/gcs/constraintTranslator'
import { crossVec2, direction, newVec2, segmentsIntersect, wouldClosingPolygonSelfIntersect } from '@/shared/geometry'

const MIN_WALL_LENGTH_SQ = 50 * 50
const COLLINEARITY_THRESHOLD = 1e-4

export interface ValidationResult {
  valid: boolean
  reason?: string
}

export function validateSolution(
  points: Record<string, SketchPoint>,
  cornerOrderMap: Map<PerimeterId, PerimeterCornerId[]>,
  constraints: Record<string, Constraint>
): ValidationResult {
  if (!checkMinWallLength(points, cornerOrderMap)) {
    return { valid: false, reason: 'Minimum wall length violation' }
  }

  if (!checkSelfIntersection(points, cornerOrderMap)) {
    return { valid: false, reason: 'Self-intersection detected' }
  }

  if (!checkWallConsistency(points, cornerOrderMap)) {
    return { valid: false, reason: 'Wall side consistency violation' }
  }

  if (!checkColinearity(points, cornerOrderMap, constraints)) {
    return { valid: false, reason: 'Colinear corner detected' }
  }

  return { valid: true }
}

function checkMinWallLength(
  points: Record<string, SketchPoint>,
  cornerOrderMap: Map<PerimeterId, PerimeterCornerId[]>
): boolean {
  for (const cornerIds of cornerOrderMap.values()) {
    for (let i = 0; i < cornerIds.length; i++) {
      const currentId = cornerIds[i]
      const nextId = cornerIds[(i + 1) % cornerIds.length]

      const refCurrentPt = points[nodeRefSidePointId(currentId)]
      const refNextPt = points[nodeRefSidePointId(nextId)]

      const refDistance = Math.pow(refCurrentPt.x - refNextPt.x, 2) + Math.pow(refCurrentPt.y - refNextPt.y, 2)

      if (refDistance < MIN_WALL_LENGTH_SQ) {
        return false
      }

      const nonrefCurrentPt = points[nodeNonRefSidePointForNextWall(currentId)]
      const nonrefNextPt = points[nodeNonRefSidePointForPrevWall(nextId)]

      const nonrefDistance =
        Math.pow(nonrefCurrentPt.x - nonrefNextPt.x, 2) + Math.pow(nonrefCurrentPt.y - nonrefNextPt.y, 2)

      if (nonrefDistance < MIN_WALL_LENGTH_SQ) {
        return false
      }
    }
  }

  return true
}

function checkSelfIntersection(
  points: Record<string, SketchPoint>,
  cornerOrderMap: Map<PerimeterId, PerimeterCornerId[]>
): boolean {
  for (const cornerIds of cornerOrderMap.values()) {
    const innerPoints = cornerIds.map(id => points[nodeRefSidePointId(id)])

    if (innerPoints.length < 3) {
      continue
    }

    const polygon = {
      points: innerPoints.map(pt => newVec2(pt.x, pt.y))
    }

    if (wouldClosingPolygonSelfIntersect(polygon)) {
      return false
    }
  }

  return true
}

function checkWallConsistency(
  points: Record<string, SketchPoint>,
  cornerOrderMap: Map<PerimeterId, PerimeterCornerId[]>
): boolean {
  for (const cornerIds of cornerOrderMap.values()) {
    const refPoints = cornerIds.map(id => points[nodeRefSidePointId(id)])
    const nonRefPoints = cornerIds.map(id => points[nodeNonRefSidePointForNextWall(id)])

    if (refPoints.length < 3 || nonRefPoints.length < 3) {
      continue
    }

    const innerPolygon = {
      points: refPoints.map(pt => newVec2(pt.x, pt.y))
    }
    const outerPolygon = {
      points: nonRefPoints.map(pt => newVec2(pt.x, pt.y))
    }

    const innerLines = [...polygonEdges(innerPolygon)]
    const outerLines = [...polygonEdges(outerPolygon)]

    if (innerLines.some(i => outerLines.some(o => segmentsIntersect(i.start, i.end, o.start, o.end)))) {
      return false
    }
  }

  return true
}

function checkColinearity(
  points: Record<string, SketchPoint>,
  cornerOrderMap: Map<PerimeterId, PerimeterCornerId[]>,
  constraints: Record<string, Constraint>
): boolean {
  for (const cornerIds of cornerOrderMap.values()) {
    for (let i = 0; i < cornerIds.length; i++) {
      const currentId = cornerIds[i]

      const constraintId = `bc_colinearCorner_${currentId}`
      if (constraintId in constraints) {
        continue
      }

      const prevId = cornerIds[(i - 1 + cornerIds.length) % cornerIds.length]
      const nextId = cornerIds[(i + 1) % cornerIds.length]

      const prevPt = points[nodeRefSidePointId(prevId)]
      const currPt = points[nodeRefSidePointId(currentId)]
      const nextPt = points[nodeRefSidePointId(nextId)]

      const vecToNext = direction(newVec2(currPt.x, currPt.y), newVec2(nextPt.x, nextPt.y))
      const vecFromPrev = direction(newVec2(currPt.x, currPt.y), newVec2(prevPt.x, prevPt.y))

      const cross = crossVec2(vecToNext, vecFromPrev)

      if (Math.abs(cross) < COLLINEARITY_THRESHOLD) {
        return false
      }
    }
  }

  return true
}
