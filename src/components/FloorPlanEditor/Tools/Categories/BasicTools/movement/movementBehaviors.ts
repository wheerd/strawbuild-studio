import type { EntityType } from '@/types/ids'
import type { MovementBehavior } from './MovementBehavior'
import { PerimeterMovementBehavior } from './behaviors/PerimeterMovementBehavior'
import { PerimeterWallMovementBehavior } from './behaviors/PerimeterWallMovementBehavior'
import { PerimeterCornerMovementBehavior } from './behaviors/PerimeterCornerMovementBehavior'
import { OpeningMovementBehavior } from './behaviors/OpeningMovementBehavior'

const MOVEMENT_BEHAVIORS: Record<EntityType, MovementBehavior<any, any> | null> = {
  perimeter: new PerimeterMovementBehavior(),
  'perimeter-wall': new PerimeterWallMovementBehavior(),
  'perimeter-corner': new PerimeterCornerMovementBehavior(),
  opening: new OpeningMovementBehavior(),
  storey: null // Not implemented
}

export function getMovementBehavior(entityType: EntityType): MovementBehavior<any, any> | null {
  return MOVEMENT_BEHAVIORS[entityType] || null
}
