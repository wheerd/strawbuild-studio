import type { Perimeter } from '@/building/model'
import { getModelActions } from '@/building/store'
import { IDENTITY } from '@/construction/geometry'
import { TAG_BASE_PLATE, TAG_TOP_PLATE, TAG_WALLS } from '@/construction/tags'
import { angle } from '@/shared/geometry'

import { getConfigActions } from './config'
import { type ConstructionModel, mergeModels, transformModel } from './model'
import { constructRingBeam } from './ringBeams/ringBeams'
import { PERIMETER_WALL_CONSTRUCTION_METHODS } from './walls'

export function constructPerimeter(perimeter: Perimeter): ConstructionModel {
  const { getStoreyById } = getModelActions()
  const storey = getStoreyById(perimeter.storeyId)
  if (!storey) {
    throw new Error('Invalid storey on perimeter')
  }

  const { getRingBeamConstructionMethodById, getPerimeterConstructionMethodById } = getConfigActions()

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
          position: [0, 0, storey.height - method.config.height],
          rotation: [0, 0, 0]
        },
        [TAG_TOP_PLATE]
      )
      allModels.push(transformedModel)
    }
  }

  for (const wall of perimeter.walls) {
    const method = getPerimeterConstructionMethodById(wall.constructionMethodId)
    let wallModel: ConstructionModel | null = null

    if (method?.config?.type) {
      const constructionMethod = PERIMETER_WALL_CONSTRUCTION_METHODS[method.config.type]
      wallModel = constructionMethod(wall, perimeter, storey.height, method.config, method.layers)
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

  return mergeModels(...allModels)
}
