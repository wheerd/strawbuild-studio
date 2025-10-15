import type { Perimeter } from '@/building/model'
import { getModelActions } from '@/building/store'
import { IDENTITY } from '@/construction/geometry'
import { SLAB_CONSTRUCTION_METHODS } from '@/construction/slabs'
import { TAG_BASE_PLATE, TAG_TOP_PLATE, TAG_WALLS } from '@/construction/tags'
import { angle, offsetPolygon } from '@/shared/geometry'

import { getConfigActions } from './config'
import { type ConstructionModel, mergeModels, transformModel } from './model'
import { constructRingBeam } from './ringBeams/ringBeams'
import { PERIMETER_WALL_CONSTRUCTION_METHODS, createWallStoreyContext } from './walls'

export function constructPerimeter(perimeter: Perimeter): ConstructionModel {
  const { getStoreyById, getStoreysOrderedByLevel } = getModelActions()
  const storey = getStoreyById(perimeter.storeyId)
  if (!storey) {
    throw new Error('Invalid storey on perimeter')
  }

  const { getRingBeamConstructionMethodById, getPerimeterConstructionMethodById, getSlabConstructionConfigById } =
    getConfigActions()

  const currentSlabConfig = getSlabConstructionConfigById(storey.slabConstructionConfigId)
  if (!currentSlabConfig) {
    throw new Error(`Slab config ${storey.slabConstructionConfigId} not found for storey ${storey.id}`)
  }

  const allStoreys = getStoreysOrderedByLevel()
  const currentIndex = allStoreys.findIndex(s => s.id === storey.id)
  const nextStorey = currentIndex >= 0 && currentIndex < allStoreys.length - 1 ? allStoreys[currentIndex + 1] : null

  const nextSlabConfig = nextStorey ? getSlabConstructionConfigById(nextStorey.slabConstructionConfigId) : null

  const storeyContext = createWallStoreyContext(storey, currentSlabConfig, nextSlabConfig)
  const constructionHeight =
    storeyContext.storeyHeight + storeyContext.floorTopOffset + storeyContext.ceilingBottomOffset

  const allModels: ConstructionModel[] = []
  if (perimeter.baseRingBeamMethodId) {
    const method = getRingBeamConstructionMethodById(perimeter.baseRingBeamMethodId)
    if (method) {
      const ringBeam = constructRingBeam(perimeter, method.config)
      const transformedModel = transformModel(ringBeam, IDENTITY, [TAG_BASE_PLATE])
      allModels.push(transformedModel)
    }
  }
  if (perimeter.topRingBeamMethodId) {
    const method = getRingBeamConstructionMethodById(perimeter.topRingBeamMethodId)
    if (method) {
      const ringBeam = constructRingBeam(perimeter, method.config)
      const transformedModel = transformModel(
        ringBeam,
        {
          position: [0, 0, constructionHeight - method.config.height],
          rotation: [0, 0, 0]
        },
        [TAG_TOP_PLATE]
      )
      allModels.push(transformedModel)
    }
  }

  let minOffset = Infinity
  for (const wall of perimeter.walls) {
    const method = getPerimeterConstructionMethodById(wall.constructionMethodId)
    let wallModel: ConstructionModel | null = null

    if (method?.config?.type) {
      const constructionMethod = PERIMETER_WALL_CONSTRUCTION_METHODS[method.config.type]
      if (method.layers.outsideThickness < minOffset) {
        minOffset = method.layers.outsideThickness
      }
      wallModel = constructionMethod(wall, perimeter, storeyContext, method.config, method.layers)
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
  const slabMethod = SLAB_CONSTRUCTION_METHODS[currentSlabConfig.type]
  const slabModel = slabMethod.construct({ outer: constructionPolygon, holes: [] }, currentSlabConfig)
  allModels.push(slabModel)

  return mergeModels(...allModels)
}
