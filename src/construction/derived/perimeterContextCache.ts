import type { PerimeterId, StoreyId } from '@/building/model/ids'
import { getModelActions, subscribeToFloorOpenings, subscribeToPerimeters, subscribeToWalls } from '@/building/store'
import { computePerimeterConstructionContext } from '@/construction/perimeters/context'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'

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
    const { getPerimetersByStorey } = getModelActions()

    subscribeToPerimeters((current, previous) => {
      const perimeterId = current?.id ?? previous?.id
      if (perimeterId) {
        this.invalidate(perimeterId)
      }
    })

    subscribeToWalls((current, previous) => {
      const perimeterId = current?.perimeterId ?? previous?.perimeterId
      if (perimeterId) {
        this.invalidate(perimeterId)
      }
    })

    subscribeToFloorOpenings((current, previous) => {
      const storeyId = current?.storeyId ?? previous?.storeyId
      if (storeyId) {
        const perimeters = getPerimetersByStorey(storeyId)
        perimeters.forEach(p => {
          this.invalidate(p.id)
        })
      }
    })
  }
}

const serviceInstance = new PerimeterContextCacheService()

export function getPerimeterContextCached(perimeterId: PerimeterId): PerimeterConstructionContext {
  return serviceInstance.getContext(perimeterId)
}

export function subscribeToPerimeterContextInvalidations(callback: InvalidationCallback): () => void {
  return serviceInstance.onInvalidation(callback)
}

export function getPerimeterContextsByStorey(storeyId: StoreyId): PerimeterConstructionContext[] {
  const { getPerimetersByStorey } = getModelActions()
  const perimeters = getPerimetersByStorey(storeyId)
  return perimeters.map(p => getPerimeterContextCached(p.id))
}
