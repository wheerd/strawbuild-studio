import type { PerimeterId } from '@/building/model/ids'
import { getModelActions, subscribeToFloorOpenings, subscribeToPerimeters, subscribeToWalls } from '@/building/store'
import { computePerimeterConstructionContext } from '@/construction/perimeters/context'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'

export class PerimeterContextCacheService {
  private readonly entries: Map<PerimeterId, PerimeterConstructionContext>

  constructor() {
    this.entries = new Map()
    this.setupSubscriptions()
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

  private setupSubscriptions(): void {
    const { getPerimeterWallById, getPerimetersByStorey } = getModelActions()

    subscribeToPerimeters((current, previous) => {
      const perimeterId = current?.id ?? previous?.id
      if (perimeterId) {
        this.entries.delete(perimeterId)
      }
    })

    subscribeToWalls((current, previous) => {
      const wallId = current?.id ?? previous?.id
      if (wallId) {
        const wall = getPerimeterWallById(wallId)
        this.entries.delete(wall.perimeterId)
      }
    })

    subscribeToFloorOpenings((current, previous) => {
      const storeyId = current?.storeyId ?? previous?.storeyId
      if (storeyId) {
        const perimeters = getPerimetersByStorey(storeyId)
        perimeters.forEach(p => {
          this.entries.delete(p.id)
        })
      }
    })
  }
}

const serviceInstance = new PerimeterContextCacheService()

export function getPerimeterContextCached(perimeterId: PerimeterId): PerimeterConstructionContext {
  return serviceInstance.getContext(perimeterId)
}
