import type { EntityType, SelectableId } from '@/building/model/ids'
import { type Vec2, newVec2 } from '@/shared/geometry'

import { findSvgEntityAt } from './svgHitTesting'

export interface EntityHitResult {
  entityId: SelectableId
  entityType: EntityType
  parentIds: SelectableId[] // Complete parent chain from root to immediate parent
  svgElement?: SVGElement // SVG element for the entity
  stagePoint: Vec2
  clientPoint: { x: number; y: number }
}

/**
 * Service for entity hit testing using DOM-based intersection detection.
 * Provides on-demand entity discovery at specific client coordinates.
 */
export class EntityHitTestService {
  /**
   * Find the topmost entity at the given client coordinates.
   * Uses document.elementsFromPoint() for DOM-based hit detection.
   *
   * @param clientX - Client X coordinate (screen space)
   * @param clientY - Client Y coordinate (screen space)
   * @returns EntityHitResult if an entity is found, null otherwise
   */
  findEntityAt(clientX: number, clientY: number): EntityHitResult | null {
    const result = findSvgEntityAt(clientX, clientY)

    if (!result) {
      return null
    }

    return {
      entityId: result.entityId,
      entityType: result.entityType,
      parentIds: result.parentIds,
      svgElement: result.svgElement,
      stagePoint: newVec2(result.clientPoint.x, result.clientPoint.y),
      clientPoint: result.clientPoint
    }
  }

  /**
   * Backward compatibility method - converts pointer coordinates to client coordinates
   * @deprecated Use findEntityAt with client coordinates instead
   */
  findEntityAtPointer(pointerCoordinates: { x: number; y: number }): EntityHitResult | null {
    // For backward compatibility, assume pointer coordinates are client coordinates
    return this.findEntityAt(pointerCoordinates.x, pointerCoordinates.y)
  }

  /**
   * Check if the service is properly initialized.
   * @deprecated No longer needed for SVG-based implementation
   */
  isInitialized(): boolean {
    return true
  }

  /**
   * Initialize the service (no-op for SVG implementation)
   * @deprecated No longer needed for SVG-based implementation
   */
  initialize(): void {
    // No initialization needed for DOM-based hit testing
  }
}

// Singleton instance for global access
export const entityHitTestService = new EntityHitTestService()
