import type { Perimeter } from '@/building/model'
import { getModelActions } from '@/building/store'
import { angle } from '@/shared/geometry'

import { getConfigActions } from './config'
import type { ResolveMaterialFunction } from './materials/material'
import { type ConstructionModel, mergeModels, transformModel } from './model'
import { constructRingBeam } from './ringBeams/ringBeams'
import { constructInfillWall, constructNonStrawbaleWall } from './walls'

export function constructPerimeter(perimeter: Perimeter, resolveMaterial: ResolveMaterialFunction): ConstructionModel {
  const { getActiveStorey } = getModelActions()
  const { getRingBeamConstructionMethodById, getPerimeterConstructionMethodById } = getConfigActions()

  const allModels: ConstructionModel[] = []
  if (perimeter.baseRingBeamMethodId) {
    const method = getRingBeamConstructionMethodById(perimeter.baseRingBeamMethodId)
    if (method) {
      const ringBeam = constructRingBeam(perimeter, method.config, resolveMaterial)
      allModels.push(ringBeam)
    }
  }
  if (perimeter.topRingBeamMethodId) {
    const method = getRingBeamConstructionMethodById(perimeter.topRingBeamMethodId)
    if (method) {
      const ringBeam = constructRingBeam(perimeter, method.config, resolveMaterial)
      allModels.push(ringBeam)
    }
  }
  const storey = getActiveStorey()
  for (const wall of perimeter.walls) {
    const method = getPerimeterConstructionMethodById(wall.constructionMethodId)
    let wallModel: ConstructionModel | null = null
    if (method?.config?.type === 'infill') {
      wallModel = constructInfillWall(wall, perimeter, storey.height, method.config, method.layers)
    } else if (method?.config?.type === 'non-strawbale') {
      wallModel = constructNonStrawbaleWall(wall, perimeter, storey.height, method.config, method.layers)
    }

    if (wallModel) {
      const segmentAngle = angle(wall.insideLine.start, wall.insideLine.end)
      const transformedModel = transformModel(wallModel, {
        position: [wall.insideLine.start[0], wall.insideLine.start[1], 0],
        rotation: [0, 0, segmentAngle]
      })
      allModels.push(transformedModel)
    }
  }

  return mergeModels(...allModels)
}
