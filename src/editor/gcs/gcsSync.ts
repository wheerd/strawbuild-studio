import type { Constraint, ConstraintInput, Perimeter, PerimeterId, StoreyId } from '@/building/model'
import {
  getModelActions,
  subscribeToConstraints,
  subscribeToModelChanges,
  subscribeToPerimeters
} from '@/building/store'

import { buildingConstraintKey } from './constraintTranslator'
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

    // Subscribe to perimeter record changes (add/remove/update).
    // Must be registered BEFORE the constraint subscription so that
    // GCS geometry (points, lines) exists before constraints reference it.
    subscribeToPerimeters((current, previous) => {
      this.handlePerimeterChange(current, previous)
    })

    // Subscribe to building constraint changes in the model store
    // and propagate them to the GCS store.
    subscribeToConstraints((current, previous) => {
      this.handleConstraintChange(current, previous)
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

  /**
   * Strip the `id` field from a model-store Constraint to produce a ConstraintInput
   * suitable for the GCS store.
   */
  private toInput(constraint: Constraint): ConstraintInput {
    const { id: _id, ...input } = constraint
    return input as ConstraintInput
  }

  private handleConstraintChange(current?: Constraint, previous?: Constraint): void {
    const gcsActions = getGcsActions()

    if (current && !previous) {
      // Constraint added — push to GCS store
      try {
        gcsActions.addBuildingConstraint(this.toInput(current))
      } catch {
        // GCS geometry may not exist yet (e.g. during redo the perimeter subscription
        // hasn't fired yet). This is non-fatal — the perimeter subscription will
        // re-add geometry, and the constraint subscription will fire again for the
        // next change or the constraint is already covered by the perimeter upsert path.
      }
    } else if (!current && previous) {
      // Constraint removed — remove from GCS store
      const key = buildingConstraintKey(this.toInput(previous))
      gcsActions.removeBuildingConstraint(key)
    } else if (current && previous) {
      // Constraint updated — remove old, add new
      const oldKey = buildingConstraintKey(this.toInput(previous))
      gcsActions.removeBuildingConstraint(oldKey)

      try {
        gcsActions.addBuildingConstraint(this.toInput(current))
      } catch {
        // Same reasoning as the "added" case above.
      }
    }
  }
}

// Module-level singleton — subscriptions start at import time.
// The GCS store's add/remove actions only update Zustand state (not the WASM instance),
// so there's no dependency on GCS WASM being loaded.
void new GcsSyncService()
