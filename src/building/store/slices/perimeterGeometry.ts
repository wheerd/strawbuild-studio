/**
 * Perimeter geometry calculation utilities
 *
 * This module contains all the geometry calculation functions for perimeters,
 * walls, corners, and wall entities (openings/posts). These functions are used
 * both by the perimeter slice and by migrations to ensure consistent geometry.
 */
import type {
  Opening,
  OpeningGeometry,
  Perimeter,
  PerimeterCorner,
  PerimeterCornerGeometry,
  PerimeterGeometry,
  PerimeterReferenceSide,
  PerimeterWall,
  PerimeterWallGeometry,
  WallEntity,
  WallEntityGeometry,
  WallPost,
  WallPostGeometry
} from '@/building/model'
import { type PerimeterId, isOpeningId } from '@/building/model/ids'
import {
  type Length,
  type Line2D,
  type Polygon2D,
  type Vec2,
  ZERO_VEC2,
  addVec2,
  copyVec2,
  crossVec2,
  direction,
  distVec2,
  dotVec2,
  eqVec2,
  lineFromPoints,
  lineIntersection,
  midpoint,
  negVec2,
  perpendicularCCW,
  projectPointOntoLine,
  radiansToDegrees,
  scaleAddVec2,
  scaleVec2
} from '@/shared/geometry'
import { ensurePolygonIsClockwise } from '@/shared/geometry/polygon'

// State interface for perimeter geometry calculations
export interface PerimetersState {
  perimeters: Record<PerimeterId, Perimeter>
  _perimeterGeometry: Record<PerimeterId, PerimeterGeometry>
  perimeterWalls: Record<string, PerimeterWall>
  _perimeterWallGeometry: Record<string, PerimeterWallGeometry>
  perimeterCorners: Record<string, PerimeterCorner>
  _perimeterCornerGeometry: Record<string, PerimeterCornerGeometry>
  openings: Record<string, Opening>
  _openingGeometry: Record<string, OpeningGeometry>
  wallPosts: Record<string, WallPost>
  _wallPostGeometry: Record<string, WallPostGeometry>
}

// Step 1: Create infinite inside and outside lines for each wall
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
      throw new Error('Wall cannot have zero length')
    }

    const outwardDirection = perpendicularCCW(baseLine.direction)
    let insideLine: Line2D
    let outsideLine: Line2D

    if (referenceSide === 'inside') {
      insideLine = baseLine
      const outsidePoint = scaleAddVec2(startPoint, outwardDirection, wallThickness)
      outsideLine = { point: outsidePoint, direction: baseLine.direction }
    } else {
      outsideLine = baseLine
      const insidePoint = scaleAddVec2(startPoint, outwardDirection, -wallThickness)
      insideLine = { point: insidePoint, direction: baseLine.direction }
    }

    infiniteLines.push({ inside: insideLine, outside: outsideLine })
  }

  return infiniteLines
}

// Step 2: Recalculate corner outside point as intersections of adjacent lines
const updateCornerOutsidePoint = (
  corner: PerimeterCornerGeometry,
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
    corner.outsidePoint = scaleAddVec2(corner.insidePoint, outsideDirection, maxThickness)
  }
}

const updateAllCornerOutsidePoints = (
  corners: PerimeterCornerGeometry[],
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
  corner: PerimeterCornerGeometry,
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
    const inwardDirection = negVec2(perpendicularCCW(nextInsideLine.direction))
    corner.insidePoint = scaleAddVec2(corner.outsidePoint, inwardDirection, minThickness)
  }
}

const updateAllCornerInsidePoints = (
  corners: PerimeterCornerGeometry[],
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

const calculateCornerAngles = (
  previousPoint: Vec2,
  cornerPoint: Vec2,
  nextPoint: Vec2
): { interiorAngle: number; exteriorAngle: number } => {
  // Edge vectors
  const n1 = direction(cornerPoint, previousPoint)
  const n2 = direction(cornerPoint, nextPoint)

  // Angle between vectors (0..180)
  const dot = dotVec2(n1, n2)
  const clampedDot = Math.max(-1, Math.min(1, dot))
  const angleBetween = Math.acos(clampedDot) // radians

  // Determine orientation using cross product (z-component)
  const interiorAngleRad =
    crossVec2(n1, n2) < 0
      ? 2 * Math.PI - angleBetween // Reflex (concave) interior angle
      : angleBetween // Convex interior angle

  const interiorAngle = Math.round(radiansToDegrees(interiorAngleRad))
  const exteriorAngle = 360 - interiorAngle

  return { interiorAngle, exteriorAngle }
}

// Calculate angles for all corners
const updateAllCornerAngles = (corners: PerimeterCornerGeometry[]): void => {
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

const updateWallGeometry = (
  thickness: Length,
  startCorner: PerimeterCornerGeometry,
  endCorner: PerimeterCornerGeometry
): PerimeterWallGeometry => {
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
    point: scaleAddVec2(insideStart, outsideDirection, thickness),
    direction: wallDirection
  }

  // Project boundary points onto outside line
  const boundaryStartOnOutside = projectPointOntoLine(insideStart, outsideLine)
  const boundaryEndOnOutside = projectPointOntoLine(insideEnd, outsideLine)

  // Project corner outside points onto inside line
  const cornerStartOnInside = projectPointOntoLine(startCornerOutside, insideLine)
  const cornerEndOnInside = projectPointOntoLine(endCornerOutside, insideLine)

  // Choose endpoints based on which projection is closer to wall midpoint
  const startDistBoundary = distVec2(insideStart, wallMidpoint)
  const startDistCorner = distVec2(cornerStartOnInside, wallMidpoint)
  const endDistBoundary = distVec2(insideEnd, wallMidpoint)
  const endDistCorner = distVec2(cornerEndOnInside, wallMidpoint)

  const finalInsideStart = startDistBoundary <= startDistCorner ? insideStart : cornerStartOnInside
  const finalInsideEnd = endDistBoundary <= endDistCorner ? insideEnd : cornerEndOnInside
  const finalOutsideStart = startDistBoundary <= startDistCorner ? boundaryStartOnOutside : startCornerOutside
  const finalOutsideEnd = endDistBoundary <= endDistCorner ? boundaryEndOnOutside : endCornerOutside

  const polygon: Polygon2D = ensurePolygonIsClockwise({
    points: [finalInsideStart, finalInsideEnd, finalOutsideEnd, finalOutsideStart]
  })

  return {
    insideLength: distVec2(insideStart, insideEnd),
    outsideLength: distVec2(startCornerOutside, endCornerOutside),
    wallLength: distVec2(finalInsideStart, finalInsideEnd),
    insideLine: { start: finalInsideStart, end: finalInsideEnd },
    outsideLine: { start: finalOutsideStart, end: finalOutsideEnd },
    direction: wallDirection,
    outsideDirection,
    polygon
  }
}

export function updateEntityGeometry(wall: PerimeterWallGeometry, entity: WallEntity): WallEntityGeometry {
  // Extract wall geometry
  const insideStart = wall.insideLine.start
  const outsideStart = wall.outsideLine.start
  const wallVector = wall.direction

  // Calculate left edge from center position
  const offsetDistance = entity.centerOffsetFromWallStart - entity.width / 2
  const centerWallStart = midpoint(insideStart, outsideStart)
  const offsetStart = scaleVec2(wallVector, offsetDistance)
  const offsetEnd = scaleAddVec2(offsetStart, wallVector, entity.width)
  const centerStart = scaleAddVec2(centerWallStart, wallVector, offsetDistance)
  const centerEnd = scaleAddVec2(centerStart, wallVector, entity.width)
  const center = midpoint(centerStart, centerEnd)

  // Calculate entity polygon corners
  const insideEntityStart = addVec2(insideStart, offsetStart)
  const insideEntityEnd = addVec2(insideStart, offsetEnd)
  const outsideEntityStart = addVec2(outsideStart, offsetStart)
  const outsideEntityEnd = addVec2(outsideStart, offsetEnd)

  const entityPolygon = ensurePolygonIsClockwise({
    points: [insideEntityStart, insideEntityEnd, outsideEntityEnd, outsideEntityStart]
  })

  return {
    insideLine: { start: insideEntityStart, end: insideEntityEnd },
    outsideLine: { start: outsideEntityStart, end: outsideEntityEnd },
    polygon: entityPolygon,
    center
  }
}

/**
 * High-level function to recalculate all perimeter geometry in place.
 * This updates the geometry for the perimeter, all its walls, corners, and wall entities.
 *
 * @param state - The perimeters state containing all normalized data
 * @param perimeterId - The ID of the perimeter to update
 */
export function updatePerimeterGeometry(state: PerimetersState, perimeterId: PerimeterId): void {
  const perimeter = state.perimeters[perimeterId]

  if (perimeter.wallIds.length !== perimeter.cornerIds.length) {
    throw new Error('Walls and corners are out of sync')
  }

  const walls = perimeter.wallIds.map(w => state.perimeterWalls[w])
  const thicknesses = walls.map(wall => wall.thickness)

  const referencePoints = perimeter.cornerIds.map(c => state.perimeterCorners[c].referencePoint)
  const infiniteLines = createInfiniteLines({ points: referencePoints }, thicknesses, perimeter.referenceSide)

  const corners: PerimeterCornerGeometry[] = perimeter.cornerIds.map(() => ({
    insidePoint: ZERO_VEC2,
    outsidePoint: ZERO_VEC2,
    exteriorAngle: 0,
    interiorAngle: 0,
    polygon: { points: [] }
  }))

  if (perimeter.referenceSide === 'inside') {
    corners.forEach((corner, i) => {
      corner.insidePoint = copyVec2(referencePoints[i])
    })
    updateAllCornerOutsidePoints(corners, thicknesses, infiniteLines)
  } else {
    corners.forEach((corner, i) => {
      corner.outsidePoint = copyVec2(referencePoints[i])
    })
    updateAllCornerInsidePoints(corners, thicknesses, infiniteLines)
  }

  updateAllCornerAngles(corners)

  // Store corner geometry
  perimeter.cornerIds.forEach((cornerId, i) => {
    state._perimeterCornerGeometry[cornerId] = corners[i]
  })

  // Update wall geometry
  for (const wallId of perimeter.wallIds) {
    const wall = state.perimeterWalls[wallId]
    const startCorner = state._perimeterCornerGeometry[wall.startCornerId]
    const endCorner = state._perimeterCornerGeometry[wall.endCornerId]
    const wallGeometry = updateWallGeometry(wall.thickness, startCorner, endCorner)
    state._perimeterWallGeometry[wallId] = wallGeometry

    // Update entity geometry for all openings and posts
    for (const entityId of wall.entityIds) {
      if (isOpeningId(entityId)) {
        const opening = state.openings[entityId]
        const openingGeometry = updateEntityGeometry(wallGeometry, opening)
        state._openingGeometry[entityId] = openingGeometry
      } else {
        const post = state.wallPosts[entityId]
        const postGeometry = updateEntityGeometry(wallGeometry, post)
        state._wallPostGeometry[entityId] = postGeometry
      }
    }
  }

  // Update corner polygons (requires wall geometry to be calculated first)
  for (let i = 0; i < corners.length; i++) {
    const cornerGeometry = corners[i]
    const corner = state.perimeterCorners[perimeter.cornerIds[i]]
    const previousWall = state._perimeterWallGeometry[corner.previousWallId]
    const nextWall = state._perimeterWallGeometry[corner.nextWallId]

    cornerGeometry.polygon = {
      points: [
        cornerGeometry.insidePoint,
        eqVec2(cornerGeometry.insidePoint, previousWall.insideLine.end) ? null : previousWall.insideLine.end,
        eqVec2(cornerGeometry.outsidePoint, previousWall.outsideLine.end) ? null : previousWall.outsideLine.end,
        cornerGeometry.outsidePoint,
        eqVec2(cornerGeometry.outsidePoint, nextWall.outsideLine.start) ? null : nextWall.outsideLine.start,
        eqVec2(cornerGeometry.insidePoint, nextWall.insideLine.start) ? null : nextWall.insideLine.start
      ].filter(p => p !== null)
    }

    state._perimeterCornerGeometry[perimeter.cornerIds[i]] = cornerGeometry
  }

  // Update perimeter-level geometry
  state._perimeterGeometry[perimeterId] = {
    innerPolygon: { points: corners.map(c => c.insidePoint) },
    outerPolygon: { points: corners.map(c => c.outsidePoint) }
  }
}
