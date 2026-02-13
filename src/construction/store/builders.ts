import type { PerimeterWithGeometry } from '@/building/model'
import type { PerimeterId, PerimeterWallId, RoofId, StoreyId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { getPerimeterContextCached } from '@/construction/derived/perimeterContextCache'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model'
import { assignDeterministicIdsToModel, resultsToModel } from '@/construction/results'
import { constructRoof } from '@/construction/roofs'
import { getWallStoreyContextCached } from '@/construction/storeys/context'
import { TAG_FLOOR, TAG_WALLS, createTag } from '@/construction/tags'
import { resolveWallAssembly } from '@/construction/walls'
import {
  IDENTITY,
  dirAngle,
  fromTrans,
  intersectPolygons,
  newVec3,
  rotateZ,
  subtractPolygons,
  unionPolygons
} from '@/shared/geometry'

import { BUILDING_ID, type CompositeModel, type CoreModel, type ModelWithTransform } from './types'
import { createBasePlateId, createFloorId, createPerimeterMeasurementsId, createTopPlateId } from './utils'

interface ColinearWallGroup {
  wallIds: PerimeterWallId[]
}

export function findColinearWallGroups(perimeter: PerimeterWithGeometry): ColinearWallGroup[] {
  const { getPerimeterWallById, getPerimeterCornerById } = getModelActions()
  const walls = perimeter.wallIds.map(getPerimeterWallById)
  const groups: ColinearWallGroup[] = []
  const processed = new Set<PerimeterWallId>()

  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i]
    if (processed.has(wall.id)) continue

    const colinearIds: PerimeterWallId[] = [wall.id]
    let currentIndex = i

    while (true) {
      const currentWall = walls[currentIndex]
      const corner = getPerimeterCornerById(currentWall.endCornerId)
      if (corner.interiorAngle !== 180) break

      const nextIndex = (currentIndex + 1) % walls.length
      const nextWall = walls[nextIndex]
      if (processed.has(nextWall.id)) break

      colinearIds.push(nextWall.id)
      processed.add(nextWall.id)
      currentIndex = nextIndex
    }

    processed.add(wall.id)
    groups.push({
      wallIds: colinearIds
    })
  }

  // Handle wrap-around for circular perimeter
  if (groups.length > 1) {
    const firstCorner = getPerimeterCornerById(walls[0].startCornerId)
    if (firstCorner.interiorAngle === 180) {
      // Merge first and last group (wrap around)
      groups[0].wallIds = [...groups[groups.length - 1].wallIds, ...groups[groups.length - 1].wallIds]
      groups.pop()
    }
  }

  return groups
}

export function buildWallCoreModel(wallId: PerimeterWallId): CoreModel {
  const { getPerimeterWallById, getPerimeterById } = getModelActions()
  const { getWallAssemblyById } = getConfigActions()

  const wall = getPerimeterWallById(wallId)
  const perimeter = getPerimeterById(wall.perimeterId)
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)

  const assembly = getWallAssemblyById(wall.wallAssemblyId)
  if (!assembly) {
    throw new Error(`Wall assembly with ID ${wall.wallAssemblyId} not found for wall ${wall.id}`)
  }

  const wallAssembly = resolveWallAssembly(assembly)
  const wallModel = wallAssembly.construct(wall, storeyContext)

  // TODO: Move this into the wall assembly
  const nameKey = assembly.nameKey
  const nameTag = createTag(
    'wall-assembly',
    assembly.id,
    nameKey != null ? t => t(nameKey, { ns: 'config' }) : assembly.name
  )

  return {
    model: wallModel,
    tags: [TAG_WALLS, wallAssembly.tag, nameTag],
    sourceId: wall.id
  }
}

export function buildColinearWallComposite(group: ColinearWallGroup): CompositeModel {
  const { getPerimeterWallById } = getModelActions()
  const models: ModelWithTransform[] = []
  let cumulativeOffset = 0

  for (const wallId of group.wallIds) {
    const wall = getPerimeterWallById(wallId)
    const transform = cumulativeOffset > 0 ? fromTrans(newVec3(cumulativeOffset, 0, 0)) : IDENTITY

    models.push({
      id: wallId,
      transform
    })

    cumulativeOffset += wall.wallLength
  }

  return { models }
}

export function buildFloorCoreModel(perimeterId: PerimeterId): CoreModel {
  const { getPerimeterById, getStoreyBelow, getPerimetersByStorey } = getModelActions()
  const perimeter = getPerimeterById(perimeterId)
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)
  const perimeterContext = getPerimeterContextCached(perimeterId)

  const models: ConstructionModel[] = []

  const floorModel = storeyContext.floorAssembly.construct(perimeterContext)
  assignDeterministicIdsToModel(floorModel, `${perimeterId}_floor`)
  models.push(transformModel(floorModel, fromTrans(newVec3(0, 0, storeyContext.wallBottom))))

  const floorHoles = perimeterContext.floorOpenings
  const floorPolygons = subtractPolygons([perimeterContext.innerFinishedPolygon], floorHoles)

  if (floorPolygons.length > 0) {
    const floorLayerResults = storeyContext.floorAssembly.constructFloorLayers(
      floorPolygons,
      `${perimeterId}_floor_top`
    )
    const floorLayersModel = resultsToModel(Array.from(floorLayerResults))
    models.push(transformModel(floorLayersModel, fromTrans(newVec3(0, 0, storeyContext.floorConstructionTop))))
  }

  const storeyBelow = getStoreyBelow(perimeter.storeyId)
  if (storeyBelow) {
    const belowPerimeters = getPerimetersByStorey(storeyBelow.id)
    const belowInnerPolygons = belowPerimeters.map(p => {
      const ctx = getPerimeterContextCached(p.id)
      return ctx.innerFinishedPolygon
    })
    const belowInnerUnion = unionPolygons(belowInnerPolygons)

    const ceilingPolygons = intersectPolygons([perimeterContext.outerFinishedPolygon], belowInnerUnion)
    const finalCeilingPolygons = subtractPolygons(ceilingPolygons, floorHoles)

    if (finalCeilingPolygons.length > 0) {
      const ceilingLayerResults = storeyContext.floorAssembly.constructCeilingLayers(
        finalCeilingPolygons,
        `${perimeterId}_floor_bottom`
      )
      const ceilingLayerModel = resultsToModel(Array.from(ceilingLayerResults))
      models.push(transformModel(ceilingLayerModel, fromTrans(newVec3(0, 0, storeyContext.finishedFloorBottom))))
    }
  }

  return {
    model: mergeModels(...models),
    tags: [TAG_FLOOR, ...storeyContext.floorAssembly.tags]
  }
}

export function buildRoofCoreModel(roofId: RoofId): CoreModel {
  const roof = getModelActions().getRoofById(roofId)
  if (!roof) {
    throw new Error(`Roof with id ${roofId} not found`)
  }

  return {
    model: constructRoof(roof),
    sourceId: roofId
  }
}

export function buildPerimeterComposite(perimeter: PerimeterWithGeometry): CompositeModel {
  const { getPerimeterWallsById } = getModelActions()
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)

  const wallModels = getPerimeterWallsById(perimeter.id).map(wall => {
    const segmentAngle = dirAngle(wall.insideLine.start, wall.insideLine.end)
    const transform = rotateZ(
      fromTrans(newVec3(wall.insideLine.start[0], wall.insideLine.start[1], storeyContext.wallBottom)),
      segmentAngle
    )

    return {
      id: wall.id,
      transform
    }
  })

  return {
    models: [
      ...wallModels,
      { id: createFloorId(perimeter.id), transform: IDENTITY },
      { id: createBasePlateId(perimeter.id), transform: IDENTITY },
      { id: createTopPlateId(perimeter.id), transform: IDENTITY },
      { id: createPerimeterMeasurementsId(perimeter.id), transform: IDENTITY }
    ],
    sourceId: perimeter.id
  }
}

export function buildFullPerimeterComposite(perimeterId: PerimeterId): CompositeModel {
  const { getRoofsByStorey, getPerimeterById } = getModelActions()
  const perimeter = getPerimeterById(perimeterId)
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)

  const perimeterModel = { id: perimeterId, transform: IDENTITY }
  const roofModels = getRoofsByStorey(perimeter.storeyId)
    .filter(r => r.referencePerimeter === perimeterId)
    .map(roof => ({
      id: roof.id,
      transform: fromTrans(newVec3(0, 0, storeyContext.roofBottom))
    }))

  return {
    models: [perimeterModel, ...roofModels]
  }
}

export function buildStoreyComposite(storeyId: StoreyId): CompositeModel {
  const { getPerimetersByStorey, getRoofsByStorey } = getModelActions()
  const storeyContext = getWallStoreyContextCached(storeyId)
  return {
    models: [
      ...getPerimetersByStorey(storeyId).map(perimeter => ({
        id: perimeter.id,
        transform: IDENTITY
      })),
      ...getRoofsByStorey(storeyId).map(roof => ({
        id: roof.id,
        transform: fromTrans(newVec3(0, 0, storeyContext.roofBottom))
      }))
    ],
    sourceId: storeyId
  }
}

export function buildBuildingComposite(): CompositeModel {
  const { getStoreysOrderedByLevel } = getModelActions()
  const storeys = getStoreysOrderedByLevel()

  const storeyModels: ModelWithTransform[] = []
  let currentElevation = 0

  for (const storey of storeys) {
    storeyModels.push({
      id: storey.id,
      transform: fromTrans(newVec3(0, 0, currentElevation))
    })
    currentElevation += storey.floorHeight
  }

  return {
    models: storeyModels,
    sourceId: BUILDING_ID
  }
}
