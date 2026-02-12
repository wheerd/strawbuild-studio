import type { StoreyId } from '@/building/model'
import { getModelActions, subscribeToStoreys } from '@/building/store'
import { getConfigActions, subscribeToFloorAssemblies } from '@/construction/config'
import { type FloorAssembly, resolveFloorAssembly } from '@/construction/floors'
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
}

type InvalidationCallback = (storeyId: StoreyId) => void

export class WallStoreyContextCacheService {
  private readonly entries: Map<StoreyId, StoreyContext>
  private readonly invalidationCallbacks: Set<InvalidationCallback>

  constructor() {
    this.entries = new Map()
    this.invalidationCallbacks = new Set()
    this.setupSubscriptions()
  }

  onInvalidation(callback: InvalidationCallback): () => void {
    this.invalidationCallbacks.add(callback)
    return () => this.invalidationCallbacks.delete(callback)
  }

  getContext(storeyId: StoreyId): StoreyContext {
    const cached = this.entries.get(storeyId)
    if (cached) return cached

    const context = this.buildContext(storeyId)
    this.entries.set(storeyId, context)
    return context
  }

  private buildContext(storeyId: StoreyId): StoreyContext {
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
        ceilingAssembly
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
      floorAssembly
    }
  }

  private invalidate(storeyId: StoreyId): void {
    this.entries.delete(storeyId)
    for (const callback of this.invalidationCallbacks) {
      callback(storeyId)
    }
  }

  private setupSubscriptions(): void {
    const { getStoreysOrderedByLevel, getStoreyBelow } = getModelActions()

    subscribeToStoreys(storeyId => {
      this.invalidate(storeyId)
      const below = getStoreyBelow(storeyId)
      if (below) {
        this.invalidate(below.id)
      }
    })

    subscribeToFloorAssemblies(assemblyId => {
      for (const storey of getStoreysOrderedByLevel()) {
        if (storey.floorAssemblyId === assemblyId) {
          this.invalidate(storey.id)
        }
      }
    })
  }
}

const serviceInstance = new WallStoreyContextCacheService()

export function getWallStoreyContextCached(storeyId: StoreyId): StoreyContext {
  return serviceInstance.getContext(storeyId)
}

export function subscribeToWallStoreyContextInvalidations(callback: InvalidationCallback): () => void {
  return serviceInstance.onInvalidation(callback)
}
