import type { EntityId } from '@/types/ids'
import type { Tool, ToolContext, Entity, CanvasEvent } from '../../ToolSystem/types'
import { createLength, type Vec2 } from '@/types/geometry'

export class SelectTool implements Tool {
  id = 'basic.select'
  name = 'Select'
  icon = '↖'
  hotkey = 'v'
  cursor = 'default'
  category = 'basic'
  hasInspector = false

  // Event handlers
  handleMouseDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    const entity = this.getEntityAtPoint(stageCoords, event.context)

    if (entity) {
      // Select the entity
      event.context.selectEntity(this.getEntityId(entity))
      return true
    } else {
      // Clear selection when clicking empty space
      event.context.clearSelection()
      return true
    }
  }

  handleKeyDown(event: CanvasEvent): boolean {
    const keyEvent = event.originalEvent as KeyboardEvent

    if (keyEvent.key === 'Escape') {
      event.context.clearSelection()
      return true
    }

    // Don't handle Delete/Backspace here - let the KeyboardShortcutManager handle it
    return false
  }

  // Lifecycle methods
  onActivate(): void {
    // Nothing to do for simple selection
  }

  onDeactivate(): void {
    // Nothing to do for simple selection
  }

  // Helper methods
  private getEntityAtPoint(point: Vec2, context: ToolContext, tolerance = 10): Entity | null {
    const modelStore = context.getModelStore()
    const activeFloorId = context.getActiveFloorId()
    const viewport = context.getViewport()

    // Convert tolerance from screen pixels to stage coordinates
    const stageTolerance = tolerance / viewport.zoom

    // Check points first (smallest targets)
    const nearestPoint = modelStore.findNearestPoint(activeFloorId, point, createLength(stageTolerance))
    if (nearestPoint) {
      return nearestPoint as Entity
    }

    // Check walls using the new getWallAtPoint method
    const wall = modelStore.getWallAtPoint(point, activeFloorId)
    if (wall) {
      return wall as Entity
    }

    return null
  }

  private getEntityId(entity: Entity): EntityId {
    // All entities should have an id, but Corner uses pointId
    if ('id' in entity) {
      return entity.id
    } else if ('pointId' in entity) {
      return entity.pointId
    }
    throw new Error('Entity has no id')
  }
}
