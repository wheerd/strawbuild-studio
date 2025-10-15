import { vec2 } from 'gl-matrix'

import type { Perimeter, PerimeterCorner, PerimeterWall } from '@/building/model/model'
import { getConfigActions } from '@/construction/config'
import type { WallCornerInfo } from '@/construction/walls/construction'

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
  const { getWallAssemblyById } = getConfigActions()

  const previousAssembly = getWallAssemblyById(previousWall.wallAssemblyId)
  const nextAssembly = getWallAssemblyById(nextWall.wallAssemblyId)

  if (!previousAssembly || !nextAssembly) {
    throw new Error('Invalid wall assembly')
  }

  const outerStartExtension =
    vec2.distance(wall.outsideLine.start, startCorner.outsidePoint) - previousAssembly.layers.outsideThickness
  const innerStartExtension =
    vec2.distance(wall.insideLine.start, startCorner.insidePoint) - previousAssembly.layers.insideThickness
  const startExtended = startCorner.constructedByWall === 'next'
  const startExtension = startCorner.exteriorAngle === 180 ? 0 : Math.max(outerStartExtension, innerStartExtension)
  const appliedStartExtension =
    startCorner.exteriorAngle === 180
      ? 0
      : startExtended
        ? startExtension
        : startExtension === outerStartExtension
          ? previousAssembly.layers.insideThickness
          : previousAssembly.layers.outsideThickness

  const outerEndExtension =
    vec2.distance(wall.outsideLine.end, endCorner.outsidePoint) - nextAssembly.layers.outsideThickness
  const innerEndExtension =
    vec2.distance(wall.insideLine.end, endCorner.insidePoint) - nextAssembly.layers.insideThickness
  const endExtended = endCorner.constructedByWall === 'previous'
  const endExtension = endCorner.exteriorAngle === 180 ? 0 : Math.max(outerEndExtension, innerEndExtension)
  const appliedEndExtension =
    endCorner.exteriorAngle === 180
      ? 0
      : endExtended
        ? endExtension
        : endExtension === outerEndExtension
          ? nextAssembly.layers.insideThickness
          : nextAssembly.layers.outsideThickness

  const constructionLength = wall.wallLength + appliedStartExtension + appliedEndExtension

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
