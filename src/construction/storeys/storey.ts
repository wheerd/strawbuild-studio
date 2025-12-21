import type { StoreyId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { constructRoof } from '@/construction/roofs'
import { type Length, type Polygon2D, fromTrans, newVec2, newVec3, unionPolygons } from '@/shared/geometry'

import { getConfigActions } from '../config'
import { FLOOR_ASSEMBLIES, constructFloorLayerModel } from '../floors'
import { type ConstructionModel, mergeModels, transformModel } from '../model'
import { applyWallFaceOffsets, computePerimeterConstructionContext, createWallFaceOffsets } from '../perimeters/context'
import { constructPerimeter } from '../perimeters/perimeter'
import { TAG_STOREY } from '../tags'
import { createWallStoreyContext } from '../walls'

export function constructStoreyFloor(storeyId: StoreyId): ConstructionModel[] {
  const { getPerimetersByStorey, getFloorOpeningsByStorey, getStoreyById, getStoreyAbove } = getModelActions()
  const storey = getStoreyById(storeyId)
  if (!storey) {
    throw new Error('Invalid storey')
  }

  const { getFloorAssemblyById } = getConfigActions()
  const floorAssemblyConfig = getFloorAssemblyById(storey.floorAssemblyId)
  if (!floorAssemblyConfig) {
    throw new Error('Invalid floor assembly')
  }

  const perimeters = getPerimetersByStorey(storeyId)
  const floorOpenings = getFloorOpeningsByStorey(storeyId)

  const perimeterContexts = perimeters.map(p => computePerimeterConstructionContext(p, floorOpenings))

  const floorAssembly = FLOOR_ASSEMBLIES[floorAssemblyConfig.type]
  const floorModels = perimeterContexts.map(c => floorAssembly.construct(c, floorAssemblyConfig))

  const nextStorey = getStoreyAbove(storey.id)
  const nextFloorAssemblyConfig = nextStorey ? getFloorAssemblyById(nextStorey.floorAssemblyId) : null

  const storeyContext = createWallStoreyContext(
    storey,
    floorAssemblyConfig,
    nextFloorAssemblyConfig ?? null,
    perimeterContexts
  )
  const ceilingStartHeight = (storeyContext.floorTopOffset +
    storeyContext.ceilingHeight +
    storeyContext.ceilingBottomOffset) as Length

  let nextFloorOpenings: Polygon2D[] = []
  if (nextStorey && nextFloorAssemblyConfig) {
    const nextPerimeters = getPerimetersByStorey(nextStorey.id)
    if (nextPerimeters.length > 0) {
      const nextWallFaces = createWallFaceOffsets(nextPerimeters)
      nextFloorOpenings = unionPolygons(
        getFloorOpeningsByStorey(nextStorey.id).map(opening => applyWallFaceOffsets(opening.area, nextWallFaces))
      )
    }
  }

  const floorLayerModels: ConstructionModel[] = []

  const topHoles = perimeterContexts.flatMap(c => c.floorOpenings)
  const innerPolygons = perimeters.map(perimeter => ({
    points: perimeter.corners.map(corner => newVec2(corner.insidePoint[0], corner.insidePoint[1]))
  }))
  innerPolygons.forEach(finishedPolygon => {
    const floorLayerModel = constructFloorLayerModel({
      finishedPolygon,
      topHoles,
      ceilingHoles: nextFloorOpenings,
      currentFloorConfig: floorAssemblyConfig,
      nextFloorConfig: nextFloorAssemblyConfig ?? null,
      floorTopOffset: storeyContext.floorTopOffset,
      ceilingStartHeight
    })

    if (floorLayerModel) {
      floorLayerModels.push(floorLayerModel)
    }
  })

  return [...floorModels, ...floorLayerModels]
}

export function constructStorey(storeyId: StoreyId): ConstructionModel | null {
  const { getPerimetersByStorey, getStoreyById, getRoofsByStorey } = getModelActions()
  const { getFloorAssemblyById } = getConfigActions()
  const perimeters = getPerimetersByStorey(storeyId)
  const roofs = getRoofsByStorey(storeyId)
  const storey = getStoreyById(storeyId)
  if (!storey) {
    throw new Error('Invalid storey')
  }
  const floorAssemblyConfig = getFloorAssemblyById(storey.floorAssemblyId)
  if (!floorAssemblyConfig) {
    throw new Error('Invalid floor assembly')
  }
  const floorAssembly = FLOOR_ASSEMBLIES[floorAssemblyConfig.type]
  const finishedFloorOffset = (floorAssemblyConfig.layers.topThickness +
    floorAssembly.getTopOffset(floorAssemblyConfig)) as Length
  const contexts = perimeters.map(p => computePerimeterConstructionContext(p, []))
  const roofModels = roofs.map(r =>
    transformModel(constructRoof(r, contexts), fromTrans(newVec3(0, 0, storey.floorHeight)))
  )
  const perimeterModels = perimeters.map(p => constructPerimeter(p, false, false))
  const floorModels = constructStoreyFloor(storeyId)
  const storeyModel = mergeModels(...perimeterModels, ...floorModels, ...roofModels)
  if (finishedFloorOffset === 0) {
    return storeyModel
  }
  return transformModel(storeyModel, fromTrans(newVec3(0, 0, -finishedFloorOffset)))
}

export function constructModel(): ConstructionModel | null {
  const { getStoreysOrderedByLevel } = getModelActions()
  const models: ConstructionModel[] = []
  let finishedFloorElevation = 0
  for (const storey of getStoreysOrderedByLevel()) {
    const model = constructStorey(storey.id)
    if (model) {
      models.push(transformModel(model, fromTrans(newVec3(0, 0, finishedFloorElevation)), [TAG_STOREY]))
    }
    finishedFloorElevation += storey.floorHeight
  }
  return models.length > 0 ? mergeModels(...models) : null
}
