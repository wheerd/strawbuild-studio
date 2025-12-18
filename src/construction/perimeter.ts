import { mat4, vec2, vec3 } from 'gl-matrix'

import type { Perimeter } from '@/building/model'
import { getModelActions } from '@/building/store'
import {
  type Area,
  Bounds3D,
  type Length,
  type Polygon2D,
  type Volume,
  angle,
  arePolygonsIntersecting,
  calculatePolygonArea,
  calculatePolygonWithHolesArea,
  direction,
  perpendicularCCW,
  perpendicularCW,
  polygonPerimeter,
  subtractPolygons,
  unionPolygons
} from '@/shared/geometry'

import { getConfigActions } from './config'
import {
  type PerimeterConstructionContext,
  applyWallFaceOffsets,
  computePerimeterConstructionContext,
  createWallFaceOffsets
} from './context'
import { FLOOR_ASSEMBLIES, constructFloorLayerModel } from './floors'
import { IDENTITY, translate } from './geometry'
import { polygonEdges } from './helpers'
import type { RawMeasurement } from './measurements'
import { type ConstructionModel, mergeModels, transformModel } from './model'
import { RING_BEAM_ASSEMBLIES } from './ringBeams'
import { constructRoof } from './roof'
import './storey'
import {
  TAG_BASE_PLATE,
  TAG_TOP_PLATE,
  TAG_WALLS,
  TAG_WALL_CONSTRUCTION_LENGTH_INSIDE,
  TAG_WALL_CONSTRUCTION_LENGTH_OUTSIDE,
  TAG_WALL_LENGTH_INSIDE,
  TAG_WALL_LENGTH_OUTSIDE
} from './tags'
import { WALL_ASSEMBLIES, type WallStoreyContext, createWallStoreyContext } from './walls'

export function constructPerimeter(perimeter: Perimeter, includeFloor = true, includeRoof = true): ConstructionModel {
  const { getStoreyById, getStoreyAbove, getFloorOpeningsByStorey, getPerimetersByStorey, getRoofsByStorey } =
    getModelActions()
  const storey = getStoreyById(perimeter.storeyId)
  if (!storey) {
    throw new Error('Invalid storey on perimeter')
  }

  const { getRingBeamAssemblyById, getWallAssemblyById, getFloorAssemblyById } = getConfigActions()

  const currentFloorAssembly = getFloorAssemblyById(storey.floorAssemblyId)
  if (!currentFloorAssembly) {
    throw new Error(`Floor assembly ${storey.floorAssemblyId} not found for storey ${storey.id}`)
  }

  const nextStorey = getStoreyAbove(storey.id)

  const nextFloorAssembly = nextStorey ? getFloorAssemblyById(nextStorey.floorAssemblyId) : null

  const perimeterContext = computePerimeterConstructionContext(perimeter, getFloorOpeningsByStorey(storey.id))
  const storeyContext = createWallStoreyContext(storey, currentFloorAssembly, nextFloorAssembly, [perimeterContext])
  const constructionHeight =
    storeyContext.ceilingHeight + storeyContext.floorTopOffset + storeyContext.ceilingBottomOffset

  const allModels: ConstructionModel[] = []
  if (perimeter.baseRingBeamAssemblyId) {
    const assembly = getRingBeamAssemblyById(perimeter.baseRingBeamAssemblyId)
    if (assembly) {
      const ringBeam = RING_BEAM_ASSEMBLIES[assembly.type].construct(perimeter, assembly)
      const transformedModel = transformModel(ringBeam, IDENTITY, [TAG_BASE_PLATE])
      allModels.push(transformedModel)
    }
  }
  if (perimeter.topRingBeamAssemblyId) {
    const assembly = getRingBeamAssemblyById(perimeter.topRingBeamAssemblyId)
    if (assembly) {
      const ringBeam = RING_BEAM_ASSEMBLIES[assembly.type].construct(perimeter, assembly)
      const transformedModel = transformModel(
        ringBeam,
        translate(vec3.fromValues(0, 0, constructionHeight - assembly.height)),
        [TAG_TOP_PLATE]
      )
      allModels.push(transformedModel)
    }
  }

  for (const wall of perimeter.walls) {
    const assembly = getWallAssemblyById(wall.wallAssemblyId)
    let wallModel: ConstructionModel | null = null

    if (assembly?.type) {
      const wallAssembly = WALL_ASSEMBLIES[assembly.type]
      wallModel = wallAssembly.construct(wall, perimeter, storeyContext, assembly)
    }

    if (wallModel) {
      const segmentAngle = angle(wall.insideLine.start, wall.insideLine.end)
      const transformedModel = transformModel(
        wallModel,
        mat4.rotateZ(
          mat4.create(),
          translate(vec3.fromValues(wall.insideLine.start[0], wall.insideLine.start[1], 0)),
          segmentAngle
        ),
        [TAG_WALLS]
      )
      allModels.push(transformedModel)
    }
  }

  allModels.push(createPerimeterMeasurementModel(perimeter, perimeterContext, storeyContext))

  if (includeFloor) {
    const finishedFloorPolygon: Polygon2D = {
      points: perimeter.corners.map(corner => vec2.fromValues(corner.insidePoint[0], corner.insidePoint[1]))
    }
    const floorAssembly = FLOOR_ASSEMBLIES[currentFloorAssembly.type]
    const floorModel = floorAssembly.construct(perimeterContext, currentFloorAssembly)
    allModels.push(floorModel)

    const topHoles = perimeterContext.floorOpenings

    let ceilingHoles: Polygon2D[] = []
    if (nextStorey && nextFloorAssembly) {
      const nextPerimeters = getPerimetersByStorey(nextStorey.id)
      if (nextPerimeters.length > 0) {
        const nextWallFaces = createWallFaceOffsets(nextPerimeters)
        const nextFloorPolygon: Polygon2D = {
          points: finishedFloorPolygon.points.map(point => vec2.fromValues(point[0], point[1]))
        }
        const nextHolesRaw = getFloorOpeningsByStorey(nextStorey.id).map(opening => opening.area)
        const nextRelevantHoles = nextHolesRaw.filter(hole => arePolygonsIntersecting(nextFloorPolygon, hole))
        const nextAdjustedHoles = nextRelevantHoles.map(hole => applyWallFaceOffsets(hole, nextWallFaces))
        ceilingHoles = unionPolygons(nextAdjustedHoles)
      }
    }

    const floorLayerModel = constructFloorLayerModel({
      finishedPolygon: finishedFloorPolygon,
      topHoles,
      ceilingHoles,
      currentFloorConfig: currentFloorAssembly,
      nextFloorConfig: nextFloorAssembly ?? null,
      floorTopOffset: storeyContext.floorTopOffset,
      ceilingStartHeight: (storeyContext.ceilingHeight +
        storeyContext.floorTopOffset +
        storeyContext.ceilingBottomOffset) as Length
    })

    if (floorLayerModel) {
      allModels.push(floorLayerModel)
    }
  }

  if (includeRoof) {
    const roofs = getRoofsByStorey(perimeter.storeyId)
    const relevantRoofs = roofs.filter(r => r.referencePerimeter === perimeter.id)
    allModels.push(
      ...relevantRoofs.map(roof =>
        transformModel(constructRoof(roof, [perimeterContext]), translate(vec3.fromValues(0, 0, storey.floorHeight)))
      )
    )
  }

  return mergeModels(...allModels)
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

export function getPerimeterStats(perimeter: Perimeter): PerimeterStats {
  const { getStoreyById, getStoreyAbove, getFloorOpeningsByStorey } = getModelActions()
  const storey = getStoreyById(perimeter.storeyId)
  if (!storey) {
    throw new Error('Invalid storey on perimeter')
  }

  const { getFloorAssemblyById } = getConfigActions()
  const floorAssemblyConfig = getFloorAssemblyById(storey.floorAssemblyId)
  if (!floorAssemblyConfig) {
    throw new Error(`Floor assembly ${storey.floorAssemblyId} not found for storey ${storey.id}`)
  }

  const nextStorey = getStoreyAbove(storey.id)
  const nextFloorAssemblyConfig = nextStorey ? getFloorAssemblyById(nextStorey.floorAssemblyId) : null

  const floorAssembly = FLOOR_ASSEMBLIES[floorAssemblyConfig.type]

  const storeyContext = createWallStoreyContext(storey, floorAssemblyConfig, nextFloorAssemblyConfig, [])
  const storeyHeight =
    storeyContext.ceilingHeight +
    storeyContext.floorTopOffset +
    storeyContext.ceilingBottomOffset +
    floorAssembly.getConstructionThickness(floorAssemblyConfig)
  const constructionHeight =
    storeyContext.ceilingHeight +
    floorAssemblyConfig.layers.topThickness +
    (nextFloorAssemblyConfig?.layers.bottomThickness ?? 0)
  const finishedHeight = storeyContext.ceilingHeight

  const footprintPolygon: Polygon2D = { points: perimeter.corners.map(corner => corner.outsidePoint) }
  const footprint = calculatePolygonArea(footprintPolygon)

  const innerFloorPolygon: Polygon2D = { points: perimeter.corners.map(corner => corner.insidePoint) }
  const innerArea = calculatePolygonArea(innerFloorPolygon)
  const floorHoles = getFloorOpeningsByStorey(perimeter.storeyId).map(a => a.area)
  const floorPolygons = subtractPolygons([innerFloorPolygon], floorHoles)
  const totalFloorArea = floorPolygons.map(calculatePolygonWithHolesArea).reduce((a, b) => a + b, 0)

  let totalConstructionLength = 0
  const totalInsideLength = polygonPerimeter(innerFloorPolygon)
  const totalOutsideLength = polygonPerimeter(footprintPolygon)
  let totalOpeningArea = 0
  let totalWindowArea = 0
  let totalDoorArea = 0

  for (const wall of perimeter.walls) {
    totalConstructionLength += wall.wallLength

    for (const opening of wall.openings) {
      const openingArea = opening.width * opening.height
      totalOpeningArea += openingArea
      if (opening.type === 'window') {
        totalWindowArea += openingArea
      } else if (opening.type === 'door' || opening.type === 'passage') {
        totalDoorArea += openingArea
      }
    }
  }

  const totalConstructionWallArea = Math.max(totalConstructionLength * constructionHeight - totalOpeningArea, 0)
  const totalFinishedWallArea = Math.max(totalInsideLength * finishedHeight - totalOpeningArea, 0)
  const totalExteriorWallArea = Math.max(totalOutsideLength * storeyHeight - totalOpeningArea, 0)

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
    storeyHeight,
    ceilingHeight: finishedHeight
  }
}

function createPerimeterMeasurementModel(
  perimeter: Perimeter,
  floorContext: PerimeterConstructionContext,
  storeyContext: WallStoreyContext
): ConstructionModel {
  const measurements: RawMeasurement[] = []

  for (let i = 0; i < perimeter.corners.length; i++) {
    const corner = perimeter.corners[i]
    const nextCorner = perimeter.corners[(i + 1) % perimeter.corners.length]
    const wall = perimeter.walls[i]

    const insideStart = vec3.fromValues(corner.insidePoint[0], corner.insidePoint[1], 0)
    const insideEnd = vec3.fromValues(nextCorner.insidePoint[0], nextCorner.insidePoint[1], 0)

    const insideExtend1In2D = vec2.scaleAndAdd(vec2.create(), corner.insidePoint, wall.outsideDirection, wall.thickness)
    const insideExtend1 = vec3.fromValues(insideExtend1In2D[0], insideExtend1In2D[1], 0)
    const insideExtend2 = vec3.fromValues(corner.insidePoint[0], corner.insidePoint[1], storeyContext.ceilingHeight)

    measurements.push({
      startPoint: insideStart,
      endPoint: insideEnd,
      extend1: insideExtend1,
      extend2: insideExtend2,
      tags: [TAG_WALL_LENGTH_INSIDE]
    })

    const outsideStart = vec3.fromValues(corner.outsidePoint[0], corner.outsidePoint[1], 0)
    const outsideEnd = vec3.fromValues(nextCorner.outsidePoint[0], nextCorner.outsidePoint[1], 0)

    const outsideExtend1In2D = vec2.scaleAndAdd(
      vec2.create(),
      corner.outsidePoint,
      wall.outsideDirection,
      -wall.thickness
    )
    const outsideExtend1 = vec3.fromValues(outsideExtend1In2D[0], outsideExtend1In2D[1], 0)
    const outsideExtend2 = vec3.fromValues(corner.outsidePoint[0], corner.outsidePoint[1], storeyContext.ceilingHeight)

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
    const extend1In2D = vec2.scaleAndAdd(vec2.create(), edge.start, outDirection, 10)
    const extend1 = vec3.fromValues(extend1In2D[0], extend1In2D[1], 0)
    const extend2 = vec3.fromValues(edge.start[0], edge.start[1], storeyContext.ceilingHeight)

    measurements.push({
      startPoint: vec3.fromValues(edge.start[0], edge.start[1], 0),
      endPoint: vec3.fromValues(edge.end[0], edge.end[1], 0),
      extend1,
      extend2,
      tags: [TAG_WALL_CONSTRUCTION_LENGTH_INSIDE]
    })
  }

  for (const edge of polygonEdges(floorContext.outerPolygon)) {
    const inDirection = perpendicularCW(direction(edge.start, edge.end))
    const extend1In2D = vec2.scaleAndAdd(vec2.create(), edge.start, inDirection, 10)
    const extend1 = vec3.fromValues(extend1In2D[0], extend1In2D[1], 0)
    const extend2 = vec3.fromValues(edge.start[0], edge.start[1], storeyContext.ceilingHeight)
    measurements.push({
      startPoint: vec3.fromValues(edge.start[0], edge.start[1], 0),
      endPoint: vec3.fromValues(edge.end[0], edge.end[1], 0),
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
