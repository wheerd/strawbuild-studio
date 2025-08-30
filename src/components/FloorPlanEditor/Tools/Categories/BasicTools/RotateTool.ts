import type { EntityId } from '@/types/ids'
import type { Tool, ToolContext, ContextAction, Entity, CanvasEvent } from '../../ToolSystem/types'
import type { Point2D } from '@/types/geometry'
import { createLength } from '@/types/geometry'

export interface RotateToolState {
  rotationStep: number // degrees
  rotationCenter: 'center' | 'custom'
  customCenter?: Point2D
  isRotating: boolean
  rotateEntity?: Entity
  startAngle?: number
}

export class RotateTool implements Tool {
  id = 'basic.rotate'
  name = 'Rotate'
  icon = '↻'
  cursor = 'grab'
  category = 'basic'
  hasInspector = true
  // inspectorComponent would be imported and set here

  public state: RotateToolState = {
    rotationStep: 15, // 15 degree increments by default
    rotationCenter: 'center',
    isRotating: false
  }

  // Event handlers
  handleMouseDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    const entity = this.getEntityAtPoint(stageCoords, event.context)

    if (entity && this.canRotate(entity)) {
      this.state.isRotating = true
      this.state.rotateEntity = entity

      // Calculate start angle from center
      const center = this.getRotationCenter(entity)
      if (center) {
        this.state.startAngle = Math.atan2(stageCoords.y - center.y, stageCoords.x - center.x)
      }

      // Select the entity being rotated
      event.context.selectEntity(this.getEntityId(entity))
      return true
    }

    return false
  }

  handleMouseMove(event: CanvasEvent): boolean {
    if (!this.state.isRotating || !this.state.rotateEntity || this.state.startAngle === undefined) {
      return false
    }

    const stageCoords = event.stageCoordinates
    const center = this.getRotationCenter(this.state.rotateEntity)

    if (center) {
      // Calculate current angle
      const currentAngle = Math.atan2(stageCoords.y - center.y, stageCoords.x - center.x)

      // Calculate rotation delta
      const deltaAngle = currentAngle - this.state.startAngle

      // Snap to rotation step
      const steps = Math.round((deltaAngle * 180) / Math.PI / this.state.rotationStep)
      const snappedAngle = (steps * this.state.rotationStep * Math.PI) / 180

      // Apply rotation (this would need to be implemented in the model)
      this.previewRotation(this.state.rotateEntity, center, snappedAngle)

      return true
    }

    return false
  }

  handleMouseUp(_event: CanvasEvent): boolean {
    if (!this.state.isRotating) return false

    // Apply the final rotation
    if (this.state.rotateEntity) {
      this.applyRotation(this.state.rotateEntity)
    }

    // Reset state
    this.state.isRotating = false
    this.state.rotateEntity = undefined
    this.state.startAngle = undefined

    return true
  }

  handleKeyDown(event: CanvasEvent): boolean {
    const keyEvent = event.originalEvent as KeyboardEvent
    // Cancel rotation with Escape
    if (keyEvent.key === 'Escape' && this.state.isRotating) {
      this.cancelRotation()
      return true
    }

    // Quick rotation with keyboard
    const selectedId = event.context.getSelectedEntityId()
    if (selectedId) {
      let handled = false

      if (keyEvent.key === 'r' || keyEvent.key === 'R') {
        const angle = keyEvent.shiftKey ? -90 : 90
        this.quickRotate(selectedId, angle)
        handled = true
      }

      return handled
    }

    return false
  }

  // Lifecycle methods
  onActivate(): void {
    this.state.isRotating = false
    this.state.rotateEntity = undefined
    this.state.startAngle = undefined
  }

  onDeactivate(): void {
    if (this.state.isRotating) {
      this.cancelRotation()
    }
  }

  // Context actions
  getContextActions(selectedEntity?: Entity): ContextAction[] {
    const actions: ContextAction[] = []

    if (selectedEntity && this.canRotate(selectedEntity)) {
      actions.push({
        label: 'Rotate 90°',
        action: () => this.rotateEntity(selectedEntity, 90),
        hotkey: 'R'
      })

      actions.push({
        label: 'Rotate -90°',
        action: () => this.rotateEntity(selectedEntity, -90),
        hotkey: 'Shift+R'
      })

      actions.push({
        label: `Rotate ${this.state.rotationStep}°`,
        action: () => this.rotateEntity(selectedEntity, this.state.rotationStep)
      })

      actions.push({
        label: 'Set Rotation Center',
        action: () => this.setCustomRotationCenter(selectedEntity),
        enabled: () => this.state.rotationCenter === 'custom'
      })
    }

    return actions
  }

  // Tool-specific methods
  rotateEntity(entity: Entity, degrees: number): void {
    const center = this.getRotationCenter(entity)
    if (center) {
      const radians = (degrees * Math.PI) / 180
      this.applyRotationWithAngle(entity, center, radians)
    }
  }

  setRotationStep(step: number): void {
    this.state.rotationStep = Math.max(1, Math.min(180, step))
  }

  setRotationCenter(mode: 'center' | 'custom', customPoint?: Point2D): void {
    this.state.rotationCenter = mode
    if (mode === 'custom' && customPoint) {
      this.state.customCenter = customPoint
    }
  }

  // Helper methods
  private getEntityAtPoint(point: Point2D, context: ToolContext, tolerance = 10): Entity | null {
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

  private canRotate(entity: Entity): boolean {
    // Only certain entities can be rotated
    if ('id' in entity) {
      return entity.id.includes('wall_') || entity.id.includes('room_')
    }
    return false
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

  private getRotationCenter(entity: Entity): Point2D | null {
    if (this.state.rotationCenter === 'custom' && this.state.customCenter) {
      return this.state.customCenter
    }

    // Calculate entity center
    if ('position' in entity) {
      return entity.position
    }

    // For walls, rooms, etc., calculate geometric center
    // This would need to be implemented based on entity type
    return null
  }

  private previewRotation(entity: Entity, center: Point2D, angle: number): void {
    // Show rotation preview (visual feedback)
    // This would be implemented in the rendering layer
    console.log(`Previewing rotation of ${this.getEntityId(entity)} by ${(angle * 180) / Math.PI}° around`, center)
  }

  private applyRotation(entity: Entity): void {
    // Apply the final rotation to the entity in the model
    // This would be implemented by calling the model store
    console.log(`Applying rotation to ${this.getEntityId(entity)}`)
  }

  private applyRotationWithAngle(entity: Entity, center: Point2D, angle: number): void {
    // Apply specific rotation angle
    // This would be implemented by calling the model store
    console.log(`Rotating ${this.getEntityId(entity)} by ${(angle * 180) / Math.PI}° around`, center)
  }

  private cancelRotation(): void {
    // Cancel current rotation and restore original position
    if (this.state.rotateEntity) {
      console.log(`Cancelling rotation of ${this.getEntityId(this.state.rotateEntity)}`)
    }

    this.state.isRotating = false
    this.state.rotateEntity = undefined
    this.state.startAngle = undefined
  }

  private quickRotate(entityId: EntityId, degrees: number): void {
    // Quick rotation for selected entity
    console.log(`Quick rotating entity ${entityId} by ${degrees}°`)
  }

  private setCustomRotationCenter(entity: Entity): void {
    // Set custom rotation center (would open a dialog or enable click-to-set mode)
    console.log(`Setting custom rotation center for ${this.getEntityId(entity)}`)
  }
}
