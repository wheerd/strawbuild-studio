import type { MovementBehavior, MovementContext, MovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { Vec2 } from '@/types/geometry'
import React from 'react'

export class WallSegmentMovementBehavior implements MovementBehavior {
  getEntityPosition(_entityId: SelectableId, _parentIds: SelectableId[], _store: StoreActions): Vec2 {
    // TODO: Implement proper entity position calculation for wall segments
    return [0, 0]
  }

  constrainAndSnap(movementState: MovementState, _context: MovementContext): MovementState {
    // TODO: Implement wall segment movement with perpendicular constraint
    return {
      ...movementState,
      finalEntityPosition: movementState.initialEntityPosition,
      snapResult: null,
      isValidPosition: false
    }
  }

  validatePosition(_movementState: MovementState, _context: MovementContext): boolean {
    // TODO: Implement validation for wall segment movement
    return false
  }

  generatePreview(_movementState: MovementState, _context: MovementContext): React.ReactNode[] {
    // TODO: Implement preview for wall segment movement
    return []
  }

  commitMovement(_movementState: MovementState, _context: MovementContext): boolean {
    // TODO: Implement commit for wall segment movement
    return false
  }
}
