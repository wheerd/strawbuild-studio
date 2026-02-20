import type { PerimeterCornerId, PerimeterCornerWithGeometry, PerimeterWallWithGeometry } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions, resolveLayerSetThickness } from '@/construction/config'
import { type Length, type LineSegment2D, distVec2, scaleAddVec2 } from '@/shared/geometry'

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

export interface WallCornerInfo {
  startCorner: {
    id: PerimeterCornerId
    constructedByThisWall: boolean
    extensionDistance: Length
  }
  endCorner: {
    id: PerimeterCornerId
    constructedByThisWall: boolean
    extensionDistance: Length
  }
  extensionStart: Length
  constructionLength: Length
  extensionEnd: Length
  constructionInsideLine: LineSegment2D
  constructionOutsideLine: LineSegment2D
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

  const previousInsideThickness = resolveLayerSetThickness(previousAssembly.insideLayerSetId)
  const previousOutsideThickness = resolveLayerSetThickness(previousAssembly.outsideLayerSetId)
  const nextInsideThickness = resolveLayerSetThickness(nextAssembly.insideLayerSetId)
  const nextOutsideThickness = resolveLayerSetThickness(nextAssembly.outsideLayerSetId)
  const currentInsideThickness = resolveLayerSetThickness(currentAssembly.insideLayerSetId)
  const currentOutsideThickness = resolveLayerSetThickness(currentAssembly.outsideLayerSetId)

  const outerStartExtension = Math.round(
    distVec2(wall.outsideLine.start, startCorner.outsidePoint) - previousOutsideThickness
  )
  const innerStartExtension = Math.round(
    distVec2(wall.insideLine.start, startCorner.insidePoint) - previousInsideThickness
  )
  const startExtended = startCorner.constructedByWall === 'next'
  const startExtension = startCorner.exteriorAngle === 180 ? 0 : Math.max(outerStartExtension, innerStartExtension)
  const appliedStartExtension =
    startCorner.exteriorAngle === 180
      ? 0
      : startExtended
        ? startExtension
        : startExtension === outerStartExtension
          ? previousInsideThickness
          : previousOutsideThickness

  const outerEndExtension = Math.round(distVec2(wall.outsideLine.end, endCorner.outsidePoint) - nextOutsideThickness)
  const innerEndExtension = Math.round(distVec2(wall.insideLine.end, endCorner.insidePoint) - nextInsideThickness)
  const endExtended = endCorner.constructedByWall === 'previous'
  const endExtension = endCorner.exteriorAngle === 180 ? 0 : Math.max(outerEndExtension, innerEndExtension)
  const appliedEndExtension =
    endCorner.exteriorAngle === 180
      ? 0
      : endExtended
        ? endExtension
        : endExtension === outerEndExtension
          ? nextInsideThickness
          : nextOutsideThickness

  const constructionLength = Math.round(wall.wallLength + appliedStartExtension + appliedEndExtension)

  const epsilon = 1e-2
  const constructionInsideLine = {
    start: scaleAddVec2(
      scaleAddVec2(wall.insideLine.start, wall.outsideDirection, currentInsideThickness + epsilon),
      wall.direction,
      -appliedStartExtension
    ),
    end: scaleAddVec2(
      scaleAddVec2(wall.insideLine.end, wall.outsideDirection, currentInsideThickness + epsilon),
      wall.direction,
      appliedEndExtension
    )
  }
  const constructionOutsideLine = {
    start: scaleAddVec2(
      scaleAddVec2(wall.outsideLine.start, wall.outsideDirection, -currentOutsideThickness - epsilon),
      wall.direction,
      -appliedStartExtension
    ),
    end: scaleAddVec2(
      scaleAddVec2(wall.outsideLine.end, wall.outsideDirection, -currentOutsideThickness - epsilon),
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
