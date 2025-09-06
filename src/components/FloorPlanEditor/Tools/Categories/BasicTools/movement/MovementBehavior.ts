import type { SnapResult } from '@/model/store/services/snapping/types'
import type { Vec2 } from '@/types/geometry'
import type { SelectableId, EntityType } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { SnappingService } from '@/model/store/services/snapping/SnappingService'
import type React from 'react'

export interface MovementContext {
  entityId: SelectableId
  entityType: EntityType
  parentIds: SelectableId[]
  store: StoreActions
  snappingService: SnappingService
}

export interface MovementState {
  // Position data
  initialEntityPosition: Vec2 // Actual initial position of the entity
  mouseStartPosition: Vec2 // Initial mouse position
  mouseCurrentPosition: Vec2 // Current mouse position
  mouseDelta: Vec2 // mouseCurrentPosition - mouseStartPosition
  finalEntityPosition: Vec2 // The final position of the entity after constraints/snapping

  // Movement result
  snapResult: SnapResult | null
  isValidPosition: boolean
}

export interface MovementState {
  snapResult: SnapResult | null
  isValidPosition: boolean
  finalEntityPosition: Vec2 // The final position of the entity after constraints/snapping
}

export interface MovementBehavior {
  // Get the entity's actual position for initialization
  getEntityPosition(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): Vec2

  // Apply constraints and snapping - updates the MovementState with final position
  constrainAndSnap(movementState: MovementState, context: MovementContext): MovementState

  // Validate position using slice logic - behavior constructs geometry, slice validates
  validatePosition(movementState: MovementState, context: MovementContext): boolean

  // Generate preview with full state
  generatePreview(movementState: MovementState, context: MovementContext): React.ReactNode[]

  // Commit movement using slice operations
  commitMovement(movementState: MovementState, context: MovementContext): boolean
}
