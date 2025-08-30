import type { Tool, ToolContext, ContextAction, Entity, CanvasEvent } from '../../ToolSystem/types'
import { createLength } from '@/types/geometry'

interface SelectToolState {
  isSelecting: boolean
  selectionStart?: { x: number; y: number }
}

export class SelectTool implements Tool {
  id = 'basic.select'
  name = 'Select'
  icon = '↖'
  cursor = 'default'
  category = 'basic'
  hasInspector = false

  private state: SelectToolState = {
    isSelecting: false
  }

  // Event handlers
  handleMouseDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    const entity = this.getEntityAtPoint(stageCoords, event.context)

    if (entity) {
      // Select the entity
      event.context.selectEntity(this.getEntityId(entity))
      return true
    } else {
      // Start selection rectangle
      this.state.isSelecting = true
      const mouseEvent = event.originalEvent as MouseEvent
      this.state.selectionStart = { x: mouseEvent.clientX, y: mouseEvent.clientY }
      event.context.clearSelection()
      return true
    }
  }

  handleMouseMove(_event: CanvasEvent): boolean {
    if (!this.state.isSelecting || !this.state.selectionStart) return false

    // Update selection rectangle preview
    // This would be handled by the canvas layer
    return true
  }

  handleMouseUp(event: CanvasEvent): boolean {
    if (!this.state.isSelecting || !this.state.selectionStart) return false

    // Complete rectangle selection
    const mouseEvent = event.originalEvent as MouseEvent
    const rect = {
      x: Math.min(this.state.selectionStart.x, mouseEvent.clientX),
      y: Math.min(this.state.selectionStart.y, mouseEvent.clientY),
      width: Math.abs(mouseEvent.clientX - this.state.selectionStart.x),
      height: Math.abs(mouseEvent.clientY - this.state.selectionStart.y)
    }

    const entitiesInRect = this.getEntitiesInRect(rect, event.context)

    // Select all entities in rectangle
    if (entitiesInRect.length > 0) {
      // For now, just select the first entity (multi-select would be implemented later)
      event.context.selectEntity(this.getEntityId(entitiesInRect[0]))
    }

    this.state.isSelecting = false
    this.state.selectionStart = undefined
    return true
  }

  handleKeyDown(event: CanvasEvent): boolean {
    const keyEvent = event.originalEvent as KeyboardEvent
    // Handle keyboard shortcuts
    if (keyEvent.key === 'Delete' || keyEvent.key === 'Backspace') {
      const selectedId = event.context.getSelectedEntityId()
      if (selectedId) {
        // Delete selected entity (would be implemented in context)
        event.context.clearSelection()
        return true
      }
    }

    if (keyEvent.key === 'Escape') {
      event.context.clearSelection()
      this.cancelSelection()
      return true
    }

    return false
  }

  // Lifecycle methods
  onActivate(): void {
    this.state.isSelecting = false
    this.state.selectionStart = undefined
  }

  onDeactivate(): void {
    this.cancelSelection()
  }

  // Context actions
  getContextActions(selectedEntity?: Entity): ContextAction[] {
    const actions: ContextAction[] = []

    if (selectedEntity) {
      actions.push({
        label: `Delete ${this.getEntityType(selectedEntity)}`,
        action: () => {
          // Delete action would be implemented
        },
        hotkey: 'Delete'
      })

      actions.push({
        label: 'Properties',
        action: () => {
          // Open properties panel or focus on it
        },
        hotkey: 'P'
      })
    }

    actions.push({
      label: 'Select All',
      action: () => {
        // Select all entities on current floor
      },
      hotkey: 'Ctrl+A'
    })

    return actions
  }

  // Helper methods
  private getEntityAtPoint(point: { x: number; y: number }, context: ToolContext, tolerance = 10): Entity | null {
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

  private getEntitiesInRect(
    rect: { x: number; y: number; width: number; height: number },
    context: ToolContext
  ): Entity[] {
    const modelStore = context.getModelStore()
    const activeFloorId = context.getActiveFloorId()
    const viewport = context.getViewport()
    const entities: Entity[] = []

    const stageRect = {
      x: (rect.x - viewport.panX) / viewport.zoom,
      y: (rect.y - viewport.panY) / viewport.zoom,
      width: rect.width / viewport.zoom,
      height: rect.height / viewport.zoom
    }

    // Check points
    for (const point of modelStore.points.values()) {
      if (
        point.floorId === activeFloorId &&
        point.position.x >= stageRect.x &&
        point.position.x <= stageRect.x + stageRect.width &&
        point.position.y >= stageRect.y &&
        point.position.y <= stageRect.y + stageRect.height
      ) {
        entities.push(point as Entity)
      }
    }

    return entities
  }

  private cancelSelection(): void {
    this.state.isSelecting = false
    this.state.selectionStart = undefined
  }

  private getEntityId(entity: Entity): string {
    // All entities should have an id, but Corner uses pointId
    if ('id' in entity) {
      return entity.id
    } else if ('pointId' in entity) {
      return entity.pointId
    }
    throw new Error('Entity has no id')
  }

  private getEntityType(entity: Entity): string {
    if ('id' in entity && entity.id.includes('wall_')) return 'Wall'
    if ('id' in entity && entity.id.includes('room_')) return 'Room'
    if ('id' in entity && entity.id.includes('point_')) return 'Point'
    if ('pointId' in entity) return 'Corner'
    return 'Entity'
  }
}
