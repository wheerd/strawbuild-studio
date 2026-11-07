import { describe, expect, it } from 'vitest'

import { newVec2 } from '@/shared/geometry'

import type { InnerWallNode } from './rooms'
import { computeNodeGeometry, type WallNodeIncidentLine } from './wallNodeIntersections'

describe('computeNodeGeometry', () => {
  it('uses endpoint intersections without creating a polygon for two non-collinear walls', () => {
    const incidents: WallNodeIncidentLine[] = [
      {
        wallId: 'wall_a' as never,
        left: { point: newVec2(0, -5), direction: newVec2(1, 0) },
        right: { point: newVec2(0, 5), direction: newVec2(1, 0) },
        dir: newVec2(1, 0),
        side: 'start'
      },
      {
        wallId: 'wall_b' as never,
        left: { point: newVec2(0, 0), direction: newVec2(Math.SQRT1_2, Math.SQRT1_2) },
        right: { point: newVec2(0, 10), direction: newVec2(Math.SQRT1_2, Math.SQRT1_2) },
        dir: newVec2(Math.SQRT1_2, Math.SQRT1_2),
        side: 'start'
      }
    ]
    const node = {
      id: 'node' as never,
      type: 'inner',
      position: newVec2(0, 0),
      perimeterId: 'perimeter' as never,
      connectedWallIds: ['wall_a', 'wall_b'] as never
    } satisfies InnerWallNode

    const result = computeNodeGeometry(node, newVec2(0, 0), incidents)

    expect(result.boundary).toBeUndefined()
    expect(result.incidentWalls).toHaveLength(2)
    expect(result.incidentWalls[0].leftPoint).toEqual(newVec2(-15, -5))
    expect(result.incidentWalls[0].rightPoint).toEqual(newVec2(5, 5))
  })
})
