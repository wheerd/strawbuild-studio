import type { Perimeter, PerimeterId, StoreyId } from '@/building/model'
import { getModelActions, subscribeToModelChanges, subscribeToPerimeters } from '@/building/store'

import { getGcsActions, getGcsState } from './store'

class GcsSyncService {
  private activeStoreyId: StoreyId

  constructor() {
    this.activeStoreyId = getModelActions().getActiveStoreyId()
    this.setupSubscriptions()
  }

  private setupSubscriptions(): void {
    // Subscribe to active storey changes
    subscribeToModelChanges(
      s => s.activeStoreyId,
      (newStoreyId, _oldStoreyId) => {
        this.handleActiveStoreyChange(newStoreyId)
      }
    )

    // Subscribe to perimeter record changes (add/remove/update)
    subscribeToPerimeters((current, previous) => {
      this.handlePerimeterChange(current, previous)
    })
  }

  private handleActiveStoreyChange(newStoreyId: StoreyId): void {
    this.activeStoreyId = newStoreyId

    const gcsActions = getGcsActions()
    const { perimeterRegistry } = getGcsState()

    // Remove all currently tracked perimeters
    for (const perimeterId of Object.keys(perimeterRegistry) as PerimeterId[]) {
      gcsActions.removePerimeterGeometry(perimeterId)
    }

    // Add all perimeters belonging to the new active storey
    const modelActions = getModelActions()
    const perimeters = modelActions.getPerimetersByStorey(newStoreyId)
    for (const perimeter of perimeters) {
      gcsActions.addPerimeterGeometry(perimeter.id)
    }
  }

  private handlePerimeterChange(current?: Perimeter, previous?: Perimeter): void {
    const perimeterId = current?.id ?? previous?.id
    if (!perimeterId) return

    const gcsActions = getGcsActions()

    if (!current && previous) {
      // Perimeter removed — clean up if it was tracked
      if (perimeterId in getGcsState().perimeterRegistry) {
        gcsActions.removePerimeterGeometry(perimeterId)
      }
    } else if (current && !previous) {
      // Perimeter added — only if it belongs to the active storey
      if (current.storeyId === this.activeStoreyId) {
        gcsActions.addPerimeterGeometry(perimeterId)
      }
    } else if (current && previous) {
      // Perimeter updated (e.g. corner removed → cornerIds/wallIds changed)
      if (current.storeyId === this.activeStoreyId) {
        // addPerimeterGeometry handles upsert (removes old data first)
        gcsActions.addPerimeterGeometry(perimeterId)
      } else if (perimeterId in getGcsState().perimeterRegistry) {
        // Storey changed away from active — remove it
        gcsActions.removePerimeterGeometry(perimeterId)
      }
    }
  }
}

// Module-level singleton — subscriptions start at import time.
// The GCS store's add/remove actions only update Zustand state (not the WASM instance),
// so there's no dependency on GCS WASM being loaded.
void new GcsSyncService()
