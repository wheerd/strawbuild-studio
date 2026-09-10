import type { PerimeterId, StoreyId } from '@/building/model/ids'
import {
  getModelActions,
  subscribeToFloorOpenings,
  subscribeToPerimeterGeometries,
  subscribeToWalls
} from '@/building/store'
import { getConfigActions, subscribeToLayerSets, subscribeToWallAssemblies } from '@/config/store'
import { computePerimeterConstructionContext } from '@/construction/context/perimeter'
import type { PerimeterConstructionContext } from '@/construction/context/perimeter'

type InvalidationCallback = (perimeterId: PerimeterId) => void

export class PerimeterContextCacheService {
  private readonly entries: Map<PerimeterId, PerimeterConstructionContext>
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

  getContext(perimeterId: PerimeterId): PerimeterConstructionContext {
    const cached = this.entries.get(perimeterId)
    if (cached) return cached

    const context = this.buildContext(perimeterId)
    this.entries.set(perimeterId, context)
    return context
  }

  private buildContext(perimeterId: PerimeterId): PerimeterConstructionContext {
    const { getPerimeterById, getFloorOpeningsByStorey } = getModelActions()

    const perimeter = getPerimeterById(perimeterId)

    const floorOpenings = getFloorOpeningsByStorey(perimeter.storeyId)
    return computePerimeterConstructionContext(perimeter, floorOpenings)
  }

  private invalidate(perimeterId: PerimeterId): void {
    this.entries.delete(perimeterId)
    for (const callback of this.invalidationCallbacks) {
      callback(perimeterId)
    }
  }

  private setupSubscriptions(): void {
    const { getPerimetersByStorey, getAllPerimeters, getPerimeterWallsById } = getModelActions()
    const { getPerimeterWallAssemblyById } = getConfigActions()

    subscribeToPerimeterGeometries(perimeterId => {
      this.invalidate(perimeterId)
    })

    subscribeToWalls((_id, current, previous) => {
      const perimeterId = current?.perimeterId ?? previous?.perimeterId
      if (perimeterId) {
        this.invalidate(perimeterId)
      }
    })

    subscribeToFloorOpenings((_id, current, previous) => {
      const storeyId = current?.storeyId ?? previous?.storeyId
      if (storeyId) {
        const perimeters = getPerimetersByStorey(storeyId)
        perimeters.forEach(p => {
          this.invalidate(p.id)
        })
      }
    })

    subscribeToWallAssemblies(assemblyId => {
      for (const perimeter of getAllPerimeters()) {
        const usesAssembly = getPerimeterWallsById(perimeter.id).some(wall => wall.wallAssemblyId === assemblyId)
        if (usesAssembly) {
          this.invalidate(perimeter.id)
        }
      }
    })

    subscribeToLayerSets(layerSetId => {
      for (const perimeter of getAllPerimeters()) {
        const usesLayerSet = getPerimeterWallsById(perimeter.id).some(wall => {
          const assembly = getPerimeterWallAssemblyById(wall.wallAssemblyId)
          return assembly?.insideLayerSetId === layerSetId || assembly?.outsideLayerSetId === layerSetId
        })
        if (usesLayerSet) {
          this.invalidate(perimeter.id)
        }
      }
    })
  }
}

let serviceInstance: PerimeterContextCacheService | null

export function getPerimeterContextCached(perimeterId: PerimeterId): PerimeterConstructionContext {
  serviceInstance ??= new PerimeterContextCacheService()
  return serviceInstance.getContext(perimeterId)
}

export function subscribeToPerimeterContextInvalidations(callback: InvalidationCallback): () => void {
  serviceInstance ??= new PerimeterContextCacheService()
  return serviceInstance.onInvalidation(callback)
}

export function getPerimeterContextsByStorey(storeyId: StoreyId): PerimeterConstructionContext[] {
  const { getPerimetersByStorey } = getModelActions()
  const perimeters = getPerimetersByStorey(storeyId)
  return perimeters.map(p => getPerimeterContextCached(p.id))
}
