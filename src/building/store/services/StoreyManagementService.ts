import type { ConstraintInput, Storey } from '@/building/model'
import {
  type ConstraintId,
  type NodeId,
  type OpeningId,
  type PerimeterCornerId,
  type PerimeterWallId,
  type StoreyId,
  type WallAssemblyId,
  type WallEntityId,
  type WallId,
  type WallPostId,
  isOpeningId,
  isPerimeterCornerId,
  isPerimeterWallId,
  isWallPostId
} from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import type { StoreActions } from '@/building/store/types'
import { clearSelection } from '@/editor/hooks/useSelectionStore'

export interface DuplicateStoreyOptions {
  copyOpenings?: boolean
  copyWallPosts?: boolean
  copyFloorOpenings?: boolean
  copyConstraints?: boolean
}

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
   * Duplicate a storey along with its perimeters
   * Creates a new storey at the next available level and copies associated data based on options
   */
  duplicateStorey(sourceStoreyId: StoreyId, options: DuplicateStoreyOptions = {}): Storey {
    const sourceStorey = this.actions.getStoreyById(sourceStoreyId)

    if (!sourceStorey) {
      throw new Error('Source storey not found')
    }

    const opts = {
      copyOpenings: true,
      copyWallPosts: true,
      copyFloorOpenings: true,
      copyConstraints: true,
      ...options
    }

    // Create the new storey, copying the floor configuration
    const newStorey = this.actions.addStorey(sourceStorey.floorHeight, sourceStorey.floorAssemblyId)

    // ID maps for remapping constraints
    const wallIdMap = new Map<PerimeterWallId, PerimeterWallId>()
    const cornerIdMap = new Map<PerimeterCornerId, PerimeterCornerId>()
    const openingIdMap = new Map<OpeningId, OpeningId>()
    const wallPostIdMap = new Map<WallPostId, WallPostId>()

    // Duplicate all perimeters from the source storey
    const sourcePerimeters = this.actions.getPerimetersByStorey(sourceStoreyId)
    for (const sourcePerimeter of sourcePerimeters) {
      // Create boundary from the source perimeter reference polygon
      const boundary =
        sourcePerimeter.referenceSide === 'inside' ? sourcePerimeter.innerPolygon : sourcePerimeter.outerPolygon

      const newPerimeter = this.actions.addPerimeter(
        newStorey.id,
        boundary,
        'will be overwritten' as WallAssemblyId,
        42,
        undefined,
        undefined,
        sourcePerimeter.referenceSide
      )

      // Build ID maps for walls and corners
      sourcePerimeter.wallIds.forEach((sourceWallId, wallIndex) => {
        const newWallId = newPerimeter.wallIds[wallIndex]
        wallIdMap.set(sourceWallId, newWallId)

        const sourceWall = this.actions.getPerimeterWallById(sourceWallId)
        this.actions.updatePerimeterWallAssembly(newWallId, sourceWall.wallAssemblyId)
        this.actions.updatePerimeterWallThickness(newWallId, sourceWall.thickness)
        if (sourceWall.baseRingBeamAssemblyId) {
          this.actions.setWallBaseRingBeam(newWallId, sourceWall.baseRingBeamAssemblyId)
        }
        if (sourceWall.topRingBeamAssemblyId) {
          this.actions.setWallTopRingBeam(newWallId, sourceWall.topRingBeamAssemblyId)
        }
      })

      sourcePerimeter.cornerIds.forEach((sourceCornerId, cornerIndex) => {
        const newCornerId = newPerimeter.cornerIds[cornerIndex]
        cornerIdMap.set(sourceCornerId, newCornerId)
      })

      // Copy wall openings if requested
      if (opts.copyOpenings) {
        sourcePerimeter.wallIds.forEach((sourceWallId, wallIndex) => {
          const newWallId = newPerimeter.wallIds[wallIndex]

          const wallOpenings = this.actions.getWallOpeningsById(sourceWallId)
          for (const opening of wallOpenings) {
            const newOpening = this.actions.addWallOpening(newWallId, {
              openingType: opening.openingType,
              centerOffsetFromWallStart: opening.centerOffsetFromWallStart,
              width: opening.width,
              height: opening.height,
              sillHeight: opening.sillHeight,
              openingAssemblyId: opening.openingAssemblyId
            })
            openingIdMap.set(opening.id, newOpening.id)
          }
        })
      }

      // Copy wall posts if requested
      if (opts.copyWallPosts) {
        sourcePerimeter.wallIds.forEach((sourceWallId, wallIndex) => {
          const newWallId = newPerimeter.wallIds[wallIndex]

          const wallPosts = this.actions.getWallPostsById(sourceWallId)
          for (const post of wallPosts) {
            const newPost = this.actions.addWallPost(newWallId, {
              postType: post.postType,
              centerOffsetFromWallStart: post.centerOffsetFromWallStart,
              width: post.width,
              thickness: post.thickness,
              replacesPosts: post.replacesPosts,
              material: post.material,
              infillMaterial: post.infillMaterial
            })
            wallPostIdMap.set(post.id, newPost.id)
          }
        })
      }
    }

    // Copy floor openings if requested
    if (opts.copyFloorOpenings) {
      const sourceFloorOpenings = this.actions.getFloorOpeningsByStorey(sourceStoreyId)
      for (const opening of sourceFloorOpenings) {
        this.actions.addFloorOpening(newStorey.id, opening.area)
      }
    }

    // Copy constraints if requested
    if (opts.copyConstraints) {
      const copiedEntityIds = [
        ...openingIdMap.keys(),
        ...wallPostIdMap.keys(),
        ...wallIdMap.keys(),
        ...cornerIdMap.keys()
      ]

      const copiedConstraints = new Set<ConstraintId>()
      for (const sourceEntityId of copiedEntityIds) {
        const constraints = this.actions.getConstraintsForEntity(sourceEntityId)
        for (const constraint of constraints) {
          if (!copiedConstraints.has(constraint.id)) {
            const newInput = this.remapConstraintInput(constraint, wallIdMap, cornerIdMap, openingIdMap, wallPostIdMap)
            this.actions.addBuildingConstraint(newInput)
            copiedConstraints.add(constraint.id)
          }
        }
      }
    }

    return newStorey
  }

  private remapConstraintInput(
    constraint: ConstraintInput,
    wallIdMap: Map<PerimeterWallId, PerimeterWallId>,
    cornerIdMap: Map<PerimeterCornerId, PerimeterCornerId>,
    openingIdMap: Map<OpeningId, OpeningId>,
    wallPostIdMap: Map<WallPostId, WallPostId>
  ): ConstraintInput {
    const newInput = { ...constraint }

    const mapWallId = (wallId: WallId) => (isPerimeterWallId(wallId) ? wallIdMap.get(wallId) : undefined)
    const mapNodeId = (nodeId: NodeId) => (isPerimeterCornerId(nodeId) ? cornerIdMap.get(nodeId) : undefined)
    const mapEntityId = (entityId: WallEntityId) =>
      isWallPostId(entityId)
        ? wallPostIdMap.get(entityId)
        : isOpeningId(entityId)
          ? openingIdMap.get(entityId)
          : undefined

    if ('wall' in constraint && 'wall' in newInput) {
      newInput.wall = mapWallId(constraint.wall) ?? newInput.wall
    }
    if ('wallA' in constraint && 'wallA' in newInput) {
      newInput.wallA = mapWallId(constraint.wallA) ?? newInput.wallA
    }
    if ('wallB' in constraint && 'wallB' in newInput) {
      newInput.wallB = mapWallId(constraint.wallB) ?? newInput.wallB
    }
    if ('corner' in constraint && 'corner' in newInput) {
      newInput.corner = mapNodeId(constraint.corner) ?? newInput.corner
    }
    if ('entity' in constraint && 'entity' in newInput) {
      newInput.entity = mapEntityId(constraint.entity) ?? newInput.entity
    }
    if ('entityA' in constraint && 'entityA' in newInput) {
      newInput.entityA = mapEntityId(constraint.entityA) ?? newInput.entityA
    }
    if ('entityB' in constraint && 'entityB' in newInput) {
      newInput.entityB = mapEntityId(constraint.entityB) ?? newInput.entityB
    }
    if ('node' in constraint && 'node' in newInput) {
      newInput.node = mapNodeId(constraint.node) ?? newInput.node
    }

    return newInput
  }

  /**
   * Delete a storey and all its associated perimeters
   * Level consistency is maintained automatically by the storey slice
   */
  deleteStorey(storeyId: StoreyId): void {
    // 1. Delete associated perimeters first
    const perimeters = this.actions.getPerimetersByStorey(storeyId)
    perimeters.forEach(p => {
      this.actions.removePerimeter(p.id)
    })

    const floorAreas = this.actions.getFloorAreasByStorey(storeyId)
    floorAreas.forEach(a => {
      this.actions.removeFloorArea(a.id)
    })

    const floorOpenings = this.actions.getFloorOpeningsByStorey(storeyId)
    floorOpenings.forEach(o => {
      this.actions.removeFloorOpening(o.id)
    })

    const roofs = this.actions.getRoofsByStorey(storeyId)
    roofs.forEach(r => {
      this.actions.removeRoof(r.id)
    })

    // 2. Delete the storey
    this.actions.removeStorey(storeyId)

    clearSelection()
  }
}

// Create a default singleton instance with actions
export const defaultStoreyManagementService = new StoreyManagementService(getModelActions())
