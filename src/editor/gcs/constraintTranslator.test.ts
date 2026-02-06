import { describe, expect, it } from 'vitest'

import type { ConstraintInput, PerimeterCornerId, PerimeterWallId } from '@/building/model'

import {
  buildingConstraintKey,
  getReferencedCornerIds,
  getReferencedWallIds,
  nodeInsidePointId,
  nodeSidePointId,
  translateBuildingConstraint,
  wallInsideLineId
} from './constraintTranslator'

// --- Test IDs ---
const cornerA = 'outcorner_aaa' as PerimeterCornerId
const cornerB = 'outcorner_bbb' as PerimeterCornerId
const cornerC = 'outcorner_ccc' as PerimeterCornerId
const wallA = 'outwall_aaa' as PerimeterWallId
const wallB = 'outwall_bbb' as PerimeterWallId

// --- ID helper tests ---

describe('nodeSidePointId', () => {
  it('maps left to outside', () => {
    expect(nodeSidePointId(cornerA, 'left')).toBe('corner_outcorner_aaa_out')
  })

  it('maps right to inside', () => {
    expect(nodeSidePointId(cornerA, 'right')).toBe('corner_outcorner_aaa_in')
  })
})

describe('nodeInsidePointId', () => {
  it('always returns inside point', () => {
    expect(nodeInsidePointId(cornerA)).toBe('corner_outcorner_aaa_in')
  })
})

describe('wallInsideLineId', () => {
  it('returns inside line ID', () => {
    expect(wallInsideLineId(wallA)).toBe('wall_outwall_aaa_in')
  })
})

// --- Key derivation tests ---

describe('buildingConstraintKey', () => {
  describe('distance', () => {
    it('produces a deterministic key', () => {
      const c: ConstraintInput = { type: 'distance', nodeA: cornerA, nodeB: cornerB, side: 'left', length: 100 }
      expect(buildingConstraintKey(c)).toBe(`distance_${cornerA}_${cornerB}`)
    })

    it('sorts the node pair so order does not matter', () => {
      const c1: ConstraintInput = { type: 'distance', nodeA: cornerA, nodeB: cornerB, side: 'left', length: 100 }
      const c2: ConstraintInput = { type: 'distance', nodeA: cornerB, nodeB: cornerA, side: 'right', length: 200 }
      expect(buildingConstraintKey(c1)).toBe(buildingConstraintKey(c2))
    })

    it('does not include side in the key', () => {
      const c1: ConstraintInput = { type: 'distance', nodeA: cornerA, nodeB: cornerB, side: 'left', length: 100 }
      const c2: ConstraintInput = { type: 'distance', nodeA: cornerA, nodeB: cornerB, side: 'right', length: 100 }
      expect(buildingConstraintKey(c1)).toBe(buildingConstraintKey(c2))
    })
  })

  describe('colinear', () => {
    it('sorts all three nodes', () => {
      const c1: ConstraintInput = {
        type: 'colinear',
        nodeA: cornerC,
        nodeB: cornerA,
        nodeC: cornerB,
        side: 'left'
      }
      const c2: ConstraintInput = {
        type: 'colinear',
        nodeA: cornerA,
        nodeB: cornerB,
        nodeC: cornerC,
        side: 'right'
      }
      expect(buildingConstraintKey(c1)).toBe(buildingConstraintKey(c2))
    })
  })

  describe('parallel / perpendicular share key space', () => {
    it('parallel and perpendicular on the same walls produce the same key', () => {
      const par: ConstraintInput = { type: 'parallel', wallA, wallB }
      const perp: ConstraintInput = { type: 'perpendicular', wallA, wallB }
      expect(buildingConstraintKey(par)).toBe(buildingConstraintKey(perp))
    })

    it('sorts wall pair', () => {
      const c1: ConstraintInput = { type: 'parallel', wallA, wallB }
      const c2: ConstraintInput = { type: 'parallel', wallA: wallB, wallB: wallA }
      expect(buildingConstraintKey(c1)).toBe(buildingConstraintKey(c2))
    })
  })

  describe('horizontal / vertical share key space', () => {
    it('horizontal and vertical on the same nodes produce the same key', () => {
      const h: ConstraintInput = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }
      const v: ConstraintInput = { type: 'vertical', nodeA: cornerA, nodeB: cornerB }
      expect(buildingConstraintKey(h)).toBe(buildingConstraintKey(v))
    })

    it('sorts node pair', () => {
      const h1: ConstraintInput = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }
      const h2: ConstraintInput = { type: 'horizontal', nodeA: cornerB, nodeB: cornerA }
      expect(buildingConstraintKey(h1)).toBe(buildingConstraintKey(h2))
    })
  })

  describe('angle', () => {
    it('sorts all three nodes', () => {
      const c1: ConstraintInput = { type: 'angle', pivot: cornerA, nodeA: cornerB, nodeB: cornerC, angle: 1 }
      const c2: ConstraintInput = { type: 'angle', pivot: cornerC, nodeA: cornerA, nodeB: cornerB, angle: 2 }
      expect(buildingConstraintKey(c1)).toBe(buildingConstraintKey(c2))
    })
  })

  describe('keys are unique across different constraint types', () => {
    it('distance key differs from hv key for same nodes', () => {
      const dist: ConstraintInput = {
        type: 'distance',
        nodeA: cornerA,
        nodeB: cornerB,
        side: 'left',
        length: 100
      }
      const h: ConstraintInput = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }
      expect(buildingConstraintKey(dist)).not.toBe(buildingConstraintKey(h))
    })
  })
})

// --- Translation tests ---

describe('translateBuildingConstraint', () => {
  describe('distance', () => {
    it('translates to p2p_distance on the left (outside) side', () => {
      const c: ConstraintInput = { type: 'distance', nodeA: cornerA, nodeB: cornerB, side: 'left', length: 5000 }
      const key = 'distance_test'
      const result = translateBuildingConstraint(c, key)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'bc_distance_test',
        type: 'p2p_distance',
        p1_id: `corner_${cornerA}_out`,
        p2_id: `corner_${cornerB}_out`,
        distance: 5000,
        driving: true
      })
    })

    it('translates to p2p_distance on the right (inside) side', () => {
      const c: ConstraintInput = { type: 'distance', nodeA: cornerA, nodeB: cornerB, side: 'right', length: 3000 }
      const result = translateBuildingConstraint(c, 'test')

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'p2p_distance',
        p1_id: `corner_${cornerA}_in`,
        p2_id: `corner_${cornerB}_in`,
        distance: 3000
      })
    })
  })

  describe('colinear', () => {
    it('translates to point_on_line_ppp', () => {
      const c: ConstraintInput = {
        type: 'colinear',
        nodeA: cornerA,
        nodeB: cornerB,
        nodeC: cornerC,
        side: 'right'
      }
      const result = translateBuildingConstraint(c, 'col_test')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'bc_col_test',
        type: 'point_on_line_ppp',
        p_id: `corner_${cornerB}_in`,
        lp1_id: `corner_${cornerA}_in`,
        lp2_id: `corner_${cornerC}_in`,
        driving: true
      })
    })
  })

  describe('parallel', () => {
    it('translates to parallel without distance', () => {
      const c: ConstraintInput = { type: 'parallel', wallA, wallB }
      const result = translateBuildingConstraint(c, 'par_test')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'bc_par_test_par',
        type: 'parallel',
        l1_id: `wall_${wallA}_in`,
        l2_id: `wall_${wallB}_in`,
        driving: true
      })
    })

    it('translates to parallel + p2l_distance when distance is set', () => {
      const c: ConstraintInput = { type: 'parallel', wallA, wallB, distance: 1000 }
      const context = {
        getLineStartPointId: (lineId: string) => {
          if (lineId === `wall_${wallA}_in`) return `corner_${cornerA}_in`
          return undefined
        }
      }
      const result = translateBuildingConstraint(c, 'par_dist_test', context)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ type: 'parallel', id: 'bc_par_dist_test_par' })
      expect(result[1]).toEqual({
        id: 'bc_par_dist_test_dist',
        type: 'p2l_distance',
        p_id: `corner_${cornerA}_in`,
        l_id: `wall_${wallB}_in`,
        distance: 1000,
        driving: true
      })
    })

    it('skips distance constraint if line start point is not found', () => {
      const c: ConstraintInput = { type: 'parallel', wallA, wallB, distance: 1000 }
      const context = {
        getLineStartPointId: () => undefined
      }
      const result = translateBuildingConstraint(c, 'par_no_ctx', context)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ type: 'parallel' })
    })

    it('skips distance constraint if no context provided', () => {
      const c: ConstraintInput = { type: 'parallel', wallA, wallB, distance: 1000 }
      const result = translateBuildingConstraint(c, 'par_no_ctx2')

      expect(result).toHaveLength(1)
    })
  })

  describe('perpendicular', () => {
    it('translates to perpendicular_ll', () => {
      const c: ConstraintInput = { type: 'perpendicular', wallA, wallB }
      const result = translateBuildingConstraint(c, 'perp_test')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'bc_perp_test',
        type: 'perpendicular_ll',
        l1_id: `wall_${wallA}_in`,
        l2_id: `wall_${wallB}_in`,
        driving: true
      })
    })
  })

  describe('angle', () => {
    it('translates to l2l_angle_pppp using inside points', () => {
      const c: ConstraintInput = { type: 'angle', pivot: cornerA, nodeA: cornerB, nodeB: cornerC, angle: Math.PI / 2 }
      const result = translateBuildingConstraint(c, 'ang_test')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'bc_ang_test',
        type: 'l2l_angle_pppp',
        l1p1_id: `corner_${cornerA}_in`,
        l1p2_id: `corner_${cornerB}_in`,
        l2p1_id: `corner_${cornerA}_in`,
        l2p2_id: `corner_${cornerC}_in`,
        angle: Math.PI / 2,
        driving: true
      })
    })
  })

  describe('horizontal', () => {
    it('translates to horizontal_pp using inside points', () => {
      const c: ConstraintInput = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }
      const result = translateBuildingConstraint(c, 'h_test')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'bc_h_test',
        type: 'horizontal_pp',
        p1_id: `corner_${cornerA}_in`,
        p2_id: `corner_${cornerB}_in`,
        driving: true
      })
    })
  })

  describe('vertical', () => {
    it('translates to vertical_pp using inside points', () => {
      const c: ConstraintInput = { type: 'vertical', nodeA: cornerA, nodeB: cornerB }
      const result = translateBuildingConstraint(c, 'v_test')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'bc_v_test',
        type: 'vertical_pp',
        p1_id: `corner_${cornerA}_in`,
        p2_id: `corner_${cornerB}_in`,
        driving: true
      })
    })
  })
})

// --- Validation helper tests ---

describe('getReferencedCornerIds', () => {
  it('extracts corner IDs from distance constraint', () => {
    const c: ConstraintInput = { type: 'distance', nodeA: cornerA, nodeB: cornerB, side: 'left', length: 100 }
    expect(getReferencedCornerIds(c)).toEqual([cornerA, cornerB])
  })

  it('extracts corner IDs from colinear constraint', () => {
    const c: ConstraintInput = {
      type: 'colinear',
      nodeA: cornerA,
      nodeB: cornerB,
      nodeC: cornerC,
      side: 'left'
    }
    expect(getReferencedCornerIds(c)).toEqual([cornerA, cornerB, cornerC])
  })

  it('extracts corner IDs from angle constraint', () => {
    const c: ConstraintInput = { type: 'angle', pivot: cornerA, nodeA: cornerB, nodeB: cornerC, angle: 1 }
    expect(getReferencedCornerIds(c)).toEqual([cornerA, cornerB, cornerC])
  })

  it('returns empty for wall-based constraints', () => {
    const c: ConstraintInput = { type: 'parallel', wallA, wallB }
    expect(getReferencedCornerIds(c)).toEqual([])
  })
})

describe('getReferencedWallIds', () => {
  it('extracts wall IDs from parallel constraint', () => {
    const c: ConstraintInput = { type: 'parallel', wallA, wallB }
    expect(getReferencedWallIds(c)).toEqual([wallA, wallB])
  })

  it('extracts wall IDs from perpendicular constraint', () => {
    const c: ConstraintInput = { type: 'perpendicular', wallA, wallB }
    expect(getReferencedWallIds(c)).toEqual([wallA, wallB])
  })

  it('returns empty for node-based constraints', () => {
    const c: ConstraintInput = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }
    expect(getReferencedWallIds(c)).toEqual([])
  })
})
