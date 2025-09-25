import { MoveIcon } from '@radix-ui/react-icons'

import { defaultSnappingService } from '@/editor/services/snapping/SnappingService'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { CanvasEvent, Tool } from '@/editor/tools/system/types'
import type { Vec2 } from '@/shared/geometry'
import { distanceSquared, subtract } from '@/shared/geometry'

import { MoveToolOverlay } from './MoveToolOverlay'
import type { MovementBehavior, MovementContext, PointerMovementState } from './MovementBehavior'
import { getMovementBehavior } from './movementBehaviors'

export class MoveTool extends BaseTool implements Tool {
  id = 'basic.move'
  name = 'Move'
  icon = '↔'
  iconComponent = MoveIcon
  hotkey = 'm'
  cursor = 'move'
  category = 'basic'

  private static readonly MOVEMENT_THRESHOLD = 3 // pixels

  private toolState: {
    // Phase 1: Pointer down, waiting to see if user will drag
    isWaitingForMovement: boolean
    downPosition: Vec2 | null

    // Phase 2: Actually moving
    isMoving: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    behavior: MovementBehavior<any, any> | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context: MovementContext<any> | null
    pointerState: PointerMovementState | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentMovementState: any // Generic state from behavior
    isValid: boolean
  } = {
    isWaitingForMovement: false,
    downPosition: null,
    isMoving: false,
    behavior: null,
    context: null,
    pointerState: null,
    currentMovementState: null,
    isValid: true
  }

  handlePointerDown(event: CanvasEvent): boolean {
    if (!event.pointerCoordinates) {
      console.warn('No pointer coordinates available for movement')
      return false
    }

    const hitResult = event.context.findEntityAt(event.pointerCoordinates)
    if (!hitResult) return false

    const behavior = getMovementBehavior(hitResult.entityType)
    if (!behavior) return false

    // Get the entity and create context
    const store = event.context.getModelStore()
    const entity = behavior.getEntity(hitResult.entityId, hitResult.parentIds, store)

    // Start waiting for movement - don't begin actual move yet
    this.toolState.isWaitingForMovement = true
    this.toolState.downPosition = event.stageCoordinates
    this.toolState.behavior = behavior
    this.toolState.context = {
      entityId: hitResult.entityId,
      parentIds: hitResult.parentIds,
      entity,
      store,
      snappingService: defaultSnappingService
    }

    // Initialize pointer state and movement state
    this.toolState.pointerState = {
      startPosition: event.stageCoordinates,
      currentPosition: event.stageCoordinates,
      delta: [0, 0]
    }

    this.toolState.isValid = true

    return true
  }

  handlePointerMove(event: CanvasEvent): boolean {
    if (this.toolState.isWaitingForMovement) {
      // Check if we've moved beyond threshold
      const distance = this.toolState.downPosition
        ? distanceSquared(event.stageCoordinates, this.toolState.downPosition)
        : 0

      if (distance >= MoveTool.MOVEMENT_THRESHOLD ** 2) {
        // Start actual movement
        this.toolState.isWaitingForMovement = false
        this.toolState.isMoving = true
        this.toolState.downPosition = null

        if (!this.toolState.behavior) {
          console.error('Movement behavior not available')
          return false
        }

        if (!this.toolState.pointerState) {
          console.error('Pointer state not available')
          return false
        }

        if (!this.toolState.context) {
          console.error('Movement context not available')
          return false
        }

        this.toolState.currentMovementState = this.toolState.behavior.initializeState(
          this.toolState.pointerState,
          this.toolState.context
        )

        // Continue with movement logic below
      } else {
        return true // Still waiting, consume event but don't start moving
      }
    }

    if (!this.toolState.isMoving) return false

    const { behavior, context, pointerState } = this.toolState
    if (!behavior || !context || !pointerState) return false

    // Update pointer state with current position and delta
    const updatedPointerState = {
      ...pointerState,
      currentPosition: event.stageCoordinates,
      delta: subtract(event.stageCoordinates, pointerState.startPosition)
    }

    // Apply constraints and snapping to get new movement state
    const newMovementState = behavior.constrainAndSnap(updatedPointerState, context)
    const isValid = behavior.validatePosition(newMovementState, context)

    this.toolState.pointerState = updatedPointerState
    this.toolState.currentMovementState = newMovementState
    this.toolState.isValid = isValid

    this.triggerRender()
    return true
  }

  handlePointerUp(_event: CanvasEvent): boolean {
    if (this.toolState.isWaitingForMovement) {
      // User just clicked without dragging - treat as selection, not movement
      this.resetState()
      return false // Let other tools handle the click
    }

    if (!this.toolState.isMoving) return false

    const { behavior, context, currentMovementState, isValid } = this.toolState
    if (!behavior || !context || !currentMovementState) return false

    // Only commit if position is valid
    if (isValid) {
      behavior.commitMovement(currentMovementState, context)
    }

    this.resetState()
    return true
  }

  handleKeyDown(event: CanvasEvent): boolean {
    // Handle escape key to cancel movement
    if (event.originalEvent instanceof KeyboardEvent && event.originalEvent.key === 'Escape') {
      if (this.toolState.isWaitingForMovement || this.toolState.isMoving) {
        this.resetState()
        return true // Event consumed
      }
    }
    return false
  }

  onActivate(): void {
    // Tool is now ready for use
  }

  onDeactivate(): void {
    this.resetState()
  }

  private resetState(): void {
    this.toolState = {
      isWaitingForMovement: false,
      downPosition: null,
      isMoving: false,
      behavior: null,
      context: null,
      pointerState: null,
      currentMovementState: null,
      isValid: true
    }
    this.triggerRender()
  }

  // For overlay component to access state
  getToolState() {
    return this.toolState
  }

  overlayComponent = MoveToolOverlay
}
