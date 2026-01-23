import type { PerimeterWall, PerimeterWithGeometry } from '@/building/model'
import { type RingBeamAssemblyId, isOpeningId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { polygonEdges } from '@/construction/helpers'
import type { RawMeasurement } from '@/construction/measurements'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model'
import { resultsToModel } from '@/construction/results'
import { resolveRingBeamAssembly } from '@/construction/ringBeams'
import { constructRoof } from '@/construction/roofs'
import { type StoreyContext, createWallStoreyContext } from '@/construction/storeys/context'
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
  type Area,
  Bounds3D,
  IDENTITY,
  type Length,
  type Polygon2D,
  type Volume,
  calculatePolygonArea,
  calculatePolygonWithHolesArea,
  dirAngle,
  direction,
  fromTrans,
  newVec3,
  perpendicularCCW,
  perpendicularCW,
  polygonPerimeter,
  rotateZ,
  scaleAddVec2,
  subtractPolygons,
  unionPolygons
} from '@/shared/geometry'
import { assertUnreachable } from '@/shared/utils'

import {
  type PerimeterConstructionContext,
  applyWallFaceOffsets,
  computePerimeterConstructionContext,
  createWallFaceOffsets
} from './context'

export function constructPerimeter(
  perimeter: PerimeterWithGeometry,
  includeFloor = true,
  includeRoof = true
): ConstructionModel {
  const { getStoreyById, getFloorOpeningsByStorey, getPerimetersByStorey, getRoofsByStorey, getPerimeterWallById } =
    getModelActions()
  const storey = getStoreyById(perimeter.storeyId)
  if (!storey) {
    throw new Error('Invalid storey on perimeter')
  }

  const { getRingBeamAssemblyById, getWallAssemblyById } = getConfigActions()

  const perimeterContext = computePerimeterConstructionContext(perimeter, getFloorOpeningsByStorey(storey.id))
  const storeyContext = createWallStoreyContext(perimeter.storeyId, [perimeterContext])

  const allModels: ConstructionModel[] = []

  const walls = perimeter.wallIds.map(getPerimeterWallById)

  // Construct base ring beams
  const baseRingBeamSegments = groupConsecutiveWallsByRingBeam(walls, wall => wall.baseRingBeamAssemblyId)

  for (const segment of baseRingBeamSegments) {
    const assemblyConfig = getRingBeamAssemblyById(segment.assemblyId)
    if (!assemblyConfig) continue

    const assembly = resolveRingBeamAssembly(assemblyConfig)

    const ringBeam = Array.from(
      assembly.construct({ perimeter, startIndex: segment.startIndex, endIndex: segment.endIndex }, perimeterContext)
    )
    const transformedModel = transformModel(
      resultsToModel(ringBeam),
      fromTrans(newVec3(0, 0, storeyContext.wallBottom)),
      [TAG_BASE_PLATE]
    )
    allModels.push(transformedModel)
  }

  // Construct top ring beams
  const topRingBeamSegments = groupConsecutiveWallsByRingBeam(walls, wall => wall.topRingBeamAssemblyId)

  for (const segment of topRingBeamSegments) {
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
    const transformedModel = transformModel(
      resultsToModel(ringBeam),
      fromTrans(newVec3(0, 0, storeyContext.wallTop - assembly.height)),
      [TAG_TOP_PLATE]
    )
    allModels.push(transformedModel)
  }

  for (const wall of walls) {
    const assembly = getWallAssemblyById(wall.wallAssemblyId)
    let wallModel: ConstructionModel | null = null

    if (assembly?.type) {
      const wallAssembly = resolveWallAssembly(assembly)
      wallModel = wallAssembly.construct(wall, storeyContext)

      const segmentAngle = dirAngle(wall.insideLine.start, wall.insideLine.end)

      const nameKey = assembly.nameKey
      const nameTag = createTag(
        'wall-assembly',
        assembly.id,
        nameKey != null ? t => t(nameKey, { ns: 'config' }) : assembly.name
      )
      const transformedModel = transformModel(
        wallModel,
        rotateZ(
          fromTrans(newVec3(wall.insideLine.start[0], wall.insideLine.start[1], storeyContext.wallBottom)),
          segmentAngle
        ),
        [TAG_WALLS, wallAssembly.tag, nameTag],
        undefined,
        wall.id
      )
      allModels.push(transformedModel)
    }
  }

  allModels.push(createPerimeterMeasurementModel(perimeter, perimeterContext, storeyContext))

  if (includeFloor) {
    const floorModels = []

    const innerPolygons = [perimeterContext.innerFinishedPolygon]
    const floorModel = storeyContext.floorAssembly.construct(perimeterContext)
    floorModels.push(transformModel(floorModel, fromTrans(newVec3(0, 0, storeyContext.wallBottom))))

    const floorHoles = perimeterContext.floorOpenings
    const floorPolygons = subtractPolygons(innerPolygons, floorHoles)
    if (floorPolygons.length > 0) {
      const floorLayerResults = Array.from(storeyContext.floorAssembly.constructFloorLayers(floorPolygons))
      const floorLayersModel = resultsToModel(floorLayerResults)
      floorModels.push(transformModel(floorLayersModel, fromTrans(newVec3(0, 0, storeyContext.floorConstructionTop))))
    }

    allModels.push(
      transformModel(mergeModels(...floorModels), IDENTITY, [TAG_FLOOR, ...storeyContext.floorAssembly.tags])
    )

    if (storeyContext.nextStoreyId && storeyContext.ceilingAssembly) {
      let ceilingHoles: Polygon2D[] = []
      const rawOpenings = getFloorOpeningsByStorey(storeyContext.nextStoreyId)
      if (rawOpenings.length > 0) {
        const nextWallFaces = createWallFaceOffsets(getPerimetersByStorey(storeyContext.nextStoreyId))
        ceilingHoles = unionPolygons(rawOpenings.map(opening => applyWallFaceOffsets(opening.area, nextWallFaces)))
      }
      const ceilingPolygons = subtractPolygons(innerPolygons, ceilingHoles)
      if (ceilingPolygons.length > 0) {
        const ceilingLayerResults = Array.from(storeyContext.ceilingAssembly.constructCeilingLayers(ceilingPolygons))
        const ceilingLayerModel = resultsToModel(ceilingLayerResults)
        allModels.push(
          transformModel(ceilingLayerModel, fromTrans(newVec3(0, 0, storeyContext.finishedCeilingBottom)), [
            TAG_FLOOR,
            ...storeyContext.ceilingAssembly.tags
          ])
        )
      }
    }
  }

  if (includeRoof) {
    const roofs = getRoofsByStorey(perimeter.storeyId)
    const relevantRoofs = roofs.filter(r => r.referencePerimeter === perimeter.id)
    allModels.push(
      ...relevantRoofs.map(roof =>
        transformModel(constructRoof(roof, [perimeterContext]), fromTrans(newVec3(0, 0, storeyContext.roofBottom)))
      )
    )
  }

  return mergeModels(...allModels)
}

interface RingBeamSegment {
  assemblyId: RingBeamAssemblyId
  walls: PerimeterWall[]
  startIndex: number
  endIndex: number
}

function groupConsecutiveWallsByRingBeam(
  walls: PerimeterWall[],
  getRingBeamId: (wall: (typeof walls)[0]) => RingBeamAssemblyId | undefined
): RingBeamSegment[] {
  if (walls.length === 0) return []

  const segments: RingBeamSegment[] = []
  let currentAssemblyId = getRingBeamId(walls[0])
  let currentWalls: typeof walls = currentAssemblyId ? [walls[0]] : []
  let startIndex = 0

  for (let i = 1; i < walls.length; i++) {
    const assemblyId = getRingBeamId(walls[i])

    if (assemblyId === currentAssemblyId && assemblyId !== undefined) {
      // Continue current segment
      currentWalls.push(walls[i])
    } else {
      // Finish current segment if it has an assembly
      if (currentAssemblyId && currentWalls.length > 0) {
        segments.push({
          assemblyId: currentAssemblyId,
          walls: currentWalls,
          startIndex,
          endIndex: i - 1
        })
      }
      // Start new segment
      currentAssemblyId = assemblyId
      currentWalls = assemblyId ? [walls[i]] : []
      startIndex = i
    }
  }

  // Handle wrap-around for circular perimeter
  if (currentAssemblyId && currentWalls.length > 0) {
    const firstSegmentAssemblyId = getRingBeamId(walls[0])

    if (currentAssemblyId === firstSegmentAssemblyId && segments.length > 0 && segments[0].startIndex === 0) {
      // Merge with first segment (wrap around)
      segments[0].walls = [...currentWalls, ...segments[0].walls]
      segments[0].startIndex = startIndex
    } else {
      // Add as separate segment
      segments.push({
        assemblyId: currentAssemblyId,
        walls: currentWalls,
        startIndex,
        endIndex: walls.length - 1
      })
    }
  }

  return segments
}

export interface PerimeterStats {
  footprint: Area
  totalFloorArea: Area

  totalConstructionWallArea: Area
  totalFinishedWallArea: Area
  totalExteriorWallArea: Area
  totalWindowArea: Area
  totalDoorArea: Area

  totalVolume: Volume

  storeyHeight: Length
  ceilingHeight: Length
}

export function getPerimeterStats(perimeter: PerimeterWithGeometry): PerimeterStats {
  const { getFloorOpeningsByStorey, getPerimeterWallById, getWallOpeningById } = getModelActions()

  const storeyContext = createWallStoreyContext(perimeter.storeyId, [])
  const storeyConstructionHeight = storeyContext.wallTop - storeyContext.floorBottom
  const constructionHeight = storeyContext.ceilingConstructionBottom - storeyContext.floorConstructionTop
  const finishedHeight = storeyContext.finishedCeilingBottom - storeyContext.finishedFloorTop

  const footprint = calculatePolygonArea(perimeter.outerPolygon)
  const innerArea = calculatePolygonArea(perimeter.innerPolygon)
  const floorHoles = getFloorOpeningsByStorey(perimeter.storeyId).map(a => a.area)
  const floorPolygons = subtractPolygons([perimeter.innerPolygon], floorHoles)
  const totalFloorArea = floorPolygons.map(calculatePolygonWithHolesArea).reduce((a, b) => a + b, 0)

  let totalConstructionLength = 0
  const totalInsideLength = polygonPerimeter(perimeter.innerPolygon)
  const totalOutsideLength = polygonPerimeter(perimeter.outerPolygon)
  let totalOpeningArea = 0
  let totalWindowArea = 0
  let totalDoorArea = 0

  for (const wallId of perimeter.wallIds) {
    const wall = getPerimeterWallById(wallId)
    totalConstructionLength += wall.wallLength

    for (const entityId of wall.entityIds) {
      if (!isOpeningId(entityId)) continue
      const opening = getWallOpeningById(entityId)
      const openingArea = opening.width * opening.height
      totalOpeningArea += openingArea
      switch (opening.openingType) {
        case 'window':
          totalWindowArea += openingArea
          break
        case 'door':
        case 'passage':
          totalDoorArea += openingArea
          break
        default:
          assertUnreachable(opening.openingType, 'Invalid opening type')
      }
    }
  }

  const totalConstructionWallArea = Math.max(totalConstructionLength * constructionHeight - totalOpeningArea, 0)
  const totalFinishedWallArea = Math.max(totalInsideLength * finishedHeight - totalOpeningArea, 0)
  const totalExteriorWallArea = Math.max(totalOutsideLength * storeyConstructionHeight - totalOpeningArea, 0)

  const totalVolume = innerArea * finishedHeight

  return {
    footprint,
    totalFloorArea,
    totalConstructionWallArea,
    totalFinishedWallArea,
    totalExteriorWallArea,
    totalWindowArea,
    totalDoorArea,
    totalVolume,
    storeyHeight: storeyContext.storeyHeight,
    ceilingHeight: finishedHeight
  }
}

function createPerimeterMeasurementModel(
  perimeter: PerimeterWithGeometry,
  floorContext: PerimeterConstructionContext,
  storeyContext: StoreyContext
): ConstructionModel {
  const { getPerimeterWallById, getPerimeterCornerById } = getModelActions()
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

  for (const edge of polygonEdges(floorContext.innerPolygon)) {
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

  for (const edge of polygonEdges(floorContext.outerPolygon)) {
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
    measurements,
    areas: [],
    bounds: Bounds3D.EMPTY,
    elements: [],
    errors: [],
    warnings: []
  }
}
