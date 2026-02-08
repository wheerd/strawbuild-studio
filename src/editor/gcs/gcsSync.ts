import type { Constraint, ConstraintInput, Perimeter, PerimeterCorner, PerimeterId, StoreyId } from '@/building/model'
import type { PerimeterCornerId, PerimeterWallId } from '@/building/model/ids'
import {
  getModelActions,
  subscribeToConstraints,
  subscribeToCorners,
  subscribeToModelChanges,
  subscribeToPerimeters
} from '@/building/store'
import { scaleAddVec2 } from '@/shared/geometry'

import {
  buildingConstraintKey,
  getReferencedCornerIds,
  getReferencedWallIds,
  nodeNonRefSidePointForNextWall,
  nodeNonRefSidePointForPrevWall,
  nodeRefSidePointId
} from './constraintTranslator'
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

    // Subscribe to corner data changes (e.g. referencePoint updates from boundary moves).
    // This catches position changes that don't alter the Perimeter record itself.
    subscribeToCorners((current, previous) => {
      this.handleCornerChange(current, previous)
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
      this.syncConstraintsForPerimeter(perimeter.id)
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
        this.syncConstraintsForPerimeter(perimeterId)
      }
    } else if (current && previous) {
      // Perimeter updated (e.g. corner removed → cornerIds/wallIds changed)
      if (current.storeyId === this.activeStoreyId) {
        // addPerimeterGeometry handles upsert (removes old data first)
        gcsActions.addPerimeterGeometry(perimeterId)
        this.syncConstraintsForPerimeter(perimeterId)
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

  /**
   * After addPerimeterGeometry creates/recreates GCS points and lines for a perimeter,
   * ensure all building constraints from the model store that reference this perimeter's
   * entities are present in the GCS store. This handles cases where the constraint
   * subscription fires before geometry exists (e.g. during redo) or where an upsert
   * rebuilds geometry that existing translated constraints reference.
   *
   * The GCS store's addBuildingConstraint has a duplicate check, so re-adding
   * constraints that are already present is harmless (logs a warning and returns).
   */
  private syncConstraintsForPerimeter(perimeterId: PerimeterId): void {
    const modelActions = getModelActions()
    const gcsActions = getGcsActions()

    // Collect the set of corner and wall IDs belonging to this perimeter
    const perimeter = modelActions.getPerimeterById(perimeterId)
    const perimeterCornerIds = new Set<PerimeterCornerId>(perimeter.cornerIds)
    const perimeterWallIds = new Set<PerimeterWallId>(perimeter.wallIds)

    // Find all model-store constraints that reference any of these entities
    const allConstraints = modelActions.getAllBuildingConstraints()
    for (const constraint of Object.values(allConstraints)) {
      const referencedCorners = getReferencedCornerIds(this.toInput(constraint))
      const referencedWalls = getReferencedWallIds(this.toInput(constraint))

      const referencesPerimeter =
        referencedCorners.some(c => perimeterCornerIds.has(c)) || referencedWalls.some(w => perimeterWallIds.has(w))

      if (referencesPerimeter) {
        try {
          gcsActions.addBuildingConstraint(this.toInput(constraint))
        } catch (e) {
          // This can happen if the constraint references entities from multiple
          // perimeters and the other perimeter's geometry doesn't exist yet.
          // It will be synced when that other perimeter's geometry is created.
          console.warn(`Failed to sync building constraint to GCS store:`, e)
        }
      }
    }
  }

  private handleConstraintChange(current?: Constraint, previous?: Constraint): void {
    const gcsActions = getGcsActions()

    if (current && !previous) {
      // Constraint added — push to GCS store.
      // If geometry doesn't exist yet (e.g. during redo), syncConstraintsForPerimeter
      // will handle it when the perimeter subscription fires.
      try {
        gcsActions.addBuildingConstraint(this.toInput(current))
      } catch (e) {
        console.warn(`Failed to add building constraint to GCS store (will be synced by perimeter):`, e)
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
      } catch (e) {
        console.warn(`Failed to add updated building constraint to GCS store (will be synced by perimeter):`, e)
      }
    }
  }

  private handleCornerChange(current?: PerimeterCorner, previous?: PerimeterCorner): void {
    // Only handle updates — additions/removals are covered by the perimeter subscription
    // (which fires when cornerIds changes on the Perimeter record).
    if (!current || !previous) return

    const cornerId = current.id
    const perimeterId = current.perimeterId
    const { perimeterRegistry } = getGcsState()
    const { getPerimeterCornerById, getPerimeterById, getPerimeterWallById } = getModelActions()
    const { updatePointPosition } = getGcsActions()

    // Only update if this corner's perimeter is currently tracked
    if (!(perimeterId in perimeterRegistry)) return

    // Read the fresh computed geometry (insidePoint/outsidePoint derived from referencePoint)
    const corner = getPerimeterCornerById(cornerId)
    const perimeter = getPerimeterById(corner.perimeterId)

    const refPointId = nodeRefSidePointId(corner.id)
    const nonRefPrevId = nodeNonRefSidePointForPrevWall(corner.id)
    const nonRefNextId = nodeNonRefSidePointForNextWall(corner.id)

    const isRefInside = perimeter.referenceSide === 'inside'
    const refPos = isRefInside ? corner.insidePoint : corner.outsidePoint
    const nonRefPos = isRefInside ? corner.outsidePoint : corner.insidePoint

    updatePointPosition(refPointId, refPos[0], refPos[1])

    if (corner.interiorAngle !== 180) {
      updatePointPosition(nonRefPrevId, nonRefPos[0], nonRefPos[1])
      updatePointPosition(nonRefNextId, nonRefPos[0], nonRefPos[1])
    } else {
      const prevWall = getPerimeterWallById(corner.previousWallId)
      const nextWall = getPerimeterWallById(corner.nextWallId)

      const prevPos = scaleAddVec2(
        refPos,
        prevWall.outsideDirection,
        isRefInside ? prevWall.thickness : -prevWall.thickness
      )
      updatePointPosition(nonRefPrevId, prevPos[0], prevPos[1])

      const nextPos = scaleAddVec2(
        refPos,
        nextWall.outsideDirection,
        isRefInside ? nextWall.thickness : -nextWall.thickness
      )
      updatePointPosition(nonRefNextId, nextPos[0], nextPos[1])
    }
  }
}

// Module-level singleton — subscriptions start at import time.
// The GCS store's add/remove actions only update Zustand state (not the WASM instance),
// so there's no dependency on GCS WASM being loaded.
void new GcsSyncService()
