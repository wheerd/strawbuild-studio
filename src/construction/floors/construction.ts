import type { PerimeterId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getPerimeterContextCached } from '@/construction/derived/perimeterContextCache'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels, transformModel } from '@/construction/model'
import { applyWallFaceOffsets, createWallFaceOffsets } from '@/construction/perimeters/context'
import { resultsToModel } from '@/construction/results'
import { getWallStoreyContextCached } from '@/construction/storeys/context'
import { TAG_FLOOR } from '@/construction/tags'
import { type Polygon2D, fromTrans, newVec3, subtractPolygons, unionPolygons } from '@/shared/geometry'

export function constructFloor(perimeterId: PerimeterId): ConstructionModel {
  const { getPerimeterById, getFloorOpeningsByStorey, getPerimetersByStorey } = getModelActions()

  const perimeter = getPerimeterById(perimeterId)
  const perimeterContext = getPerimeterContextCached(perimeter.id)
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)

  const floorModels = []

  const innerPolygons = [perimeterContext.innerFinishedPolygon]
  const floorModel = storeyContext.floorAssembly.construct(perimeterContext)
  floorModels.push(
    transformModel(floorModel, fromTrans(newVec3(0, 0, storeyContext.wallBottom)), [
      TAG_FLOOR,
      ...storeyContext.floorAssembly.tags
    ])
  )

  const floorHoles = perimeterContext.floorOpenings
  const floorPolygons = subtractPolygons(innerPolygons, floorHoles)
  if (floorPolygons.length > 0) {
    const floorLayerResults = Array.from(storeyContext.floorAssembly.constructFloorLayers(floorPolygons))
    const floorLayersModel = resultsToModel(floorLayerResults)
    floorModels.push(
      transformModel(floorLayersModel, fromTrans(newVec3(0, 0, storeyContext.floorConstructionTop)), [
        TAG_FLOOR,
        ...storeyContext.floorAssembly.tags
      ])
    )
  }

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
      floorModels.push(
        transformModel(ceilingLayerModel, fromTrans(newVec3(0, 0, storeyContext.finishedCeilingBottom)), [
          TAG_FLOOR,
          ...storeyContext.ceilingAssembly.tags
        ])
      )
    }
  }

  return mergeModels(...floorModels)
}
