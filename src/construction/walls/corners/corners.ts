import type { Perimeter, PerimeterCorner, PerimeterWall } from '@/building/model/model'
import type { WallCornerInfo } from '@/construction/walls/construction'
import type { Length } from '@/shared/geometry'
import { distance } from '@/shared/geometry'

/**
 * Calculate the extension distance for corner construction.
 * Takes the maximum of outer extension (outside line to outside point) and
 * inner extension (inside line to inside point) to handle both convex and concave corners.
 */
function calculateCornerExtension(corner: PerimeterCorner, wall: PerimeterWall, isStartCorner: boolean): Length {
  if (isStartCorner) {
    // Calculate outer extension: distance from start of wall.outsideLine to corner.outsidePoint
    const outerWallStart = wall.outsideLine.start
    const outerExtension = distance(outerWallStart, corner.outsidePoint)

    // Calculate inner extension: distance from start of wall.insideLine to corner.insidePoint
    const innerWallStart = wall.insideLine.start
    const innerExtension = distance(innerWallStart, corner.insidePoint)

    // Take the maximum to handle both outer and inner corners correctly
    return Math.max(outerExtension, innerExtension) as Length
  } else {
    // Calculate outer extension: distance from end of wall.outsideLine to corner.outsidePoint
    const outerWallEnd = wall.outsideLine.end
    const outerExtension = distance(outerWallEnd, corner.outsidePoint)

    // Calculate inner extension: distance from end of wall.insideLine to corner.insidePoint
    const innerWallEnd = wall.insideLine.end
    const innerExtension = distance(innerWallEnd, corner.insidePoint)

    // Take the maximum to handle both outer and inner corners correctly
    return Math.max(outerExtension, innerExtension) as Length
  }
}

/**
 * Get the corners adjacent to a specific wall
 */
function getWallCorners(
  wall: PerimeterWall,
  perimeter: Perimeter
): {
  startCorner: PerimeterCorner | null
  endCorner: PerimeterCorner | null
} {
  // Find corners at wall start/end based on wall position in perimeter
  const wallIndex = perimeter.walls.findIndex(w => w.id === wall.id)

  if (wallIndex === -1) {
    return { startCorner: null, endCorner: null }
  }

  const startCornerIndex = wallIndex // corner[i] is the start corner for wall[i]
  const endCornerIndex = (wallIndex + 1) % perimeter.corners.length // corner[i+1] is the end corner for wall[i]

  return {
    startCorner: perimeter.corners[startCornerIndex],
    endCorner: perimeter.corners[endCornerIndex]
  }
}

/**
 * Calculate the actual construction length including assigned corners
 */
export function calculateWallConstructionLength(
  wall: PerimeterWall,
  startCorner: PerimeterCorner | null,
  endCorner: PerimeterCorner | null
): {
  constructionLength: Length
  startExtension: Length
  endExtension: Length
} {
  let constructionLength = wall.wallLength // Base inside length

  const startExtension =
    startCorner?.constuctedByWall === 'next' ? calculateCornerExtension(startCorner, wall, true) : (0 as Length)

  const endExtension =
    endCorner?.constuctedByWall === 'previous' ? calculateCornerExtension(endCorner, wall, false) : (0 as Length)

  constructionLength = (constructionLength + startExtension + endExtension) as Length

  return { constructionLength, startExtension, endExtension }
}

/**
 * Calculate complete corner information for a wall's construction plan
 */
export function calculateWallCornerInfo(wall: PerimeterWall, perimeter: Perimeter): WallCornerInfo {
  const { startCorner, endCorner } = getWallCorners(wall, perimeter)

  const result: WallCornerInfo = {
    startCorner: null,
    endCorner: null
  }

  if (startCorner) {
    const extensionDistance = calculateCornerExtension(startCorner, wall, true)
    const constructedByWallThisWall = startCorner.constuctedByWall === 'next'

    result.startCorner = {
      id: startCorner.id,
      constructedByThisWall: constructedByWallThisWall,
      extensionDistance
    }
  }

  if (endCorner) {
    const extensionDistance = calculateCornerExtension(endCorner, wall, false)
    const constructedByWallThisWall = endCorner.constuctedByWall === 'previous'

    result.endCorner = {
      id: endCorner.id,
      constructedByThisWall: constructedByWallThisWall,
      extensionDistance
    }
  }

  return result
}
