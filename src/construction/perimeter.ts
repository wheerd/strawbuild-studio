import { vec3 } from 'gl-matrix'

import type { Perimeter } from '@/building/model'
import { getModelActions } from '@/building/store'
import { FLOOR_ASSEMBLIES } from '@/construction/floors'
import { IDENTITY } from '@/construction/geometry'
import { TAG_BASE_PLATE, TAG_TOP_PLATE, TAG_WALLS } from '@/construction/tags'
import { angle, offsetPolygon } from '@/shared/geometry'

import { getConfigActions } from './config'
import { type ConstructionModel, mergeModels, transformModel } from './model'
import { RING_BEAM_ASSEMBLIES } from './ringBeams'
import { WALL_ASSEMBLIES, createWallStoreyContext } from './walls'

export function constructPerimeter(perimeter: Perimeter): ConstructionModel {
  const { getStoreyById, getStoreysOrderedByLevel } = getModelActions()
  const storey = getStoreyById(perimeter.storeyId)
  if (!storey) {
    throw new Error('Invalid storey on perimeter')
  }

  const { getRingBeamAssemblyById, getWallAssemblyById, getFloorAssemblyConfigById } = getConfigActions()

  const currentFloorAssembly = getFloorAssemblyConfigById(storey.floorAssemblyId)
  if (!currentFloorAssembly) {
    throw new Error(`Slab config ${storey.floorAssemblyId} not found for storey ${storey.id}`)
  }

  const allStoreys = getStoreysOrderedByLevel()
  const currentIndex = allStoreys.findIndex(s => s.id === storey.id)
  const nextStorey = currentIndex >= 0 && currentIndex < allStoreys.length - 1 ? allStoreys[currentIndex + 1] : null

  const nextFloorAssembly = nextStorey ? getFloorAssemblyConfigById(nextStorey.floorAssemblyId) : null

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

  let minOffset = Infinity
  for (const wall of perimeter.walls) {
    const assembly = getWallAssemblyById(wall.wallAssemblyId)
    let wallModel: ConstructionModel | null = null

    if (assembly?.type) {
      const wallAssembly = WALL_ASSEMBLIES[assembly.type]
      if (assembly.layers.outsideThickness < minOffset) {
        minOffset = assembly.layers.outsideThickness
      }
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

  const outerPolygon = { points: perimeter.corners.map(c => c.outsidePoint) }
  // TODO: Properly determine the construction polygon based on offsets
  const constructionPolygon = isFinite(minOffset) ? offsetPolygon(outerPolygon, -minOffset) : outerPolygon
  const floorAssembly = FLOOR_ASSEMBLIES[currentFloorAssembly.type]
  const floorModel = floorAssembly.construct({ outer: constructionPolygon, holes: [] }, currentFloorAssembly)
  allModels.push(floorModel)

  return mergeModels(...allModels)
}
