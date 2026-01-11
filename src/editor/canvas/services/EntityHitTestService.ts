import type Konva from 'konva'

import type { EntityType, SelectableId } from '@/building/model/ids'
import { type Vec2, newVec2 } from '@/shared/geometry'

import { stageReference } from './StageReference'

export interface EntityHitResult {
  entityId: SelectableId
  entityType: EntityType
  parentIds: SelectableId[] // Complete parent chain from root to immediate parent
  konvaNode: Konva.Node
  stagePoint: Vec2
}

/**
 * Service for entity hit testing using Konva's built-in intersection detection.
 * Provides on-demand entity discovery at specific stage coordinates.
 */
export class EntityHitTestService {
  private stage: Konva.Stage | null = null

  /**
   * Initialize the service with a Konva stage reference.
   */
  initialize(stage: Konva.Stage): void {
    this.stage = stage
  }

  /**
   * Find the topmost entity at the given pointer coordinates.
   * Uses Konva's getIntersection() for precise hit detection.
   *
   * @param pointerCoordinates - Original pointer coordinates (not transformed)
   * @returns EntityHitResult if an entity is found, null otherwise
   */
  findEntityAt(pointerCoordinates: { x: number; y: number }): EntityHitResult | null {
    const stage = this.stage ?? stageReference.getStage()
    if (!stage) {
      return null
    }

    // Use Konva's built-in intersection detection with original pointer coordinates
    const intersectedNode = stage.getIntersection(pointerCoordinates)

    return this.processIntersectedNode(intersectedNode, newVec2(pointerCoordinates.x, pointerCoordinates.y))
  }

  /**
   * Process the intersected node and walk up the tree to find entity attributes.
   */
  private processIntersectedNode(intersectedNode: Konva.Node | null, point: Vec2): EntityHitResult | null {
    if (!intersectedNode) {
      return null
    }

    // Walk up the node tree to find the first node with entity attributes
    let currentNode: Konva.Node | null = intersectedNode
    while (currentNode) {
      const attrs = currentNode.getAttrs()

      // Check if this node has entity identification attributes
      if (attrs.entityId && attrs.entityType) {
        return {
          entityId: attrs.entityId as SelectableId,
          entityType: attrs.entityType as EntityType,
          parentIds: (attrs.parentIds ?? []) as SelectableId[],
          konvaNode: currentNode,
          stagePoint: point
        }
      }

      currentNode = currentNode.getParent()
    }

    return null
  }

  /**
   * Check if the service is properly initialized.
   */
  isInitialized(): boolean {
    return this.stage !== null
  }
}

// Singleton instance for global access
export const entityHitTestService = new EntityHitTestService()
