import { describe, expect, it } from 'vitest'

import { mockPost, setupIntermediateWallsSlice } from '@/building/store/slices/__tests__/testHelpers'
import type { StoreActions } from '@/building/store/types'
import { DEFAULT_INTERIOR_WALL_ASSEMBLY_ID } from '@/config/store/slices/interiorWalls.defaults'
import { dotVec2, newVec2 } from '@/shared/geometry'

import { WallPostMovementBehavior } from './WallPostMovementBehavior'

describe('WallPostMovementBehavior', () => {
  it('moves a post on an intermediate wall and respects wall bounds', () => {
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
    const post = state.actions.addWallPost(wall.id, mockPost({ centerOffsetFromWallStart: 2000, width: 100 }))
    const behavior = new WallPostMovementBehavior()
    const store = state.actions as unknown as StoreActions
    const entity = behavior.getEntity(post.id, [perimeterId, wall.id], store)
    const context = { entityId: post.id, parentIds: [perimeterId, wall.id], entity, store }

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
    expect(state.wallPosts[post.id].centerOffsetFromWallStart).toBeCloseTo(movement.newOffset, 3)
    expect(state.actions.isWallPostPlacementValid(wall.id, wall.wallLength - 50, 100, post.id)).toBe(true)
    expect(state.actions.isWallPostPlacementValid(wall.id, wall.wallLength + 1, 100, post.id)).toBe(false)
  })
})
