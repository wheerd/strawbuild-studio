import type { PerimeterWithGeometry } from '@/building/model'
import type { PerimeterId, PerimeterWallId, RingBeamAssemblyId, RoofId, StoreyId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { getPerimeterContextCached } from '@/construction/derived/perimeterContextCache'
import { polygonEdges } from '@/construction/helpers'
import type { RawMeasurement } from '@/construction/measurements'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model'
import { resultsToModel } from '@/construction/results'
import { resolveRingBeamAssembly } from '@/construction/ringBeams'
import { constructRoof } from '@/construction/roofs'
import { getWallStoreyContextCached } from '@/construction/storeys/context'
import {
  TAG_BASE_PLATE,
  TAG_FLOOR,
  TAG_TOP_PLATE,
  TAG_WALLS,
  TAG_WALL_CONSTRUCTION_LENGTH_INSIDE,
  TAG_WALL_CONSTRUCTION_LENGTH_OUTSIDE,
  TAG_WALL_LENGTH_INSIDE,
  TAG_WALL_LENGTH_OUTSIDE,
  createTag
} from '@/construction/tags'
import { resolveWallAssembly } from '@/construction/walls'
import {
  Bounds3D,
  IDENTITY,
  dirAngle,
  direction,
  fromTrans,
  intersectPolygons,
  newVec3,
  perpendicularCCW,
  perpendicularCW,
  rotateZ,
  scaleAddVec2,
  subtractPolygons,
  unionPolygons
} from '@/shared/geometry'

import { BUILDING_ID, type CompositeModel, type CoreModel, type ModelId } from './types'
import { createBasePlateId, createFloorId, createMeasurementId, createTopPlateId } from './utils'

export interface ColinearWallGroup {
  wallIds: PerimeterWallId[]
  startIndex: number
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
      wallIds: colinearIds,
      startIndex: i
    })
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
  if (!assembly?.type) {
    throw new Error(`Wall assembly with ID ${wall.wallAssemblyId} not found for wall ${wall.id}`)
  }

  const wallAssembly = resolveWallAssembly(assembly)
  const wallModel = wallAssembly.construct(wall, storeyContext)

  const nameKey = assembly.nameKey
  const nameTag = createTag(
    'wall-assembly',
    assembly.id,
    nameKey != null ? t => t(nameKey, { ns: 'config' }) : assembly.name
  )

  // TODO: Move this into the wall assembly
  return {
    model: transformModel(wallModel, IDENTITY, [TAG_WALLS, wallAssembly.tag, nameTag], undefined, wall.id),
    sourceId: wall.id
  }
}

export function buildColinearWallComposite(group: ColinearWallGroup): CompositeModel {
  const { getPerimeterWallById } = getModelActions()
  const models: { id: ModelId; transform: ReturnType<typeof fromTrans> }[] = []
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
  models.push(transformModel(floorModel, fromTrans(newVec3(0, 0, storeyContext.wallBottom))))

  const floorHoles = perimeterContext.floorOpenings
  const floorPolygons = subtractPolygons([perimeterContext.innerFinishedPolygon], floorHoles)

  if (floorPolygons.length > 0) {
    const floorLayerResults = storeyContext.floorAssembly.constructFloorLayers(floorPolygons)
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
      const ceilingLayerResults = storeyContext.floorAssembly.constructCeilingLayers(finalCeilingPolygons)
      const ceilingLayerModel = resultsToModel(Array.from(ceilingLayerResults))
      models.push(transformModel(ceilingLayerModel, fromTrans(newVec3(0, 0, storeyContext.finishedFloorBottom))))
    }
  }

  return {
    model: mergeModels(...models),
    tags: [TAG_FLOOR, ...storeyContext.floorAssembly.tags]
  }
}

export function buildBaseRingBeamCoreModel(perimeterId: PerimeterId): CoreModel {
  const { getPerimeterById, getPerimeterWallById } = getModelActions()
  const { getRingBeamAssemblyById } = getConfigActions()

  const perimeter = getPerimeterById(perimeterId)
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)
  const perimeterContext = getPerimeterContextCached(perimeterId)

  const walls = perimeter.wallIds.map(getPerimeterWallById)

  const basePlateModels: ConstructionModel[] = []

  const baseSegments = groupConsecutiveWallsByRingBeam(walls.map(w => w.baseRingBeamAssemblyId))
  for (const segment of baseSegments) {
    const assemblyConfig = getRingBeamAssemblyById(segment.assemblyId)
    if (!assemblyConfig) continue

    const assembly = resolveRingBeamAssembly(assemblyConfig)
    const ringBeam = Array.from(
      assembly.construct({ perimeter, startIndex: segment.startIndex, endIndex: segment.endIndex }, perimeterContext)
    )
    const model = transformModel(resultsToModel(ringBeam), fromTrans(newVec3(0, 0, storeyContext.wallBottom)), [
      TAG_BASE_PLATE
    ])
    basePlateModels.push(model)
  }

  return {
    model: basePlateModels.length > 0 ? mergeModels(...basePlateModels) : createEmptyModel(),
    tags: [TAG_BASE_PLATE],
    sourceId: createBasePlateId(perimeterId)
  }
}

export function buildTopRingBeamCoreModel(perimeterId: PerimeterId): CoreModel {
  const { getPerimeterById, getPerimeterWallById } = getModelActions()
  const { getRingBeamAssemblyById } = getConfigActions()

  const perimeter = getPerimeterById(perimeterId)
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)
  const perimeterContext = getPerimeterContextCached(perimeterId)

  const walls = perimeter.wallIds.map(getPerimeterWallById)

  const topPlateModels: ConstructionModel[] = []

  const topSegments = groupConsecutiveWallsByRingBeam(walls.map(w => w.topRingBeamAssemblyId))
  for (const segment of topSegments) {
    const assemblyConfig = getRingBeamAssemblyById(segment.assemblyId)
    if (!assemblyConfig) continue

    const assembly = resolveRingBeamAssembly(assemblyConfig)
    const ringBeam = Array.from(
      assembly.construct(
        { perimeter, startIndex: segment.startIndex, endIndex: segment.endIndex },
        perimeterContext,
        storeyContext
      )
    )
    const model = transformModel(
      resultsToModel(ringBeam),
      fromTrans(newVec3(0, 0, storeyContext.wallTop - assembly.height)),
      [TAG_TOP_PLATE]
    )
    topPlateModels.push(model)
  }

  return {
    model: topPlateModels.length > 0 ? mergeModels(...topPlateModels) : createEmptyModel(),
    tags: [TAG_TOP_PLATE],
    sourceId: createTopPlateId(perimeterId)
  }
}

interface RingBeamSegment {
  assemblyId: RingBeamAssemblyId
  startIndex: number
  endIndex: number
}

function groupConsecutiveWallsByRingBeam(assemblies: (RingBeamAssemblyId | undefined)[]): RingBeamSegment[] {
  if (assemblies.length === 0) return []

  const segments: RingBeamSegment[] = []
  let currentAssemblyId = assemblies[0]
  let startIndex = currentAssemblyId ? 0 : -1

  for (let i = 1; i <= assemblies.length; i++) {
    const assemblyId = i < assemblies.length ? assemblies[i] : undefined

    if (assemblyId !== currentAssemblyId) {
      if (currentAssemblyId && startIndex >= 0) {
        segments.push({
          assemblyId: currentAssemblyId,
          startIndex,
          endIndex: i - 1
        })
      }
      currentAssemblyId = assemblyId
      startIndex = assemblyId ? i : -1
    }
  }

  // Handle wrap-around for circular perimeter
  if (segments.length > 1) {
    const firstSegment = segments[0]
    const lastSegment = segments[segments.length - 1]
    if (
      firstSegment.startIndex === 0 &&
      lastSegment.endIndex === assemblies.length - 1 &&
      firstSegment.assemblyId === lastSegment.assemblyId
    ) {
      // Merge first and last segment (wrap around)
      segments[0].startIndex = lastSegment.startIndex
      segments.pop()
    }
  }

  return segments
}

export function buildRoofCoreModel(roofId: RoofId): CoreModel {
  const { getRoofById } = getModelActions()
  const roof = getRoofById(roofId)
  if (!roof) {
    return {
      model: createEmptyModel(),
      tags: [],
      sourceId: roofId
    }
  }

  const model = constructRoof(roof)

  return {
    model,
    tags: [],
    sourceId: roofId
  }
}

export function buildPerimeterComposite(perimeter: PerimeterWithGeometry): CompositeModel {
  const { getPerimeterWallById } = getModelActions()
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)

  const childModels: { id: ModelId; transform: ReturnType<typeof fromTrans> }[] = []

  for (const wallId of perimeter.wallIds) {
    const wall = getPerimeterWallById(wallId)
    const segmentAngle = dirAngle(wall.insideLine.start, wall.insideLine.end)
    const transform = rotateZ(
      fromTrans(newVec3(wall.insideLine.start[0], wall.insideLine.start[1], storeyContext.wallBottom)),
      segmentAngle
    )

    childModels.push({
      id: wallId,
      transform
    })
  }

  childModels.push({ id: createFloorId(perimeter.id), transform: IDENTITY })
  childModels.push({ id: createBasePlateId(perimeter.id), transform: IDENTITY })
  childModels.push({ id: createTopPlateId(perimeter.id), transform: IDENTITY })
  childModels.push({ id: createMeasurementId(perimeter.id), transform: IDENTITY })

  return {
    models: childModels,
    sourceId: perimeter.id
  }
}

export function buildPerimeterMeasurementsModel(perimeter: PerimeterWithGeometry): CoreModel {
  const { getPerimeterWallById, getPerimeterCornerById } = getModelActions()
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)
  const perimeterContext = getPerimeterContextCached(perimeter.id)
  const measurements: RawMeasurement[] = []

  for (const wallId of perimeter.wallIds) {
    const wall = getPerimeterWallById(wallId)
    const corner = getPerimeterCornerById(wall.startCornerId)
    const nextCorner = getPerimeterCornerById(wall.endCornerId)

    const insideStart = newVec3(corner.insidePoint[0], corner.insidePoint[1], storeyContext.finishedFloorTop)
    const insideEnd = newVec3(nextCorner.insidePoint[0], nextCorner.insidePoint[1], storeyContext.finishedFloorTop)

    const insideExtend1In2D = scaleAddVec2(corner.insidePoint, wall.outsideDirection, wall.thickness)
    const insideExtend1 = newVec3(insideExtend1In2D[0], insideExtend1In2D[1], storeyContext.finishedFloorTop)
    const insideExtend2 = newVec3(corner.insidePoint[0], corner.insidePoint[1], storeyContext.finishedCeilingBottom)

    measurements.push({
      startPoint: insideStart,
      endPoint: insideEnd,
      extend1: insideExtend1,
      extend2: insideExtend2,
      tags: [TAG_WALL_LENGTH_INSIDE]
    })

    const outsideStart = newVec3(corner.outsidePoint[0], corner.outsidePoint[1], storeyContext.floorBottom)
    const outsideEnd = newVec3(nextCorner.outsidePoint[0], nextCorner.outsidePoint[1], storeyContext.floorBottom)

    const outsideExtend1In2D = scaleAddVec2(corner.outsidePoint, wall.outsideDirection, -wall.thickness)
    const outsideExtend1 = newVec3(outsideExtend1In2D[0], outsideExtend1In2D[1], storeyContext.floorBottom)
    const outsideExtend2 = newVec3(corner.outsidePoint[0], corner.outsidePoint[1], storeyContext.wallTop)

    measurements.push({
      startPoint: outsideStart,
      endPoint: outsideEnd,
      extend1: outsideExtend1,
      extend2: outsideExtend2,
      tags: [TAG_WALL_LENGTH_OUTSIDE]
    })
  }

  for (const edge of polygonEdges(perimeterContext.innerPolygon)) {
    const outDirection = perpendicularCCW(direction(edge.start, edge.end))
    const extend1In2D = scaleAddVec2(edge.start, outDirection, 10)
    const extend1 = newVec3(extend1In2D[0], extend1In2D[1], storeyContext.wallBottom)
    const extend2 = newVec3(edge.start[0], edge.start[1], storeyContext.wallTop)

    measurements.push({
      startPoint: newVec3(edge.start[0], edge.start[1], storeyContext.wallBottom),
      endPoint: newVec3(edge.end[0], edge.end[1], storeyContext.wallBottom),
      extend1,
      extend2,
      tags: [TAG_WALL_CONSTRUCTION_LENGTH_INSIDE]
    })
  }

  for (const edge of polygonEdges(perimeterContext.outerPolygon)) {
    const inDirection = perpendicularCW(direction(edge.start, edge.end))
    const extend1In2D = scaleAddVec2(edge.start, inDirection, 10)
    const extend1 = newVec3(extend1In2D[0], extend1In2D[1], storeyContext.wallBottom)
    const extend2 = newVec3(edge.start[0], edge.start[1], storeyContext.wallTop)
    measurements.push({
      startPoint: newVec3(edge.start[0], edge.start[1], storeyContext.wallBottom),
      endPoint: newVec3(edge.end[0], edge.end[1], storeyContext.wallBottom),
      extend1,
      extend2,
      tags: [TAG_WALL_CONSTRUCTION_LENGTH_OUTSIDE]
    })
  }

  return {
    model: {
      measurements,
      areas: [],
      bounds: Bounds3D.EMPTY,
      elements: [],
      errors: [],
      warnings: []
    },
    sourceId: createMeasurementId(perimeter.id)
  }
}

export function buildFullPerimeterComposite(perimeterId: PerimeterId): CompositeModel {
  const { getRoofsByStorey, getPerimeterById } = getModelActions()
  const perimeter = getPerimeterById(perimeterId)
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)

  const childModels: { id: ModelId; transform: ReturnType<typeof fromTrans> }[] = [
    { id: perimeterId, transform: IDENTITY }
  ]

  const roofs = getRoofsByStorey(perimeter.storeyId)
  for (const roof of roofs) {
    if (roof.referencePerimeter === perimeterId) {
      childModels.push({
        id: roof.id,
        transform: fromTrans(newVec3(0, 0, storeyContext.roofBottom))
      })
    }
  }

  return {
    models: childModels
  }
}

export function buildStoreyComposite(storeyId: StoreyId): CompositeModel {
  const { getPerimetersByStorey, getRoofsByStorey } = getModelActions()
  const storeyContext = getWallStoreyContextCached(storeyId)

  const childModels: { id: ModelId; transform: ReturnType<typeof fromTrans> }[] = []

  const perimeters = getPerimetersByStorey(storeyId)
  for (const perimeter of perimeters) {
    childModels.push({
      id: perimeter.id,
      transform: IDENTITY
    })
  }

  const roofs = getRoofsByStorey(storeyId)
  for (const roof of roofs) {
    childModels.push({
      id: roof.id,
      transform: fromTrans(newVec3(0, 0, storeyContext.roofBottom))
    })
  }

  return {
    models: childModels,
    sourceId: storeyId
  }
}

export function buildBuildingComposite(): CompositeModel {
  const { getStoreysOrderedByLevel } = getModelActions()
  const storeys = getStoreysOrderedByLevel()

  const childModels: { id: ModelId; transform: ReturnType<typeof fromTrans> }[] = []
  let currentElevation = 0

  for (const storey of storeys) {
    childModels.push({
      id: storey.id,
      transform: fromTrans(newVec3(0, 0, currentElevation))
    })
    currentElevation += storey.floorHeight
  }

  return {
    models: childModels,
    sourceId: BUILDING_ID
  }
}

function createEmptyModel(): ConstructionModel {
  return {
    elements: [],
    measurements: [],
    areas: [],
    errors: [],
    warnings: [],
    bounds: Bounds3D.EMPTY
  }
}
