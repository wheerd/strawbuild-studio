import type { SketchPoint } from '@salusoft89/planegcs'

import type { PerimeterCornerId, PerimeterId } from '@/building/model'
import { polygonEdges } from '@/construction/helpers'
import { crossVec2, direction, newVec2, segmentsIntersect, wouldClosingPolygonSelfIntersect } from '@/shared/geometry'

const MIN_WALL_LENGTH = 50
const COLLINEARITY_THRESHOLD = 1e-4

export interface ValidationResult {
  valid: boolean
  reason?: string
}

export function validateSolution(
  points: Record<string, SketchPoint>,
  cornerOrderMap: Map<PerimeterId, PerimeterCornerId[]>
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

  if (!checkColinearity(points, cornerOrderMap)) {
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

      const currentPt = points[`corner_${currentId}_in`]
      const nextPt = points[`corner_${nextId}_in`]

      const distance = Math.sqrt(Math.pow(currentPt.x - nextPt.x, 2) + Math.pow(currentPt.y - nextPt.y, 2))

      if (distance < MIN_WALL_LENGTH) {
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
    const innerPoints = cornerIds.map(id => points[`corner_${id}_in`])

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
    const innerPoints = cornerIds.map(id => points[`corner_${id}_in`])
    const outerPoints = cornerIds.map(id => points[`corner_${id}_out`])

    if (innerPoints.length < 3 || outerPoints.length < 3) {
      continue
    }

    const innerPolygon = {
      points: innerPoints.map(pt => newVec2(pt.x, pt.y))
    }
    const outerPolygon = {
      points: outerPoints.map(pt => newVec2(pt.x, pt.y))
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
  cornerOrderMap: Map<PerimeterId, PerimeterCornerId[]>
): boolean {
  for (const cornerIds of cornerOrderMap.values()) {
    for (let i = 0; i < cornerIds.length; i++) {
      const prevId = cornerIds[(i - 1 + cornerIds.length) % cornerIds.length]
      const currentId = cornerIds[i]
      const nextId = cornerIds[(i + 1) % cornerIds.length]

      const prevPt = points[`corner_${prevId}_in`]
      const currPt = points[`corner_${currentId}_in`]
      const nextPt = points[`corner_${nextId}_in`]

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
