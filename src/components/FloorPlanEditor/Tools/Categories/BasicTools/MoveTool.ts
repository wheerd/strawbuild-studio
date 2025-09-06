import type { Tool, ToolContext, ContextAction, CanvasEvent } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import type { Vec2 } from '@/types/geometry'
import type { MovementBehavior, MovementContext, MovementState } from './movement/MovementBehavior'
import { BaseTool } from '@/components/FloorPlanEditor/Tools/ToolSystem/BaseTool'
import { getMovementBehavior } from './movement/movementBehaviors'
import { defaultSnappingService } from '@/model/store/services/snapping/SnappingService'
import { distanceSquared, subtract } from '@/types/geometry'
import { MoveToolOverlay } from './overlays/MoveToolOverlay'

export class MoveTool extends BaseTool implements Tool {
  id = 'basic.move'
  name = 'Move'
  icon = '↔'
  hotkey = 'm'
  cursor = 'move'
  category = 'basic'

  private static readonly MOVEMENT_THRESHOLD = 3 // pixels

  private toolState: {
    // Phase 1: Mouse down, waiting to see if user will drag
    isWaitingForMovement: boolean
    downPosition: Vec2 | null

    // Phase 2: Actually moving
    isMoving: boolean
    behavior: MovementBehavior | null
    context: MovementContext | null
    currentMovementState: MovementState | null
  } = {
    isWaitingForMovement: false,
    downPosition: null,
    isMoving: false,
    behavior: null,
    context: null,
    currentMovementState: null
  }

  handleMouseDown(event: CanvasEvent): boolean {
    const hitResult = event.context.findEntityAt(event.pointerCoordinates!)
    if (!hitResult) return false

    const behavior = getMovementBehavior(hitResult.entityType)
    if (!behavior) return false

    // Get the entity's actual position
    const store = event.context.getModelStore()
    const initialEntityPosition = behavior.getEntityPosition(hitResult.entityId, hitResult.parentIds, store)

    // Start waiting for movement - don't begin actual move yet
    this.toolState.isWaitingForMovement = true
    this.toolState.downPosition = event.stageCoordinates
    this.toolState.behavior = behavior
    this.toolState.context = {
      entityId: hitResult.entityId,
      entityType: hitResult.entityType,
      parentIds: hitResult.parentIds,
      store,
      snappingService: defaultSnappingService
    }

    // Initialize movement state
    this.toolState.currentMovementState = {
      initialEntityPosition,
      mouseStartPosition: event.stageCoordinates,
      mouseCurrentPosition: event.stageCoordinates,
      mouseDelta: [0, 0],
      finalEntityPosition: initialEntityPosition,
      snapResult: null,
      isValidPosition: true
    }

    return true
  }

  handleMouseMove(event: CanvasEvent): boolean {
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

        // Continue with movement logic below
      } else {
        return true // Still waiting, consume event but don't start moving
      }
    }

    if (!this.toolState.isMoving) return false

    const { behavior, context, currentMovementState } = this.toolState
    if (!behavior || !context || !currentMovementState) return false

    // Update movement state with current mouse position and delta
    const updatedMovementState = {
      ...currentMovementState,
      mouseCurrentPosition: event.stageCoordinates,
      mouseDelta: subtract(event.stageCoordinates, currentMovementState.mouseStartPosition)
    }

    // Apply constraints, snapping and validation
    const finalMovementState = behavior.constrainAndSnap(updatedMovementState, context)
    finalMovementState.isValidPosition = behavior.validatePosition(finalMovementState, context)

    this.toolState.currentMovementState = finalMovementState

    this.triggerRender()
    return true
  }

  handleMouseUp(_event: CanvasEvent): boolean {
    if (this.toolState.isWaitingForMovement) {
      // User just clicked without dragging - treat as selection, not movement
      this.resetState()
      return false // Let other tools handle the click
    }

    if (!this.toolState.isMoving) return false

    const { behavior, context, currentMovementState } = this.toolState
    if (!behavior || !context || !currentMovementState) return false

    // Only commit if position is valid
    if (currentMovementState.isValidPosition) {
      behavior.commitMovement(currentMovementState, context)
    }

    this.resetState()
    return true
  }

  handleKeyDown(_event: CanvasEvent): boolean {
    return false
  }

  onActivate(): void {
    // Tool is now ready for use
  }

  onDeactivate(): void {
    this.resetState()
  }

  getContextActions(_context: ToolContext): ContextAction[] {
    return []
  }

  private resetState(): void {
    this.toolState = {
      isWaitingForMovement: false,
      downPosition: null,
      isMoving: false,
      behavior: null,
      context: null,
      currentMovementState: null
    }
    this.triggerRender()
  }

  // For overlay component to access state
  getToolState() {
    return this.toolState
  }

  overlayComponent = MoveToolOverlay
}
