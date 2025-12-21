import type { StoreyId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { type FloorAssembly, resolveFloorAssembly } from '@/construction/floors'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import type { Length } from '@/shared/geometry'

export type ZOffset = number

export interface StoreyContext {
  storeyId: StoreyId
  nextStoreyId?: StoreyId
  storeyHeight: Length

  roofBottom: ZOffset
  wallTop: ZOffset
  ceilingConstructionBottom: ZOffset
  finishedCeilingBottom: ZOffset
  finishedFloorTop: ZOffset
  floorConstructionTop: ZOffset
  wallBottom: ZOffset
  floorBottom: ZOffset

  floorAssembly: FloorAssembly
  ceilingAssembly?: FloorAssembly
  perimeterContexts: PerimeterConstructionContext[]
}

export function createWallStoreyContext(
  storeyId: StoreyId,
  perimeterContexts: PerimeterConstructionContext[]
): StoreyContext {
  const { getStoreyById, getStoreyAbove } = getModelActions()
  const { getFloorAssemblyById } = getConfigActions()
  const storey = getStoreyById(storeyId)
  if (!storey) {
    throw new Error('Invalid storey')
  }

  const floorAssemblyConfig = getFloorAssemblyById(storey.floorAssemblyId)
  if (!floorAssemblyConfig) {
    throw new Error('Invalid floor assembly')
  }
  const floorAssembly = resolveFloorAssembly(floorAssemblyConfig)

  const nextStorey = getStoreyAbove(storey.id)
  const nextFloorConfig = nextStorey ? getFloorAssemblyById(nextStorey.floorAssemblyId) : null
  const ceilingAssembly = nextFloorConfig ? resolveFloorAssembly(nextFloorConfig) : null

  const finishedFloorTop = 0

  const floorConstructionTop = finishedFloorTop - floorAssembly.topLayersThickness
  const wallBottom = floorConstructionTop - floorAssembly.topOffset
  const floorBottom = wallBottom - floorAssembly.constructionThickness

  if (ceilingAssembly) {
    const finishedCeilingBottom = finishedFloorTop + storey.floorHeight - ceilingAssembly.totalThickness
    const ceilingConstructionBottom = finishedCeilingBottom + ceilingAssembly.bottomLayersThickness
    const wallTop = ceilingConstructionBottom + ceilingAssembly.bottomOffset

    return {
      storeyId,
      nextStoreyId: nextStorey?.id,
      storeyHeight: storey.floorHeight,
      roofBottom: wallTop,
      wallTop,
      ceilingConstructionBottom,
      finishedCeilingBottom,
      finishedFloorTop,
      floorConstructionTop,
      wallBottom,
      floorBottom,
      floorAssembly,
      ceilingAssembly,
      perimeterContexts
    }
  }

  const wallTop = finishedFloorTop + storey.floorHeight

  return {
    storeyId,
    storeyHeight: storey.floorHeight,
    roofBottom: wallTop,
    wallTop,
    ceilingConstructionBottom: wallTop,
    finishedCeilingBottom: wallTop,
    finishedFloorTop,
    floorConstructionTop,
    wallBottom,
    floorBottom,
    floorAssembly,
    perimeterContexts
  }
}
