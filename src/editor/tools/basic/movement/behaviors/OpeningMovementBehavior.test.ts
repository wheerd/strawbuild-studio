import { describe, expect, it } from 'vitest'

import { setupIntermediateWallsSlice } from '@/building/store/slices/__tests__/testHelpers'
import type { StoreActions } from '@/building/store/types'
import { DEFAULT_INTERIOR_WALL_ASSEMBLY_ID } from '@/config/store/slices/interiorWalls.defaults'
import { dotVec2, newVec2 } from '@/shared/geometry'

import { OpeningMovementBehavior } from './OpeningMovementBehavior'

describe('OpeningMovementBehavior', () => {
  it('moves an opening on an intermediate wall along the wall direction', () => {
    const { state, perimeterData } = setupIntermediateWallsSlice()
    const { perimeterId } = perimeterData
    const start = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
    const end = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
    const wall = state.actions.addIntermediateWall(
      perimeterId,
      { nodeId: start.id, axis: 'left' },
      { nodeId: end.id, axis: 'right' },
      120,
      DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
    )
    const opening = state.actions.addWallOpening(wall.id, {
      openingType: 'door',
      centerOffsetFromWallStart: 2000,
      width: 600,
      height: 2100
    })
    const behavior = new OpeningMovementBehavior()
    const store = state.actions as unknown as StoreActions
    const entity = behavior.getEntity(opening.id, [perimeterId, wall.id], store)
    const context = { entityId: opening.id, parentIds: [perimeterId, wall.id], entity, store }

    const movement = behavior.constrainAndSnap(
      {
        startPosition: newVec2(2000, 2500),
        currentPosition: newVec2(2500, 2600),
        delta: newVec2(500, 100)
      },
      context
    )

    expect(movement.newOffset).toBeCloseTo(2000 + dotVec2(newVec2(500, 100), entity.wall.direction), 3)
    expect(behavior.validatePosition(movement, context)).toBe(true)
    expect(behavior.commitMovement(movement, context)).toBe(true)
    expect(state.openings[opening.id].centerOffsetFromWallStart).toBeCloseTo(movement.newOffset, 3)
    expect(state._openingGeometry[opening.id].center[0]).toBeGreaterThan(4000)
  })
})
