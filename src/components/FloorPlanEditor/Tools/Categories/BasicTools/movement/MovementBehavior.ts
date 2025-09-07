import type { SnapResult } from '@/model/store/services/snapping/types'
import type { Vec2 } from '@/types/geometry'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { SnappingService } from '@/model/store/services/snapping/SnappingService'
import type React from 'react'

export interface MovementContext<T> {
  entityId: SelectableId
  parentIds: SelectableId[]
  entity: T
  store: StoreActions
  snappingService: SnappingService
}

export interface MouseMovementState {
  startPosition: Vec2 // Initial mouse position
  currentPosition: Vec2 // Current mouse position
  delta: Vec2 // mouseCurrentPosition - mouseStartPosition
}

export interface MovementState<T> {
  result: T
  snapResult?: SnapResult
  isValid: boolean
}

export interface MovementPreviewComponentProps<TEntity, TState> {
  movementState: TState
  isValid: boolean
  context: MovementContext<TEntity>
}

export interface MovementBehavior<TEntity, TState> {
  // Get the entity's actual position for initialization
  getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): TEntity

  // Called when the movement is started to create an initial state
  initializeState(movementState: MouseMovementState, context: MovementContext<TEntity>): TState

  // Apply constraints and snapping - updates the movement state
  constrainAndSnap(movementState: MouseMovementState, context: MovementContext<TEntity>): TState

  // Validate position using slice logic - behavior constructs geometry, slice validates
  validatePosition(movementState: TState, context: MovementContext<TEntity>): boolean

  // Preview component for rendering movement state
  previewComponent: React.ComponentType<MovementPreviewComponentProps<TEntity, TState>>

  // Generate preview with full state (deprecated - use previewComponent instead)
  generatePreview?(movementState: TState, isValid: boolean, context: MovementContext<TEntity>): React.ReactNode[]

  // Commit movement using slice operations
  commitMovement(movementState: TState, context: MovementContext<TEntity>): boolean
}
