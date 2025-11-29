import { vec2, vec3 } from 'gl-matrix'

import type { Perimeter } from '@/building/model'
import { getModelActions } from '@/building/store'
import { FLOOR_ASSEMBLIES, constructFloorLayerModel } from '@/construction/floors'
import { IDENTITY } from '@/construction/geometry'
import { constructRoof } from '@/construction/roof'
import { applyWallFaceOffsets, createWallFaceOffsets } from '@/construction/storey'
import { TAG_BASE_PLATE, TAG_TOP_PLATE, TAG_WALLS } from '@/construction/tags'
import {
  type Area,
  type Length,
  type Polygon2D,
  type Volume,
  angle,
  arePolygonsIntersecting,
  calculatePolygonArea,
  calculatePolygonWithHolesArea,
  lineIntersection,
  polygonPerimeter,
  subtractPolygons,
  unionPolygons
} from '@/shared/geometry'

import { getConfigActions } from './config'
import { type ConstructionModel, mergeModels, transformModel } from './model'
import { RING_BEAM_ASSEMBLIES } from './ringBeams'
import { WALL_ASSEMBLIES, createWallStoreyContext } from './walls'

export function computeFloorConstructionPolygon(perimeter: Perimeter): Polygon2D {
  const { getWallAssemblyById } = getConfigActions()

  const offsets = perimeter.walls.map(wall => {
    const assembly = getWallAssemblyById(wall.wallAssemblyId)
    const outsideLayerThickness = Math.max(assembly?.layers.outsideThickness ?? 0, 0)
    const distanceFromInside = Math.max(wall.thickness - outsideLayerThickness, 0)
    return distanceFromInside
  })

  const offsetLines = perimeter.walls.map((wall, index) => {
    const offsetDistance = offsets[index]
    const offsetPoint = vec2.scaleAndAdd(vec2.create(), wall.insideLine.start, wall.outsideDirection, offsetDistance)
    return { point: offsetPoint, direction: wall.direction }
  })

  const points = offsetLines.map((line, index) => {
    const prevIndex = (index - 1 + offsetLines.length) % offsetLines.length
    const prevLine = offsetLines[prevIndex]
    const intersection = lineIntersection(prevLine, line)
    if (intersection) {
      return intersection
    }

    const fallbackDistance = Math.max(offsets[prevIndex], offsets[index])
    // For colinear walls fall back to moving the inside corner along the outward normal.
    return vec2.scaleAndAdd(
      vec2.create(),
      perimeter.corners[index].insidePoint,
      perimeter.walls[index].outsideDirection,
      fallbackDistance
    )
  })

  return { points }
}

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

  const storeyContext = createWallStoreyContext(storey, currentFloorAssembly, nextFloorAssembly)
  const constructionHeight =
    storeyContext.storeyHeight + storeyContext.floorTopOffset + storeyContext.ceilingBottomOffset

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
        {
          position: [0, 0, constructionHeight - assembly.height],
          rotation: vec3.fromValues(0, 0, 0)
        },
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
        {
          position: [wall.insideLine.start[0], wall.insideLine.start[1], 0],
          rotation: [0, 0, segmentAngle]
        },
        [TAG_WALLS]
      )
      allModels.push(transformedModel)
    }
  }

  if (includeFloor) {
    const finishedFloorPolygon: Polygon2D = {
      points: perimeter.corners.map(corner => vec2.fromValues(corner.insidePoint[0], corner.insidePoint[1]))
    }
    const floorPolygon = computeFloorConstructionPolygon(perimeter)
    const holes = getFloorOpeningsByStorey(storey.id).map(opening => opening.area)
    const relevantHoles = holes.filter(hole => arePolygonsIntersecting(floorPolygon, hole))
    const wallFaces = createWallFaceOffsets([perimeter])
    const adjustedHoles = relevantHoles.map(hole => applyWallFaceOffsets(hole, wallFaces))
    const mergedHoles = unionPolygons(adjustedHoles)
    const floorAssembly = FLOOR_ASSEMBLIES[currentFloorAssembly.type]
    const floorModel = floorAssembly.construct({ outer: floorPolygon, holes: mergedHoles }, currentFloorAssembly)
    allModels.push(floorModel)

    const topHoles = mergedHoles

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
      ceilingStartHeight: (storeyContext.storeyHeight +
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
        transformModel(constructRoof(roof), {
          position: vec3.fromValues(0, 0, storey.floorHeight),
          rotation: vec3.fromValues(0, 0, 0)
        })
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

  const storeyContext = createWallStoreyContext(storey, floorAssemblyConfig, nextFloorAssemblyConfig)
  const storeyHeight =
    storeyContext.storeyHeight +
    storeyContext.floorTopOffset +
    storeyContext.ceilingBottomOffset +
    floorAssembly.getConstructionThickness(floorAssemblyConfig)
  const constructionHeight =
    storeyContext.storeyHeight +
    floorAssemblyConfig.layers.topThickness +
    (nextFloorAssemblyConfig?.layers.bottomThickness ?? 0)
  const finishedHeight = storeyContext.storeyHeight

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
