import type {
  Constraint,
  P2PDistance,
  PointOnLine_PL as PointOnLine,
  SketchLine,
  SketchPoint
} from '@salusoft89/planegcs'

import {
  type PerimeterCornerId,
  type PerimeterId,
  type PerimeterWallId,
  type WallEntityId,
  isWallPostId
} from '@/building/model'
import { getModelActions } from '@/building/store'
import { polygonEdges } from '@/construction/helpers'
import {
  nodeNonRefSidePointForNextWall,
  nodeNonRefSidePointForPrevWall,
  nodeRefSidePointId,
  wallEntityOnLineConstraintId,
  wallEntityWidthConstraintId,
  wallNonRefSideProjectedPoint
} from '@/editor/gcs/constraintTranslator'
import {
  type Length,
  crossVec2,
  direction,
  distVec2,
  newVec2,
  projectVec2,
  segmentsIntersect,
  wouldClosingPolygonSelfIntersect
} from '@/shared/geometry'

const MIN_WALL_LENGTH_SQ = 50 * 50
const COLLINEARITY_THRESHOLD = 1e-4

export interface ValidationResult {
  valid: boolean
  reason?: string
}

interface WallEntityContext {
  startOffset: Length
  length: Length
  endOffset: Length
  entities: { entityId: WallEntityId; offset: Length; width: Length }[]
}

function checkEntityPositions(
  points: Record<string, SketchPoint>,
  constraints: Record<string, Constraint>,
  linesMap: Record<string, SketchLine>
): boolean {
  const wallEntities: Record<PerimeterWallId, WallEntityContext> = {}

  // Extract wall entity information from GCS
  for (const point of Object.values(points)) {
    // Find entity center points, format "{id}_center_ref"
    if (!point.id.endsWith('_center_ref')) continue
    const entityId = point.id.substring(0, point.id.length - '_center_ref'.length) as WallEntityId

    const wallConstraint = constraints[wallEntityOnLineConstraintId(entityId, 'center')] as PointOnLine
    const wallLineId = wallConstraint.l_id
    const wallId = wallLineId.substring(5, wallLineId.length - 4) as PerimeterWallId // Format: wall_{id}_ref
    const wallLine = linesMap[wallLineId]

    const widthConstraint = constraints[wallEntityWidthConstraintId(entityId)] as P2PDistance
    const width = widthConstraint.distance as number

    const startPoint1 = points[wallLine.p1_id]
    const startPoint2 = points[wallNonRefSideProjectedPoint(wallId, 'start')]
    const startPos1 = newVec2(startPoint1.x, startPoint1.y)
    const startPos2 = newVec2(startPoint2.x, startPoint2.y)

    const endPoint1 = points[wallLine.p2_id]
    const endPoint2 = points[wallNonRefSideProjectedPoint(wallId, 'end')]
    const endPos1 = newVec2(endPoint1.x, endPoint1.y)
    const endPos2 = newVec2(endPoint2.x, endPoint2.y)

    const wallDir = direction(startPos1, endPos1)

    const basePos = projectVec2(startPos1, startPos2, wallDir) > 0 ? startPos2 : startPos1
    const endPos = projectVec2(endPos1, endPos2, wallDir) > 0 ? endPos1 : endPos2

    const centerPos = newVec2(point.x, point.y)
    const offset = projectVec2(basePos, centerPos, wallDir)

    if (!(wallId in wallEntities)) {
      // Format: corner_{id}_ref
      const startCornerId = wallLine.p1_id.substring(7, wallLine.p1_id.length - 4) as PerimeterCornerId
      const startCorner = getModelActions().getPerimeterCornerById(startCornerId)
      const startCornerOffset =
        startCorner.constructedByWall === 'next'
          ? Math.min(projectVec2(basePos, startPos1, wallDir), projectVec2(basePos, startPos2, wallDir))
          : 0

      // Format: corner_{id}_ref
      const endCornerId = wallLine.p2_id.substring(7, wallLine.p2_id.length - 4) as PerimeterCornerId
      const endCorner = getModelActions().getPerimeterCornerById(endCornerId)
      const endCornerOffset =
        endCorner.constructedByWall === 'previous'
          ? Math.max(projectVec2(endPos, endPos1, wallDir), projectVec2(endPos, endPos2, wallDir))
          : 0

      wallEntities[wallId] = {
        startOffset: startCornerOffset,
        endOffset: endCornerOffset,
        length: distVec2(basePos, endPos),
        entities: []
      }
    }
    wallEntities[wallId].entities.push({ offset, width, entityId })
  }

  for (const context of Object.values(wallEntities)) {
    const { startOffset, endOffset, length, entities } = context
    entities.sort((a, b) => a.offset - b.offset)

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const entityStartOffset = entity.offset - entity.width / 2
      const entityEndOffset = entity.offset + entity.width / 2

      const minOffset = isWallPostId(entity.entityId) ? startOffset : 0
      const maxOffset = length + (isWallPostId(entity.entityId) ? endOffset : 0)

      // Out of wall bounds?
      if (entityStartOffset < minOffset || entityEndOffset > maxOffset) return false

      // Check overlap with previous
      if (i > 0) {
        const prevEntity = entities[i - 1]
        if (prevEntity.offset + prevEntity.width / 2 > entityStartOffset) return false
      }
    }
  }

  return true
}

export function validateSolution(
  points: Record<string, SketchPoint>,
  cornerOrderMap: Map<PerimeterId, PerimeterCornerId[]>,
  constraints: Record<string, Constraint>,
  linesMap: Record<string, SketchLine>
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

  if (!checkEntityPositions(points, constraints, linesMap)) {
    return { valid: false, reason: 'Wall entity position violation' }
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

      const constraintId = `bc_constraint_colinearCorner_${currentId}`
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
