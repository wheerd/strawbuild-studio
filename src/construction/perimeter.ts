import { vec2, vec3 } from 'gl-matrix'

import type { Perimeter } from '@/building/model'
import { getModelActions } from '@/building/store'
import { FLOOR_ASSEMBLIES } from '@/construction/floors'
import { IDENTITY } from '@/construction/geometry'
import { applyWallFaceOffsets, createWallFaceOffsets } from '@/construction/storey'
import { TAG_BASE_PLATE, TAG_TOP_PLATE, TAG_WALLS } from '@/construction/tags'
import { type Polygon2D, angle, arePolygonsIntersecting, lineIntersection, unionPolygons } from '@/shared/geometry'

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

export function constructPerimeter(perimeter: Perimeter, includeFloor = true): ConstructionModel {
  const { getStoreyById, getStoreysOrderedByLevel, getFloorOpeningsByStorey } = getModelActions()
  const storey = getStoreyById(perimeter.storeyId)
  if (!storey) {
    throw new Error('Invalid storey on perimeter')
  }

  const { getRingBeamAssemblyById, getWallAssemblyById, getFloorAssemblyById } = getConfigActions()

  const currentFloorAssembly = getFloorAssemblyById(storey.floorAssemblyId)
  if (!currentFloorAssembly) {
    throw new Error(`Floor assembly ${storey.floorAssemblyId} not found for storey ${storey.id}`)
  }

  const allStoreys = getStoreysOrderedByLevel()
  const currentIndex = allStoreys.findIndex(s => s.id === storey.id)
  const nextStorey = currentIndex >= 0 && currentIndex < allStoreys.length - 1 ? allStoreys[currentIndex + 1] : null

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
    const floorPolygon = computeFloorConstructionPolygon(perimeter)
    const holes = getFloorOpeningsByStorey(storey.id).map(opening => opening.area)
    const relevantHoles = holes.filter(hole => arePolygonsIntersecting(floorPolygon, hole))
    const wallFaces = createWallFaceOffsets([perimeter])
    const adjustedHoles = relevantHoles.map(hole => applyWallFaceOffsets(hole, wallFaces))
    const mergedHoles = unionPolygons(adjustedHoles)
    const floorAssembly = FLOOR_ASSEMBLIES[currentFloorAssembly.type]
    const floorModel = floorAssembly.construct({ outer: floorPolygon, holes: mergedHoles }, currentFloorAssembly)
    allModels.push(floorModel)
  }

  return mergeModels(...allModels)
}
