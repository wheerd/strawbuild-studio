import { describe, expect, it } from 'vitest'

import type { ConstraintInput, PerimeterCornerId, PerimeterWallId } from '@/building/model'
import type { WallId } from '@/building/model/ids'

import {
  type TranslationContext,
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

// --- Helper to build a mock TranslationContext ---

function makeContext(overrides: Partial<TranslationContext> = {}): TranslationContext {
  return {
    getLineStartPointId: () => undefined,
    getWallCornerIds: (wallId: WallId) => {
      // Default: wallA → cornerA..cornerB, wallB → cornerB..cornerC
      if (wallId === wallA) return { startCornerId: cornerA, endCornerId: cornerB }
      if (wallId === wallB) return { startCornerId: cornerB, endCornerId: cornerC }
      return undefined
    },
    getCornerAdjacentWallIds: (cornerId: PerimeterCornerId) => {
      // Default: cornerB sits between wallA and wallB
      if (cornerId === cornerB) return { previousWallId: wallA as WallId, nextWallId: wallB as WallId }
      return undefined
    },
    getReferenceSide: () => 'right',
    ...overrides
  }
}

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
  describe('wallLength', () => {
    it('produces a deterministic key', () => {
      const c: ConstraintInput = { type: 'wallLength', wall: wallA, side: 'left', length: 100 }
      expect(buildingConstraintKey(c)).toBe(`wallLength_${wallA}`)
    })

    it('does not include side in the key', () => {
      const c1: ConstraintInput = { type: 'wallLength', wall: wallA, side: 'left', length: 100 }
      const c2: ConstraintInput = { type: 'wallLength', wall: wallA, side: 'right', length: 200 }
      expect(buildingConstraintKey(c1)).toBe(buildingConstraintKey(c2))
    })
  })

  describe('colinearCorner', () => {
    it('produces a deterministic key from the corner', () => {
      const c: ConstraintInput = { type: 'colinearCorner', corner: cornerB }
      expect(buildingConstraintKey(c)).toBe(`colinearCorner_${cornerB}`)
    })
  })

  describe('parallel', () => {
    it('sorts wall pair', () => {
      const c1: ConstraintInput = { type: 'parallel', wallA, wallB }
      const c2: ConstraintInput = { type: 'parallel', wallA: wallB, wallB: wallA }
      expect(buildingConstraintKey(c1)).toBe(buildingConstraintKey(c2))
    })
  })

  describe('perpendicularCorner', () => {
    it('produces a deterministic key from the corner', () => {
      const c: ConstraintInput = { type: 'perpendicularCorner', corner: cornerB }
      expect(buildingConstraintKey(c)).toBe(`perpendicularCorner_${cornerB}`)
    })
  })

  describe('horizontalWall / verticalWall share key space', () => {
    it('horizontal and vertical on the same wall produce the same key', () => {
      const h: ConstraintInput = { type: 'horizontalWall', wall: wallA }
      const v: ConstraintInput = { type: 'verticalWall', wall: wallA }
      expect(buildingConstraintKey(h)).toBe(buildingConstraintKey(v))
    })
  })

  describe('cornerAngle', () => {
    it('produces a deterministic key from the corner', () => {
      const c: ConstraintInput = { type: 'cornerAngle', corner: cornerB, angle: 1 }
      expect(buildingConstraintKey(c)).toBe(`cornerAngle_${cornerB}`)
    })
  })

  describe('keys are unique across different constraint types', () => {
    it('wallLength key differs from hv key for same wall', () => {
      const dist: ConstraintInput = { type: 'wallLength', wall: wallA, side: 'left', length: 100 }
      const h: ConstraintInput = { type: 'horizontalWall', wall: wallA }
      expect(buildingConstraintKey(dist)).not.toBe(buildingConstraintKey(h))
    })
  })
})

// --- Translation tests ---

describe('translateBuildingConstraint', () => {
  describe('wallLength', () => {
    it('translates to p2p_distance on the left (outside) side', () => {
      const c: ConstraintInput = { type: 'wallLength', wall: wallA, side: 'left', length: 5000 }
      const key = 'wallLength_test'
      const ctx = makeContext()
      const result = translateBuildingConstraint(c, key, ctx)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'bc_wallLength_test',
        type: 'p2p_distance',
        p1_id: `corner_${cornerA}_out`,
        p2_id: `corner_${cornerB}_out`,
        distance: 5000,
        driving: true
      })
    })

    it('translates to p2p_distance on the right (inside) side', () => {
      const c: ConstraintInput = { type: 'wallLength', wall: wallA, side: 'right', length: 3000 }
      const ctx = makeContext()
      const result = translateBuildingConstraint(c, 'test', ctx)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'p2p_distance',
        p1_id: `corner_${cornerA}_in`,
        p2_id: `corner_${cornerB}_in`,
        distance: 3000
      })
    })

    it('returns empty array if wall corners cannot be resolved', () => {
      const c: ConstraintInput = {
        type: 'wallLength',
        wall: 'outwall_unknown' as PerimeterWallId,
        side: 'left',
        length: 100
      }
      const ctx = makeContext()
      const result = translateBuildingConstraint(c, 'test', ctx)
      expect(result).toHaveLength(0)
    })
  })

  describe('colinearCorner', () => {
    it('translates to point_on_line_ppp', () => {
      const c: ConstraintInput = { type: 'colinearCorner', corner: cornerB }
      const ctx = makeContext({ getReferenceSide: () => 'right' })
      const result = translateBuildingConstraint(c, 'col_test', ctx)

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

    it('uses outside points when reference side is left', () => {
      const c: ConstraintInput = { type: 'colinearCorner', corner: cornerB }
      const ctx = makeContext({ getReferenceSide: () => 'left' })
      const result = translateBuildingConstraint(c, 'col_test2', ctx)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        p_id: `corner_${cornerB}_out`,
        lp1_id: `corner_${cornerA}_out`,
        lp2_id: `corner_${cornerC}_out`
      })
    })

    it('returns empty array if adjacent walls cannot be resolved', () => {
      const c: ConstraintInput = { type: 'colinearCorner', corner: cornerA }
      // cornerA is not in getCornerAdjacentWallIds default mapping
      const ctx = makeContext()
      const result = translateBuildingConstraint(c, 'col_test3', ctx)
      expect(result).toHaveLength(0)
    })
  })

  describe('parallel', () => {
    it('translates to parallel without distance', () => {
      const c: ConstraintInput = { type: 'parallel', wallA, wallB }
      const ctx = makeContext()
      const result = translateBuildingConstraint(c, 'par_test', ctx)

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
      const ctx = makeContext({
        getLineStartPointId: (lineId: string) => {
          if (lineId === `wall_${wallA}_in`) return `corner_${cornerA}_in`
          return undefined
        }
      })
      const result = translateBuildingConstraint(c, 'par_dist_test', ctx)

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
      const ctx = makeContext({
        getLineStartPointId: () => undefined
      })
      const result = translateBuildingConstraint(c, 'par_no_ctx', ctx)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ type: 'parallel' })
    })
  })

  describe('perpendicularCorner', () => {
    it('translates to perpendicular_ll using adjacent walls', () => {
      const c: ConstraintInput = { type: 'perpendicularCorner', corner: cornerB }
      const ctx = makeContext()
      const result = translateBuildingConstraint(c, 'perp_test', ctx)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'bc_perp_test',
        type: 'perpendicular_ll',
        l1_id: `wall_${wallA}_in`,
        l2_id: `wall_${wallB}_in`,
        driving: true
      })
    })

    it('returns empty array if adjacent walls cannot be resolved', () => {
      const c: ConstraintInput = { type: 'perpendicularCorner', corner: cornerA }
      const ctx = makeContext()
      const result = translateBuildingConstraint(c, 'perp_test2', ctx)
      expect(result).toHaveLength(0)
    })
  })

  describe('cornerAngle', () => {
    it('translates to l2l_angle_pppp using inside points', () => {
      const c: ConstraintInput = { type: 'cornerAngle', corner: cornerB, angle: Math.PI / 2 }
      const ctx = makeContext()
      const result = translateBuildingConstraint(c, 'ang_test', ctx)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'bc_ang_test',
        type: 'l2l_angle_pppp',
        l1p1_id: `corner_${cornerB}_in`,
        l1p2_id: `corner_${cornerA}_in`,
        l2p1_id: `corner_${cornerB}_in`,
        l2p2_id: `corner_${cornerC}_in`,
        angle: Math.PI / 2,
        driving: true
      })
    })

    it('returns empty array if adjacent walls cannot be resolved', () => {
      const c: ConstraintInput = { type: 'cornerAngle', corner: cornerA, angle: 1 }
      const ctx = makeContext()
      const result = translateBuildingConstraint(c, 'ang_test2', ctx)
      expect(result).toHaveLength(0)
    })
  })

  describe('horizontalWall', () => {
    it('translates to horizontal_pp using inside points', () => {
      const c: ConstraintInput = { type: 'horizontalWall', wall: wallA }
      const ctx = makeContext()
      const result = translateBuildingConstraint(c, 'h_test', ctx)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'bc_h_test',
        type: 'horizontal_pp',
        p1_id: `corner_${cornerA}_in`,
        p2_id: `corner_${cornerB}_in`,
        driving: true
      })
    })

    it('returns empty array if wall corners cannot be resolved', () => {
      const c: ConstraintInput = { type: 'horizontalWall', wall: 'outwall_unknown' as PerimeterWallId }
      const ctx = makeContext()
      const result = translateBuildingConstraint(c, 'h_test2', ctx)
      expect(result).toHaveLength(0)
    })
  })

  describe('verticalWall', () => {
    it('translates to vertical_pp using inside points', () => {
      const c: ConstraintInput = { type: 'verticalWall', wall: wallA }
      const ctx = makeContext()
      const result = translateBuildingConstraint(c, 'v_test', ctx)

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
  it('extracts corner IDs from colinearCorner constraint', () => {
    const c: ConstraintInput = { type: 'colinearCorner', corner: cornerB }
    expect(getReferencedCornerIds(c)).toEqual([cornerB])
  })

  it('extracts corner IDs from perpendicularCorner constraint', () => {
    const c: ConstraintInput = { type: 'perpendicularCorner', corner: cornerB }
    expect(getReferencedCornerIds(c)).toEqual([cornerB])
  })

  it('extracts corner IDs from cornerAngle constraint', () => {
    const c: ConstraintInput = { type: 'cornerAngle', corner: cornerA, angle: 1 }
    expect(getReferencedCornerIds(c)).toEqual([cornerA])
  })

  it('returns empty for wall-based constraints', () => {
    const c: ConstraintInput = { type: 'parallel', wallA, wallB }
    expect(getReferencedCornerIds(c)).toEqual([])
  })

  it('returns empty for wallLength constraint', () => {
    const c: ConstraintInput = { type: 'wallLength', wall: wallA, side: 'left', length: 100 }
    expect(getReferencedCornerIds(c)).toEqual([])
  })

  it('returns empty for horizontalWall constraint', () => {
    const c: ConstraintInput = { type: 'horizontalWall', wall: wallA }
    expect(getReferencedCornerIds(c)).toEqual([])
  })
})

describe('getReferencedWallIds', () => {
  it('extracts wall IDs from parallel constraint', () => {
    const c: ConstraintInput = { type: 'parallel', wallA, wallB }
    expect(getReferencedWallIds(c)).toEqual([wallA, wallB])
  })

  it('extracts wall IDs from wallLength constraint', () => {
    const c: ConstraintInput = { type: 'wallLength', wall: wallA, side: 'left', length: 100 }
    expect(getReferencedWallIds(c)).toEqual([wallA])
  })

  it('extracts wall IDs from horizontalWall constraint', () => {
    const c: ConstraintInput = { type: 'horizontalWall', wall: wallA }
    expect(getReferencedWallIds(c)).toEqual([wallA])
  })

  it('extracts wall IDs from verticalWall constraint', () => {
    const c: ConstraintInput = { type: 'verticalWall', wall: wallA }
    expect(getReferencedWallIds(c)).toEqual([wallA])
  })

  it('returns empty for corner-based constraints', () => {
    const c: ConstraintInput = { type: 'colinearCorner', corner: cornerB }
    expect(getReferencedWallIds(c)).toEqual([])
  })
})
