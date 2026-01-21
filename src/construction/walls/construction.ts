import type { PerimeterWallWithGeometry } from '@/building/model'
import type { PerimeterCornerId, PerimeterWallId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model'
import { computePerimeterConstructionContext } from '@/construction/perimeters/context'
import { createWallStoreyContext } from '@/construction/storeys/context'
import { TAG_WALLS, createTag } from '@/construction/tags'
import { type Length, type LineSegment2D, fromTrans, newVec3 } from '@/shared/geometry'

import { resolveWallAssembly } from './index'

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

function findColinearWalls(startWall: PerimeterWallWithGeometry): PerimeterWallWithGeometry[] {
  const { getPerimeterWallById, getPerimeterCornerById } = getModelActions()
  const colinearWalls: PerimeterWallWithGeometry[] = [startWall]

  let currentWall = startWall
  while (true) {
    const corner = getPerimeterCornerById(currentWall.startCornerId)
    if (corner.interiorAngle !== 180) break

    currentWall = getPerimeterWallById(corner.previousWallId)
    if (currentWall.id === startWall.id) break

    colinearWalls.unshift(currentWall)
  }

  currentWall = startWall
  while (true) {
    const corner = getPerimeterCornerById(currentWall.endCornerId)
    if (corner.interiorAngle !== 180) break

    currentWall = getPerimeterWallById(corner.nextWallId)
    if (currentWall.id === startWall.id) break

    colinearWalls.push(currentWall)
  }

  return colinearWalls
}

export function constructWall(wallId: PerimeterWallId, includeColinear = false): ConstructionModel {
  const { getPerimeterById, getPerimeterWallById } = getModelActions()
  const { getWallAssemblyById } = getConfigActions()

  const wall = getPerimeterWallById(wallId)
  const perimeter = getPerimeterById(wall.perimeterId)
  const walls = includeColinear ? findColinearWalls(wall) : [wall]

  const perimeterContext = computePerimeterConstructionContext(perimeter, [])
  const storeyContext = createWallStoreyContext(perimeter.storeyId, [perimeterContext])

  const wallModels: ConstructionModel[] = []
  let cumulativeOffset = 0

  for (const currentWall of walls) {
    const assembly = getWallAssemblyById(currentWall.wallAssemblyId)
    if (!assembly?.type) {
      throw new Error(`Wall assembly with ID ${currentWall.wallAssemblyId} not found for wall ${currentWall.id}`)
    }

    const wallAssembly = resolveWallAssembly(assembly)
    const wallModel = wallAssembly.construct(currentWall, storeyContext)

    if (cumulativeOffset > 0) {
      const nameKey = assembly.nameKey
      const nameTag = createTag(
        'wall-assembly',
        assembly.id,
        nameKey != null ? t => t(nameKey, { ns: 'config' }) : assembly.name
      )
      const transformedModel = transformModel(
        wallModel,
        fromTrans(newVec3(cumulativeOffset, 0, 0)),
        [TAG_WALLS, wallAssembly.tag, nameTag],
        undefined,
        currentWall.id
      )
      wallModels.push(transformedModel)
    } else {
      wallModels.push(wallModel)
    }

    cumulativeOffset += currentWall.insideLength
  }

  return wallModels.length === 1 ? wallModels[0] : mergeModels(...wallModels)
}
