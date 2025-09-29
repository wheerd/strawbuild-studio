import type { Perimeter, PerimeterCorner, PerimeterWall } from '@/building/model/model'
import { getConfigActions } from '@/construction/config'
import type { WallCornerInfo } from '@/construction/walls/construction'
import type { Length } from '@/shared/geometry'
import { distance } from '@/shared/geometry'

export interface WallContext {
  startCorner: PerimeterCorner
  previousWall: PerimeterWall
  endCorner: PerimeterCorner
  nextWall: PerimeterWall
}

export function getWallContext(wall: PerimeterWall, perimeter: Perimeter): WallContext {
  const wallIndex = perimeter.walls.findIndex(w => w.id === wall.id)
  if (wallIndex === -1) {
    throw new Error(`Could not find wall with id ${wall.id}`)
  }

  const startWallIndex = (wallIndex - 1 + perimeter.walls.length) % perimeter.walls.length // wall[i-1] is the wall at the start corner for wall[i]
  const startCornerIndex = wallIndex // corner[i] is the start corner for wall[i]
  const endCornerIndex = (wallIndex + 1) % perimeter.corners.length // corner[i+1] is the end corner for wall[i]

  return {
    startCorner: perimeter.corners[startCornerIndex],
    previousWall: perimeter.walls[startWallIndex],
    endCorner: perimeter.corners[endCornerIndex],
    nextWall: perimeter.walls[endCornerIndex]
  }
}

export function calculateWallCornerInfo(wall: PerimeterWall, context: WallContext): WallCornerInfo {
  const { startCorner, endCorner, previousWall, nextWall } = context
  const { getPerimeterConstructionMethodById } = getConfigActions()

  const previousMethod = getPerimeterConstructionMethodById(previousWall.constructionMethodId)
  const nextMethod = getPerimeterConstructionMethodById(nextWall.constructionMethodId)

  if (!previousMethod || !nextMethod) {
    throw new Error('Invalid wall construction method')
  }

  const outerStartExtension =
    distance(wall.outsideLine.start, startCorner.outsidePoint) - previousMethod.layers.outsideThickness
  const innerStartExtension =
    distance(wall.insideLine.start, startCorner.insidePoint) - previousMethod.layers.insideThickness
  const startExtended = startCorner.constuctedByWall === 'next'
  const startExtension = Math.max(outerStartExtension, innerStartExtension) as Length
  const appliedStartExtension = startExtended
    ? startExtension
    : startExtension === outerStartExtension
      ? previousMethod.layers.insideThickness
      : previousMethod.layers.outsideThickness

  const outerEndExtension = distance(wall.outsideLine.end, endCorner.outsidePoint) - nextMethod.layers.outsideThickness
  const innerEndExtension = distance(wall.insideLine.end, endCorner.insidePoint) - nextMethod.layers.insideThickness
  const endExtended = endCorner.constuctedByWall === 'previous'
  const endExtension = Math.max(outerEndExtension, innerEndExtension) as Length
  const appliedEndExtension = endExtended
    ? endExtension
    : endExtension === outerEndExtension
      ? nextMethod.layers.insideThickness
      : nextMethod.layers.outsideThickness

  const constructionLength = (wall.wallLength + appliedStartExtension + appliedEndExtension) as Length

  return {
    startCorner: {
      id: startCorner.id,
      constructedByThisWall: startExtended,
      extensionDistance: startExtension
    },
    endCorner: {
      id: endCorner.id,
      constructedByThisWall: endExtended,
      extensionDistance: endExtension
    },
    extensionStart: appliedStartExtension,
    extensionEnd: appliedEndExtension,
    constructionLength
  }
}
