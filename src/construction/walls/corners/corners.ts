import type { PerimeterCornerWithGeometry, PerimeterWallWithGeometry } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import type { WallCornerInfo } from '@/construction/walls/construction'
import { distVec2, scaleAddVec2 } from '@/shared/geometry'

export interface WallContext {
  startCorner: PerimeterCornerWithGeometry
  previousWall: PerimeterWallWithGeometry
  endCorner: PerimeterCornerWithGeometry
  nextWall: PerimeterWallWithGeometry
}

export function getWallContext(wall: PerimeterWallWithGeometry): WallContext {
  const { getPerimeterCornerById, getPerimeterWallById } = getModelActions()
  const startCorner = getPerimeterCornerById(wall.startCornerId)
  const endCorner = getPerimeterCornerById(wall.endCornerId)
  const previousWall = getPerimeterWallById(startCorner.previousWallId)
  const nextWall = getPerimeterWallById(endCorner.nextWallId)
  return {
    startCorner,
    previousWall,
    endCorner,
    nextWall
  }
}

export function calculateWallCornerInfo(wall: PerimeterWallWithGeometry, context: WallContext): WallCornerInfo {
  const { startCorner, endCorner, previousWall, nextWall } = context
  const { getWallAssemblyById } = getConfigActions()

  const previousAssembly = getWallAssemblyById(previousWall.wallAssemblyId)
  const nextAssembly = getWallAssemblyById(nextWall.wallAssemblyId)
  const currentAssembly = getWallAssemblyById(wall.wallAssemblyId)

  if (!previousAssembly || !nextAssembly || !currentAssembly) {
    throw new Error('Invalid wall assembly')
  }

  const outerStartExtension = Math.round(
    distVec2(wall.outsideLine.start, startCorner.outsidePoint) - previousAssembly.layers.outsideThickness
  )
  const innerStartExtension = Math.round(
    distVec2(wall.insideLine.start, startCorner.insidePoint) - previousAssembly.layers.insideThickness
  )
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

  const outerEndExtension = Math.round(
    distVec2(wall.outsideLine.end, endCorner.outsidePoint) - nextAssembly.layers.outsideThickness
  )
  const innerEndExtension = Math.round(
    distVec2(wall.insideLine.end, endCorner.insidePoint) - nextAssembly.layers.insideThickness
  )
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

  const constructionLength = Math.round(wall.wallLength + appliedStartExtension + appliedEndExtension)

  // Calculate construction lines adjusted by layer thickness
  const epsilon = 1e-2
  const constructionInsideLine = {
    start: scaleAddVec2(
      scaleAddVec2(wall.insideLine.start, wall.outsideDirection, currentAssembly.layers.insideThickness + epsilon),
      wall.direction,
      -appliedStartExtension
    ),
    end: scaleAddVec2(
      scaleAddVec2(wall.insideLine.end, wall.outsideDirection, currentAssembly.layers.insideThickness + epsilon),
      wall.direction,
      appliedEndExtension
    )
  }
  const constructionOutsideLine = {
    start: scaleAddVec2(
      scaleAddVec2(wall.outsideLine.start, wall.outsideDirection, -currentAssembly.layers.outsideThickness - epsilon),
      wall.direction,
      -appliedStartExtension
    ),
    end: scaleAddVec2(
      scaleAddVec2(wall.outsideLine.end, wall.outsideDirection, -currentAssembly.layers.outsideThickness - epsilon),
      wall.direction,
      appliedEndExtension
    )
  }

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
    constructionLength,
    constructionInsideLine,
    constructionOutsideLine
  }
}
