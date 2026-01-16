import { getModelActions } from '@/building/store'
import type { LengthInputConfig } from '@/editor/services/length-input'
import { activateLengthInput, deactivateLengthInput } from '@/editor/services/length-input'
import { defaultSnappingService } from '@/editor/services/snapping/SnappingService'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { CursorStyle, EditorEvent, ToolImplementation } from '@/editor/tools/system/types'
import { findEditorEntityAt } from '@/editor/utils/editorHitTesting'
import { type Length, type Vec2, ZERO_VEC2, distSqrVec2, normVec2, scaleVec2, subVec2 } from '@/shared/geometry'

import { MoveToolInspector } from './MoveToolInspector'
import { MoveToolOverlay } from './MoveToolOverlay'
import type { MovementBehavior, MovementContext, MovementState, PointerMovementState } from './MovementBehavior'
import { getMovementBehavior } from './movementBehaviors'

interface LastMovementRecord {
  behavior: MovementBehavior<unknown, MovementState>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: MovementContext<any>
  movementDelta: Vec2 // The actual movement delta applied
  originalDirection: Vec2 // Normalized direction for negative distance handling
}

export class MoveTool extends BaseTool implements ToolImplementation {
  readonly id = 'basic.move'
  readonly inspectorComponent = MoveToolInspector

  private static readonly MOVEMENT_THRESHOLD = 3 // pixels

  private toolState: {
    // Phase 1: Pointer down, waiting to see if user will drag
    isWaitingForMovement: boolean
    downPosition: Vec2 | null

    // Phase 2: Actually moving
    isMoving: boolean
    behavior: MovementBehavior<unknown, MovementState> | null
    context: MovementContext<unknown> | null
    pointerState: PointerMovementState | null
    currentMovementState: MovementState | null // Generic state from behavior
    isValid: boolean

    // Last completed movement for length input modification
    lastMovement: LastMovementRecord | null
  } = {
    isWaitingForMovement: false,
    downPosition: null,
    isMoving: false,
    behavior: null,
    context: null,
    pointerState: null,
    currentMovementState: null,
    isValid: true,
    lastMovement: null
  }

  handlePointerDown(event: EditorEvent): boolean {
    const hitResult = findEditorEntityAt(event.originalEvent)
    if (!hitResult) return false

    const behavior = getMovementBehavior(hitResult.entityType)
    if (!behavior) return false

    // Get the entity and create context
    const store = getModelActions()
    const entity = behavior.getEntity(hitResult.entityId, hitResult.parentIds, store)

    // Start waiting for movement - don't begin actual move yet
    this.toolState.isWaitingForMovement = true
    this.toolState.downPosition = event.worldCoordinates
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
      startPosition: event.worldCoordinates,
      currentPosition: event.worldCoordinates,
      delta: ZERO_VEC2
    }

    this.toolState.isValid = true

    return true
  }

  handlePointerMove(event: EditorEvent): boolean {
    if (this.toolState.isWaitingForMovement) {
      // Check if we've moved beyond threshold
      const distance = this.toolState.downPosition
        ? distSqrVec2(event.worldCoordinates, this.toolState.downPosition)
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
      currentPosition: event.worldCoordinates,
      delta: subVec2(event.worldCoordinates, pointerState.startPosition)
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

  handlePointerUp(_event: EditorEvent): boolean {
    if (this.toolState.isWaitingForMovement) {
      // User just clicked without dragging - treat as selection, not movement
      this.resetTransientState()
      return false // Let other tools handle the click
    }

    if (!this.toolState.isMoving) return false

    const { behavior, context, currentMovementState, isValid } = this.toolState
    if (!behavior || !context || !currentMovementState) return false

    // Only commit if position is valid
    if (isValid) {
      behavior.commitMovement(currentMovementState, context)
      this.storeLastMovement()
    }

    this.resetTransientState()

    // Activate length input for modifying the last movement
    if (isValid) {
      this.activateLengthInputForLastMovement()
    }

    return true
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    // Handle escape key to cancel movement
    if (event.key === 'Escape') {
      if (this.toolState.isWaitingForMovement || this.toolState.isMoving) {
        this.resetTransientState()
        return true // Event consumed
      }
    }
    return false
  }

  onActivate(): void {
    // Tool is now ready for use
  }

  onDeactivate(): void {
    this.resetCompleteState()
  }

  private resetTransientState(): void {
    this.toolState.isWaitingForMovement = false
    this.toolState.downPosition = null
    this.toolState.isMoving = false
    this.toolState.behavior = null
    this.toolState.context = null
    this.toolState.pointerState = null
    this.toolState.currentMovementState = null
    this.toolState.isValid = true
    this.triggerRender()
  }

  private resetCompleteState(): void {
    this.resetTransientState()
    this.toolState.lastMovement = null
    deactivateLengthInput()
  }

  private storeLastMovement(): void {
    const { behavior, context, currentMovementState } = this.toolState
    if (!behavior || !context || !currentMovementState) return

    const delta = currentMovementState.movementDelta

    this.toolState.lastMovement = {
      behavior,
      context: { ...context }, // Shallow copy
      movementDelta: delta,
      originalDirection: normVec2(delta) // Store original direction
    }
  }

  private activateLengthInputForLastMovement(): void {
    if (!this.toolState.lastMovement) return

    const config: LengthInputConfig = {
      position: this.calculateEntityScreenPosition(),
      showImmediately: false, // Wait for user typing
      onCommit: (distance: Length) => this.applyLastMovementWithNewDistance(distance),
      onCancel: () => {
        // Keep length input ready for more modifications
      }
    }

    activateLengthInput(config)
  }

  private calculateEntityScreenPosition(): { x: number; y: number } {
    // For now, just return a default position
    // In a real implementation, this would calculate the actual entity screen position
    return { x: 100, y: 100 }
  }

  private applyLastMovementWithNewDistance(distance: Length): boolean {
    const lastMovement = this.toolState.lastMovement
    if (!lastMovement) return false

    const refreshedContext = this.refreshContextFromLast(lastMovement)
    if (!refreshedContext) return false

    const newDelta = scaleVec2(lastMovement.originalDirection, distance)
    const deltaDifference = subVec2(newDelta, lastMovement.movementDelta)

    const success = lastMovement.behavior.applyRelativeMovement(deltaDifference, refreshedContext)

    if (success) {
      lastMovement.movementDelta = newDelta
    }

    return success
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private refreshContextFromLast(lastMovement: LastMovementRecord): MovementContext<any> | null {
    const { behavior, context } = lastMovement

    try {
      // Refresh entity data in case it changed
      return {
        ...context,
        entity: behavior.getEntity(context.entityId, context.parentIds, context.store)
      }
    } catch (error) {
      console.warn('Failed to refresh movement context:', error)
      return null
    }
  }

  // For overlay component to access state
  getToolState() {
    return this.toolState
  }

  getCursor(): CursorStyle {
    if (this.toolState.isMoving) {
      return 'grabbing'
    }
    if (this.toolState.isWaitingForMovement) {
      return 'grab'
    }
    return 'move'
  }

  overlayComponent = MoveToolOverlay
}
