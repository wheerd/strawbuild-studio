import { getStoreyName } from '@/building/hooks/useStoreyName'
import type { StoreyId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getPerimeterContextCached } from '@/construction/derived/perimeterContextCache'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model'
import {
  type PerimeterConstructionContext,
  applyWallFaceOffsets,
  createWallFaceOffsets
} from '@/construction/perimeters/context'
import { constructPerimeter } from '@/construction/perimeters/perimeter'
import { resultsToModel } from '@/construction/results'
import { constructRoof } from '@/construction/roofs'
import { type StoreyContext, createWallStoreyContext } from '@/construction/storeys/context'
import { TAG_FLOOR, TAG_STOREY, createTag } from '@/construction/tags'
import { type Polygon2D, fromTrans, newVec3, subtractPolygons, unionPolygons } from '@/shared/geometry'

function constructStoreyFloor(
  storeyContext: StoreyContext,
  perimeterContexts: PerimeterConstructionContext[]
): ConstructionModel[] {
  const { getPerimetersByStorey, getFloorOpeningsByStorey } = getModelActions()

  const floorModels = perimeterContexts
    .map(c => storeyContext.floorAssembly.construct(c))
    .map(m =>
      transformModel(m, fromTrans(newVec3(0, 0, storeyContext.wallBottom)), [
        TAG_FLOOR,
        ...storeyContext.floorAssembly.tags
      ])
    )

  const floorLayerModels: ConstructionModel[] = []

  const floorHoles = perimeterContexts.flatMap(c => c.floorOpenings)
  const innerPolygons = perimeterContexts.map(c => c.innerFinishedPolygon)
  const floorPolygons = subtractPolygons(innerPolygons, floorHoles)
  if (floorPolygons.length > 0) {
    const floorLayerResults = Array.from(storeyContext.floorAssembly.constructFloorLayers(floorPolygons))
    const floorLayersModel = resultsToModel(floorLayerResults)
    floorLayerModels.push(
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
      floorLayerModels.push(
        transformModel(ceilingLayerModel, fromTrans(newVec3(0, 0, storeyContext.finishedCeilingBottom)), [
          TAG_FLOOR,
          ...storeyContext.ceilingAssembly.tags
        ])
      )
    }
  }

  return [...floorModels, ...floorLayerModels]
}

export function constructStorey(storeyId: StoreyId): ConstructionModel | null {
  const { getPerimetersByStorey, getRoofsByStorey } = getModelActions()
  const perimeters = getPerimetersByStorey(storeyId)

  const perimeterContexts = perimeters.map(p => getPerimeterContextCached(p.id))
  const storeyContext = createWallStoreyContext(storeyId, perimeterContexts)

  const perimeterModels = perimeters.map(p => constructPerimeter(p, false, false))

  const roofs = getRoofsByStorey(storeyId)
  const roofModels = roofs.map(r =>
    transformModel(constructRoof(r, perimeterContexts), fromTrans(newVec3(0, 0, storeyContext.roofBottom)))
  )
  const floorModels = constructStoreyFloor(storeyContext, perimeterContexts)

  return mergeModels(...perimeterModels, ...floorModels, ...roofModels)
}

export function constructModel(): ConstructionModel | null {
  const { getStoreysOrderedByLevel } = getModelActions()
  const models: ConstructionModel[] = []
  let finishedFloorElevation = 0
  const storeys = getStoreysOrderedByLevel()

  storeys.forEach(storey => {
    const model = constructStorey(storey.id)
    if (model) {
      const storeyNameTag = createTag(
        'storey-name',
        storey.useDefaultName ? `level${storey.level}` : storey.name,
        storey.useDefaultName ? t => getStoreyName(storey, t) : storey.name
      )
      models.push(
        transformModel(
          model,
          fromTrans(newVec3(0, 0, finishedFloorElevation)),
          [TAG_STOREY, storeyNameTag],
          undefined,
          storey.id
        )
      )
    }
    finishedFloorElevation += storey.floorHeight
  })

  return models.length > 0 ? mergeModels(...models) : null
}
