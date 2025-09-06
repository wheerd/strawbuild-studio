import type { MovementBehavior, MovementContext, MovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { Vec2 } from '@/types/geometry'
import React from 'react'

export class OuterCornerMovementBehavior implements MovementBehavior {
  getEntityPosition(_entityId: SelectableId, _parentIds: SelectableId[], _store: StoreActions): Vec2 {
    // TODO: Implement proper entity position calculation for outer corners
    return [0, 0]
  }

  constrainAndSnap(movementState: MovementState, _context: MovementContext): MovementState {
    // TODO: Implement outer corner movement with snapping
    return {
      ...movementState,
      finalEntityPosition: movementState.initialEntityPosition,
      snapResult: null,
      isValidPosition: false
    }
  }

  validatePosition(_movementState: MovementState, _context: MovementContext): boolean {
    // TODO: Implement validation for outer corner movement
    return false
  }

  generatePreview(_movementState: MovementState, _context: MovementContext): React.ReactNode[] {
    // TODO: Implement preview for outer corner movement
    return []
  }

  commitMovement(_movementState: MovementState, _context: MovementContext): boolean {
    // TODO: Implement commit for outer corner movement
    return false
  }
}
