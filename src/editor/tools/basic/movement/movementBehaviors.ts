import type { EntityType } from '@/building/model/ids'

import type { MovementBehavior } from './MovementBehavior'
import { FloorAreaMovementBehavior } from './behaviors/FloorAreaMovementBehavior'
import { FloorOpeningMovementBehavior } from './behaviors/FloorOpeningMovementBehavior'
import { OpeningMovementBehavior } from './behaviors/OpeningMovementBehavior'
import { PerimeterCornerMovementBehavior } from './behaviors/PerimeterCornerMovementBehavior'
import { PerimeterMovementBehavior } from './behaviors/PerimeterMovementBehavior'
import { PerimeterWallMovementBehavior } from './behaviors/PerimeterWallMovementBehavior'
import { RoofMovementBehavior } from './behaviors/RoofMovementBehavior'
import { WallPostMovementBehavior } from './behaviors/WallPostMovementBehavior'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MOVEMENT_BEHAVIORS: Record<EntityType, MovementBehavior<any, any> | null> = {
  perimeter: new PerimeterMovementBehavior(),
  'perimeter-wall': new PerimeterWallMovementBehavior(),
  'perimeter-corner': new PerimeterCornerMovementBehavior(),
  opening: new OpeningMovementBehavior(),
  'wall-post': new WallPostMovementBehavior(),
  'floor-area': new FloorAreaMovementBehavior(),
  'floor-opening': new FloorOpeningMovementBehavior(),
  roof: new RoofMovementBehavior()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMovementBehavior(entityType: EntityType): MovementBehavior<any, any> | null {
  return MOVEMENT_BEHAVIORS[entityType] || null
}
