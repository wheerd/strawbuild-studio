import type { Perimeter } from '@/building/model'
import type { PerimeterCornerId, PerimeterId, PerimeterWallId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model'
import { computePerimeterConstructionContext } from '@/construction/perimeters/context'
import { type Length, type LineSegment2D, fromTrans, newVec3 } from '@/shared/geometry'

import { WALL_ASSEMBLIES } from './index'
import { createWallStoreyContext } from './segmentation'

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
  // Construction lines for roof queries (adjusted by layer thickness)
  constructionInsideLine: LineSegment2D
  constructionOutsideLine: LineSegment2D
}

function findColinearWalls(perimeter: Perimeter, startWallId: PerimeterWallId): PerimeterWallId[] {
  const startIndex = perimeter.walls.findIndex(w => w.id === startWallId)
  if (startIndex === -1) {
    throw new Error(`Wall ${startWallId} not found in perimeter`)
  }

  const colinearWallIds: PerimeterWallId[] = [startWallId]

  let currentIndex = startIndex
  while (true) {
    const cornerIndex = currentIndex
    const corner = perimeter.corners[cornerIndex]

    if (corner.interiorAngle !== 180) break

    currentIndex = (currentIndex - 1 + perimeter.walls.length) % perimeter.walls.length

    if (currentIndex === startIndex) break

    colinearWallIds.unshift(perimeter.walls[currentIndex].id)
  }

  currentIndex = startIndex
  while (true) {
    const cornerIndex = (currentIndex + 1) % perimeter.corners.length
    const corner = perimeter.corners[cornerIndex]

    if (corner.interiorAngle !== 180) break

    currentIndex = (currentIndex + 1) % perimeter.walls.length

    if (currentIndex === startIndex) break

    colinearWallIds.push(perimeter.walls[currentIndex].id)
  }

  return colinearWallIds
}

export function constructWall(
  perimeterId: PerimeterId,
  wallId: PerimeterWallId,
  includeColinear = false
): ConstructionModel {
  const { getPerimeterById, getStoreyById, getStoreyAbove } = getModelActions()
  const { getWallAssemblyById, getFloorAssemblyById } = getConfigActions()

  const perimeter = getPerimeterById(perimeterId)
  if (!perimeter) {
    throw new Error(`Perimeter with ID ${perimeterId} not found`)
  }

  const storey = getStoreyById(perimeter.storeyId)
  if (!storey) {
    throw new Error(`Storey with ID ${perimeter.storeyId} not found for perimeter ${perimeterId}`)
  }

  const currentFloorAssembly = getFloorAssemblyById(storey.floorAssemblyId)
  if (!currentFloorAssembly) {
    throw new Error(`Floor assembly with ID ${storey.floorAssemblyId} not found for storey ${storey.id}`)
  }

  const nextStorey = getStoreyAbove(storey.id)
  const nextFloorAssembly = nextStorey ? getFloorAssemblyById(nextStorey.floorAssemblyId) : null

  const perimeterContext = computePerimeterConstructionContext(perimeter, [])
  const storeyContext = createWallStoreyContext(storey, currentFloorAssembly, nextFloorAssembly, [perimeterContext])

  const wallIds = includeColinear ? findColinearWalls(perimeter, wallId) : [wallId]

  const wallModels: ConstructionModel[] = []
  let cumulativeOffset = 0

  for (const currentWallId of wallIds) {
    const currentWall = perimeter.walls.find(w => w.id === currentWallId)
    if (!currentWall) {
      throw new Error(`Wall with ID ${currentWallId} not found in perimeter ${perimeterId}`)
    }

    const assembly = getWallAssemblyById(currentWall.wallAssemblyId)
    if (!assembly?.type) {
      throw new Error(`Wall assembly with ID ${currentWall.wallAssemblyId} not found for wall ${currentWallId}`)
    }

    const wallAssembly = WALL_ASSEMBLIES[assembly.type]
    if (!wallAssembly) {
      throw new Error(`Wall assembly type ${assembly.type} is not registered`)
    }

    const wallModel = wallAssembly.construct(currentWall, perimeter, storeyContext, assembly)

    if (cumulativeOffset > 0) {
      const transformedModel = transformModel(wallModel, fromTrans(newVec3(cumulativeOffset, 0, 0)))
      wallModels.push(transformedModel)
    } else {
      wallModels.push(wallModel)
    }

    cumulativeOffset += currentWall.insideLength
  }

  return wallModels.length === 1 ? wallModels[0] : mergeModels(...wallModels)
}
