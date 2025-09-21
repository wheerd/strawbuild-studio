import type { Storey } from '@/types/model'
import { createStoreyLevel } from '@/types/model'
import type { StoreyId } from '@/types/ids'
import { useModelStore } from '@/model/store'
import type { Store } from '@/model/store/types'

/**
 * Service for managing storeys with cross-slice orchestration
 * Handles complex operations that involve both storeys and perimeters
 */
export class StoreyManagementService {
  private store: Store

  constructor(store: Store) {
    this.store = store
  }

  /**
   * Move a storey up (towards higher levels)
   * - If storey is not the highest: swap with storey above
   * - If storey is highest: increase all levels by +1 (with constraint validation)
   */
  moveStoreyUp(storeyId: StoreyId): void {
    const storeys = this.store.getStoreysOrderedByLevel()
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
      this.store.adjustAllLevels(1)
    } else {
      // Find floor above and swap
      const currentIndex = storeys.findIndex(s => s.id === storeyId)
      const floorAbove = storeys[currentIndex + 1]
      this.store.swapStoreyLevels(storeyId, floorAbove.id)
    }
  }

  /**
   * Move a storey down (towards lower levels)
   * - If storey is not the lowest: swap with storey below
   * - If storey is lowest: decrease all levels by -1 (with constraint validation)
   */
  moveStoreyDown(storeyId: StoreyId): void {
    const storeys = this.store.getStoreysOrderedByLevel()
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
      this.store.adjustAllLevels(-1)
    } else {
      // Find floor below and swap
      const currentIndex = storeys.findIndex(s => s.id === storeyId)
      const floorBelow = storeys[currentIndex - 1]
      this.store.swapStoreyLevels(storeyId, floorBelow.id)
    }
  }

  /**
   * Duplicate a storey along with all its perimeters
   * Creates a new storey at the next available level and copies all associated perimeters
   */
  duplicateStorey(sourceStoreyId: StoreyId, newName?: string): Storey {
    const sourceStorey = this.store.getStoreyById(sourceStoreyId)

    if (!sourceStorey) {
      throw new Error('Source storey not found')
    }

    // Find the next available level (max + 1)
    const storeys = this.store.getStoreysOrderedByLevel()
    const maxLevel = storeys[storeys.length - 1].level
    const newLevel = createStoreyLevel(maxLevel + 1)

    const duplicateName = newName ?? `${sourceStorey.name} Copy`

    // Create the new storey
    const newStorey = this.store.addStorey(duplicateName, newLevel, sourceStorey.height)

    // Duplicate all perimeters from the source storey
    const sourcePerimeters = this.store.getPerimetersByStorey(sourceStoreyId)
    for (const sourcePerimeter of sourcePerimeters) {
      // Create boundary from the source perimeter corners
      const boundary = { points: sourcePerimeter.corners.map(c => c.insidePoint) }

      // Get the construction method from the first wall (they should all be the same for a perimeter)
      const constructionMethodId = sourcePerimeter.walls[0]?.constructionMethodId

      // Get the thickness from the first wall (we'll use uniform thickness)
      const thickness = sourcePerimeter.walls[0]?.thickness

      if (constructionMethodId && thickness) {
        // Add the duplicated perimeter to the new storey
        this.store.addPerimeter(
          newStorey.id,
          boundary,
          constructionMethodId,
          thickness,
          sourcePerimeter.baseRingBeamMethodId,
          sourcePerimeter.topRingBeamMethodId
        )
      }
    }

    return newStorey
  }

  /**
   * Delete a storey and all its associated perimeters
   * Also compacts the remaining storey levels to eliminate gaps
   */
  deleteStorey(storeyId: StoreyId): void {
    // 1. Delete associated perimeters first
    const perimeters = this.store.getPerimetersByStorey(storeyId)
    perimeters.forEach(p => this.store.removePerimeter(p.id))

    // 2. Delete the storey
    this.store.removeStorey(storeyId)

    // 3. Compact levels to eliminate gaps
    this.store.compactStoreyLevels()
  }
}

// Create a default singleton instance with the store
export const defaultStoreyManagementService = new StoreyManagementService(useModelStore.getState())
