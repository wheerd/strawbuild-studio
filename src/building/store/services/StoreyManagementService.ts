import { vec2 } from 'gl-matrix'

import type { StoreyId } from '@/building/model/ids'
import type { Storey } from '@/building/model/model'
import { getModelActions } from '@/building/store'
import type { StoreActions } from '@/building/store/types'
import { clearSelection } from '@/editor/hooks/useSelectionStore'

/**
 * Service for managing storeys with cross-slice orchestration
 * Handles complex operations that involve both storeys and perimeters
 */
export class StoreyManagementService {
  private actions: StoreActions

  constructor(actions: StoreActions) {
    this.actions = actions
  }

  /**
   * Move a storey up (towards higher levels)
   * - If storey is not the highest: swap with storey above
   * - If storey is highest: increase all levels by +1 (with constraint validation)
   */
  moveStoreyUp(storeyId: StoreyId): void {
    const storeys = this.actions.getStoreysOrderedByLevel()
    const targetStorey = storeys.find(s => s.id === storeyId)
    const lowestStorey = storeys[0]
    const highestStorey = storeys[storeys.length - 1]

    if (!targetStorey || storeys.length === 1) return

    const isHighest = targetStorey.id === highestStorey.id

    if (isHighest) {
      // Moving highest floor up - check constraint
      if (lowestStorey.level === 0) {
        throw new Error('Cannot move floor up: lowest floor would exceed ground level')
      }
      this.actions.adjustAllLevels(1)
    } else {
      // Find floor above and swap
      const floorAbove = this.actions.getStoreyAbove(storeyId)
      if (floorAbove) {
        this.actions.swapStoreyLevels(storeyId, floorAbove.id)
      }
    }
  }

  /**
   * Move a storey down (towards lower levels)
   * - If storey is not the lowest: swap with storey below
   * - If storey is lowest: decrease all levels by -1 (with constraint validation)
   */
  moveStoreyDown(storeyId: StoreyId): void {
    const storeys = this.actions.getStoreysOrderedByLevel()
    const targetStorey = storeys.find(s => s.id === storeyId)
    const lowestStorey = storeys[0]
    const highestStorey = storeys[storeys.length - 1]

    if (!targetStorey || storeys.length === 1) return

    const isLowest = targetStorey.id === lowestStorey.id

    if (isLowest) {
      // Moving lowest floor down - check constraint
      if (highestStorey.level === 0) {
        throw new Error('Cannot move floor down: highest floor would go below ground level')
      }
      this.actions.adjustAllLevels(-1)
    } else {
      // Find floor below and swap
      const currentIndex = storeys.findIndex(s => s.id === storeyId)
      const floorBelow = storeys[currentIndex - 1]
      this.actions.swapStoreyLevels(storeyId, floorBelow.id)
    }
  }

  /**
   * Duplicate a storey along with all its perimeters
   * Creates a new storey at the next available level and copies all associated perimeters
   */
  duplicateStorey(sourceStoreyId: StoreyId, newName?: string): Storey {
    const sourceStorey = this.actions.getStoreyById(sourceStoreyId)

    if (!sourceStorey) {
      throw new Error('Source storey not found')
    }

    const duplicateName = newName ?? `${sourceStorey.name} Copy`

    // Create the new storey, copying the floor configuration
    const newStorey = this.actions.addStorey(duplicateName, sourceStorey.height, sourceStorey.floorAssemblyId)

    // Duplicate all perimeters from the source storey
    const sourcePerimeters = this.actions.getPerimetersByStorey(sourceStoreyId)
    for (const sourcePerimeter of sourcePerimeters) {
      // Create boundary from the source perimeter reference polygon
      const boundary = { points: sourcePerimeter.referencePolygon.map(point => vec2.clone(point)) }

      // Get the assembly from the first wall (they should all be the same for a perimeter)
      const wallAssemblyId = sourcePerimeter.walls[0]?.wallAssemblyId

      // Get the thickness from the first wall (we'll use uniform thickness)
      const thickness = sourcePerimeter.walls[0]?.thickness

      if (wallAssemblyId && thickness) {
        // Add the duplicated perimeter to the new storey
        this.actions.addPerimeter(
          newStorey.id,
          boundary,
          wallAssemblyId,
          thickness,
          sourcePerimeter.baseRingBeamAssemblyId,
          sourcePerimeter.topRingBeamAssemblyId,
          sourcePerimeter.referenceSide
        )
      }
    }

    return newStorey
  }

  /**
   * Delete a storey and all its associated perimeters
   * Level consistency is maintained automatically by the storey slice
   */
  deleteStorey(storeyId: StoreyId): void {
    // 1. Delete associated perimeters first
    const perimeters = this.actions.getPerimetersByStorey(storeyId)
    perimeters.forEach(p => this.actions.removePerimeter(p.id))

    // 2. Delete the storey
    this.actions.removeStorey(storeyId)

    clearSelection()
  }
}

// Create a default singleton instance with actions
export const defaultStoreyManagementService = new StoreyManagementService(getModelActions())
