import { describe, expect, it } from 'vitest'

import { type Vec2, newVec2 } from '@/shared/geometry'

import type { InnerWallNodeWithGeometry } from './rooms'
import { getInnerWallConstructionOptions } from './wallNodeConstruction'

function makeNode(incidents: { id: string; direction: Vec2 }[]): InnerWallNodeWithGeometry {
  return {
    id: 'wallnode_test' as never,
    perimeterId: 'perimeter_test' as never,
    type: 'inner',
    position: [0, 0] as never,
    connectedWallIds: incidents.map(incident => incident.id as never),
    center: [0, 0] as never,
    incidentWalls: incidents.map(incident => ({
      id: incident.id as never,
      direction: incident.direction,
      leftPoint: [0, 0] as never,
      rightPoint: [0, 0] as never,
      side: 'start'
    }))
  }
}

describe('getInnerWallConstructionOptions', () => {
  it('deduplicates a colinear pair while retaining the individual choices', () => {
    const options = getInnerWallConstructionOptions(
      makeNode([
        { id: 'wall_a', direction: newVec2(1, 0) },
        { id: 'wall_b', direction: newVec2(-1, 0) },
        { id: 'wall_c', direction: newVec2(0, 1) }
      ])
    )

    expect(options).toEqual([
      { constructedBy: 'wall_a' },
      { constructedBy: 'wall_a', constructedWithColinear: 'wall_b' },
      { constructedBy: 'wall_b' },
      { constructedBy: 'wall_c' }
    ])
  })

  it('includes one option for each colinear pair at a cross junction', () => {
    const options = getInnerWallConstructionOptions(
      makeNode([
        { id: 'wall_a', direction: newVec2(1, 0) },
        { id: 'wall_b', direction: newVec2(-1, 0) },
        { id: 'wall_c', direction: newVec2(0, 1) },
        { id: 'wall_d', direction: newVec2(0, -1) }
      ])
    )

    expect(options).toHaveLength(6)
    expect(options.filter(option => option.constructedWithColinear)).toEqual([
      { constructedBy: 'wall_a', constructedWithColinear: 'wall_b' },
      { constructedBy: 'wall_c', constructedWithColinear: 'wall_d' }
    ])
  })
})
