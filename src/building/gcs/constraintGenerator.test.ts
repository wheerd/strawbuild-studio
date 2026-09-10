import { describe, expect, it } from 'vitest'

import type {
  InnerWallNodeWithGeometry,
  IntermediateWallWithGeometry,
  PerimeterCornerId,
  PerimeterCornerWithGeometry,
  PerimeterId,
  PerimeterWallId,
  PerimeterWallWithGeometry
} from '@/building/model'
import type { PerimeterWallAssemblyId } from '@/building/model/ids'
import type { Vec2 } from '@/shared/geometry'
import { addVec2, newVec2, perpendicular } from '@/shared/geometry'

import {
  generateFreeformConstraints,
  generateIntermediateWallConstraints,
  generatePresetConstraints,
  referenceSideToConstraintSide
} from './constraintGenerator'

function makeIntermediateWall(
  id: string,
  startNodeId: string,
  endNodeId: string,
  wallDirection: Vec2
): IntermediateWallWithGeometry {
  const start = newVec2(0, 0)
  const end = newVec2(wallDirection[0] * 100, wallDirection[1] * 100)
  const left = newVec2(-wallDirection[1] * 5, wallDirection[0] * 5)
  const right = newVec2(wallDirection[1] * 5, -wallDirection[0] * 5)
  return {
    id: id as `intermediate_${string}`,
    perimeterId: 'perim_1' as PerimeterId,
    entityIds: [],
    start: { nodeId: startNodeId as `wallnode_${string}`, axis: 'left' },
    end: { nodeId: endNodeId as `wallnode_${string}`, axis: 'left' },
    thickness: 10,
    boundary: { points: [] },
    entityReferenceLine: { start, end },
    wallLength: 100,
    leftLength: 100,
    leftLine: { start: addVec2(start, left), end: addVec2(end, left) },
    rightLength: 100,
    rightLine: { start: addVec2(start, right), end: addVec2(end, right) },
    direction: wallDirection,
    leftDirection: perpendicular(wallDirection)
  }
}

function makeInnerNode(id: string, connectedWallIds: string[]): InnerWallNodeWithGeometry {
  return {
    id: id as `wallnode_${string}`,
    perimeterId: 'perim_1' as PerimeterId,
    type: 'inner',
    connectedWallIds: connectedWallIds as `intermediate_${string}`[],
    position: newVec2(0, 0),
    center: newVec2(0, 0),
    incidentWalls: []
  }
}

// --- Helper factories ---

function makeCorner(
  id: string,
  insidePoint: Vec2,
  outsidePoint: Vec2,
  opts?: {
    previousWallId?: string
    nextWallId?: string
    interiorAngle?: number
  }
): PerimeterCornerWithGeometry {
  return {
    id: id as PerimeterCornerId,
    perimeterId: 'perim_1' as PerimeterId,
    previousWallId: (opts?.previousWallId ?? 'outwall_prev') as PerimeterWallId,
    nextWallId: (opts?.nextWallId ?? 'outwall_next') as PerimeterWallId,
    referencePoint: insidePoint,
    constructedByWall: 'previous',
    insidePoint,
    outsidePoint,
    interiorAngle: opts?.interiorAngle ?? 90,
    exteriorAngle: 360 - (opts?.interiorAngle ?? 90),
    polygon: { points: [] }
  }
}

function makeWall(
  id: string,
  startCornerId: string,
  endCornerId: string,
  opts: {
    insideLength: number
    outsideLength: number
    direction: Vec2
    thickness?: number
  }
): PerimeterWallWithGeometry {
  return {
    id: id as PerimeterWallId,
    perimeterId: 'perim_1' as PerimeterId,
    startCornerId: startCornerId as PerimeterCornerId,
    endCornerId: endCornerId as PerimeterCornerId,
    entityIds: [],
    thickness: opts.thickness ?? 420,
    wallAssemblyId: 'asm_1' as PerimeterWallAssemblyId,
    insideLength: opts.insideLength,
    outsideLength: opts.outsideLength,
    wallLength: opts.insideLength,
    insideLine: { start: newVec2(0, 0), end: newVec2(0, 0) },
    outsideLine: { start: newVec2(0, 0), end: newVec2(0, 0) },
    direction: opts.direction,
    outsideDirection: newVec2(0, 0),
    polygon: { points: [] },
    wallNodeIds: []
  }
}

// --- Rectangular preset geometry (CW: top-left → top-right → bottom-right → bottom-left) ---
// Inside: 6000×4000 rectangle. Outside offset by 420 on each side.
// Corners: A(0,0) B(6000,0) C(6000,4000) D(0,4000)  (inside)
//          A'(-420,-420) B'(6420,-420) C'(6420,4420) D'(-420,4420) (outside)

const rectCorners: PerimeterCornerWithGeometry[] = [
  makeCorner('outcorner_a', newVec2(0, 0), newVec2(-420, -420), {
    previousWallId: 'outwall_da',
    nextWallId: 'outwall_ab'
  }),
  makeCorner('outcorner_b', newVec2(6000, 0), newVec2(6420, -420), {
    previousWallId: 'outwall_ab',
    nextWallId: 'outwall_bc'
  }),
  makeCorner('outcorner_c', newVec2(6000, 4000), newVec2(6420, 4420), {
    previousWallId: 'outwall_bc',
    nextWallId: 'outwall_cd'
  }),
  makeCorner('outcorner_d', newVec2(0, 4000), newVec2(-420, 4420), {
    previousWallId: 'outwall_cd',
    nextWallId: 'outwall_da'
  })
]

const rectWalls: PerimeterWallWithGeometry[] = [
  makeWall('outwall_ab', 'outcorner_a', 'outcorner_b', {
    insideLength: 6000,
    outsideLength: 6840,
    direction: newVec2(1, 0)
  }),
  makeWall('outwall_bc', 'outcorner_b', 'outcorner_c', {
    insideLength: 4000,
    outsideLength: 4840,
    direction: newVec2(0, 1)
  }),
  makeWall('outwall_cd', 'outcorner_c', 'outcorner_d', {
    insideLength: 6000,
    outsideLength: 6840,
    direction: newVec2(-1, 0)
  }),
  makeWall('outwall_da', 'outcorner_d', 'outcorner_a', {
    insideLength: 4000,
    outsideLength: 4840,
    direction: newVec2(0, -1)
  })
]

// --- L-shaped preset ---
// Inside corners (CW): A(0,0) B(6000,0) C(6000,2000) D(3000,2000) E(3000,4000) F(0,4000)

const lCorners: PerimeterCornerWithGeometry[] = [
  makeCorner('outcorner_la', newVec2(0, 0), newVec2(-420, -420), {
    previousWallId: 'outwall_lfa',
    nextWallId: 'outwall_lab'
  }),
  makeCorner('outcorner_lb', newVec2(6000, 0), newVec2(6420, -420), {
    previousWallId: 'outwall_lab',
    nextWallId: 'outwall_lbc'
  }),
  makeCorner('outcorner_lc', newVec2(6000, 2000), newVec2(6420, 2420), {
    previousWallId: 'outwall_lbc',
    nextWallId: 'outwall_lcd'
  }),
  makeCorner('outcorner_ld', newVec2(3000, 2000), newVec2(3000, 2420), {
    previousWallId: 'outwall_lcd',
    nextWallId: 'outwall_lde',
    interiorAngle: 270
  }),
  makeCorner('outcorner_le', newVec2(3000, 4000), newVec2(-420 + 3000 + 420, 4420), {
    previousWallId: 'outwall_lde',
    nextWallId: 'outwall_lef'
  }),
  makeCorner('outcorner_lf', newVec2(0, 4000), newVec2(-420, 4420), {
    previousWallId: 'outwall_lef',
    nextWallId: 'outwall_lfa'
  })
]

const lWalls: PerimeterWallWithGeometry[] = [
  makeWall('outwall_lab', 'outcorner_la', 'outcorner_lb', {
    insideLength: 6000,
    outsideLength: 6840,
    direction: newVec2(1, 0)
  }),
  makeWall('outwall_lbc', 'outcorner_lb', 'outcorner_lc', {
    insideLength: 2000,
    outsideLength: 2840,
    direction: newVec2(0, 1)
  }),
  makeWall('outwall_lcd', 'outcorner_lc', 'outcorner_ld', {
    insideLength: 3000,
    outsideLength: 3000,
    direction: newVec2(-1, 0)
  }),
  makeWall('outwall_lde', 'outcorner_ld', 'outcorner_le', {
    insideLength: 2000,
    outsideLength: 2000,
    direction: newVec2(0, 1)
  }),
  makeWall('outwall_lef', 'outcorner_le', 'outcorner_lf', {
    insideLength: 3000,
    outsideLength: 3840,
    direction: newVec2(-1, 0)
  }),
  makeWall('outwall_lfa', 'outcorner_lf', 'outcorner_la', {
    insideLength: 4000,
    outsideLength: 4840,
    direction: newVec2(0, -1)
  })
]

// --- Tests ---

describe('referenceSideToConstraintSide', () => {
  it('maps inside to right', () => {
    expect(referenceSideToConstraintSide('inside')).toBe('right')
  })

  it('maps outside to left', () => {
    expect(referenceSideToConstraintSide('outside')).toBe('left')
  })
})

describe('generatePresetConstraints', () => {
  describe('rectangular preset', () => {
    it('generates independent distance constraints for the walls', () => {
      const constraints = generatePresetConstraints(rectCorners, rectWalls, 'inside')
      const distConstraints = constraints.filter(c => c.type === 'wallLength')

      expect(distConstraints).toHaveLength(2)
      expect(distConstraints).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'wallLength', side: 'right', length: 6000 }),
          expect.objectContaining({ type: 'wallLength', side: 'right', length: 4000 })
        ])
      )
      expect(distConstraints).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ wall: 'outwall_cd' }),
          expect.objectContaining({ wall: 'outwall_da' })
        ])
      )
    })

    it('generates horizontal constraints for horizontal wall segments', () => {
      const constraints = generatePresetConstraints(rectCorners, rectWalls, 'inside')
      const hConstraints = constraints.filter(c => c.type === 'horizontalWall')

      // Walls AB and CD are horizontal
      expect(hConstraints).toHaveLength(2)
    })

    it('generates vertical constraints for vertical wall segments', () => {
      const constraints = generatePresetConstraints(rectCorners, rectWalls, 'inside')
      const vConstraints = constraints.filter(c => c.type === 'verticalWall')

      // Walls BC and DA are vertical
      expect(vConstraints).toHaveLength(2)
    })

    it('does not generate perpendicular constraints', () => {
      const constraints = generatePresetConstraints(rectCorners, rectWalls, 'inside')
      const perpConstraints = constraints.filter(c => c.type === 'perpendicularCorner')

      expect(perpConstraints).toHaveLength(0)
    })

    it('uses outside lengths when referenceSide is outside', () => {
      const constraints = generatePresetConstraints(rectCorners, rectWalls, 'outside')
      const distConstraints = constraints.filter(c => c.type === 'wallLength')

      expect(distConstraints).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'wallLength', side: 'left', length: 6840 }),
          expect.objectContaining({ type: 'wallLength', side: 'left', length: 4840 })
        ])
      )
    })
  })

  describe('L-shaped preset', () => {
    it('generates independent distance constraints for the walls', () => {
      const constraints = generatePresetConstraints(lCorners, lWalls, 'inside')
      const distConstraints = constraints.filter(c => c.type === 'wallLength')

      expect(distConstraints).toHaveLength(4)
    })

    it('generates correct H/V constraints for axis-aligned segments', () => {
      const constraints = generatePresetConstraints(lCorners, lWalls, 'inside')
      const hConstraints = constraints.filter(c => c.type === 'horizontalWall')
      const vConstraints = constraints.filter(c => c.type === 'verticalWall')

      // Horizontal walls: LA→LB, LC→LD, LE→LF (3)
      expect(hConstraints).toHaveLength(3)
      // Vertical walls: LB→LC, LD→LE, LF→LA (3)
      expect(vConstraints).toHaveLength(3)
    })
  })
})

describe('generateFreeformConstraints', () => {
  describe('axis-aligned rectangle with no overrides', () => {
    it('generates only H/V constraints, no distance constraints', () => {
      const overrides: (number | null)[] = [null, null, null, null]
      const constraints = generateFreeformConstraints(rectCorners, rectWalls, 'inside', overrides)

      const distConstraints = constraints.filter(c => c.type === 'wallLength')
      const hConstraints = constraints.filter(c => c.type === 'horizontalWall')
      const vConstraints = constraints.filter(c => c.type === 'verticalWall')

      expect(distConstraints).toHaveLength(0)
      expect(hConstraints).toHaveLength(2)
      expect(vConstraints).toHaveLength(2)
    })
  })

  describe('with length overrides', () => {
    it('generates distance constraints for overridden segments', () => {
      const overrides: (number | null)[] = [5500, null, null, 3500]
      const constraints = generateFreeformConstraints(rectCorners, rectWalls, 'inside', overrides)

      const distConstraints = constraints.filter(c => c.type === 'wallLength')

      expect(distConstraints).toHaveLength(2)
      expect(distConstraints[0]).toMatchObject({
        type: 'wallLength',
        side: 'right',
        length: 5500,
        wall: 'outwall_ab'
      })
      expect(distConstraints[1]).toMatchObject({
        type: 'wallLength',
        side: 'right',
        length: 3500,
        wall: 'outwall_da'
      })
    })
  })

  describe('perpendicular constraints', () => {
    it('generates perpendicular for non-axis-aligned 90 degree walls', () => {
      // Two walls at 90° but neither is axis-aligned (45° and 135°)
      const sqrt2 = Math.SQRT2 / 2
      const diagonalCorners = [
        makeCorner('outcorner_x', newVec2(0, 0), newVec2(-300, -300)),
        makeCorner('outcorner_y', newVec2(1000, 1000), newVec2(1300, 1300)),
        makeCorner('outcorner_z', newVec2(2000, 0), newVec2(2300, -300))
      ]
      const diagonalWalls = [
        makeWall('outwall_xy', 'outcorner_x', 'outcorner_y', {
          insideLength: 1414,
          outsideLength: 1414,
          direction: newVec2(sqrt2, sqrt2)
        }),
        makeWall('outwall_yz', 'outcorner_y', 'outcorner_z', {
          insideLength: 1414,
          outsideLength: 1414,
          direction: newVec2(sqrt2, -sqrt2)
        }),
        makeWall('outwall_zx', 'outcorner_z', 'outcorner_x', {
          insideLength: 2000,
          outsideLength: 2000,
          direction: newVec2(-1, 0)
        })
      ]

      const overrides: (number | null)[] = [null, null, null]
      const constraints = generateFreeformConstraints(diagonalCorners, diagonalWalls, 'inside', overrides)

      const perpConstraints = constraints.filter(c => c.type === 'perpendicularCorner')

      // XY⊥YZ (both non-axis-aligned) and YZ⊥ZX (ZX is horizontal, but YZ is not)
      // XY is not H/V, YZ is not H/V, ZX is horizontal
      // So: XY⊥YZ → neither has H/V → perpendicular generated
      //     YZ⊥ZX → ZX has H/V but YZ doesn't → perpendicular generated
      expect(perpConstraints.length).toBeGreaterThanOrEqual(1)
      expect(perpConstraints).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'perpendicularCorner',
            corner: 'outcorner_y'
          })
        ])
      )
    })

    it('skips perpendicular when both walls already have H/V constraints', () => {
      // Axis-aligned rectangle: all walls have H/V, so no perpendiculars
      const overrides: (number | null)[] = [null, null, null, null]
      const constraints = generateFreeformConstraints(rectCorners, rectWalls, 'inside', overrides)

      const perpConstraints = constraints.filter(c => c.type === 'perpendicularCorner')
      expect(perpConstraints).toHaveLength(0)
    })
  })

  describe('colinear constraints', () => {
    it('generates colinear for 180 degree interior angle', () => {
      // Three consecutive corners on a line: A(0,0), B(3000,0), C(6000,0)
      // B has a 180° interior angle
      const colinearCorners = [
        makeCorner('outcorner_p', newVec2(0, 0), newVec2(0, -420), { interiorAngle: 180 }),
        makeCorner('outcorner_q', newVec2(3000, 0), newVec2(3000, -420), { interiorAngle: 180 }),
        makeCorner('outcorner_r', newVec2(6000, 0), newVec2(6000, -420), { interiorAngle: 90 }),
        makeCorner('outcorner_s', newVec2(6000, 4000), newVec2(6000, 4420), { interiorAngle: 90 }),
        makeCorner('outcorner_t', newVec2(0, 4000), newVec2(0, 4420), { interiorAngle: 90 })
      ]
      const colinearWalls = [
        makeWall('outwall_pq', 'outcorner_p', 'outcorner_q', {
          insideLength: 3000,
          outsideLength: 3000,
          direction: newVec2(1, 0)
        }),
        makeWall('outwall_qr', 'outcorner_q', 'outcorner_r', {
          insideLength: 3000,
          outsideLength: 3000,
          direction: newVec2(1, 0)
        }),
        makeWall('outwall_rs', 'outcorner_r', 'outcorner_s', {
          insideLength: 4000,
          outsideLength: 4000,
          direction: newVec2(0, 1)
        }),
        makeWall('outwall_st', 'outcorner_s', 'outcorner_t', {
          insideLength: 6000,
          outsideLength: 6000,
          direction: newVec2(-1, 0)
        }),
        makeWall('outwall_tp', 'outcorner_t', 'outcorner_p', {
          insideLength: 4000,
          outsideLength: 4000,
          direction: newVec2(0, -1)
        })
      ]

      const overrides: (number | null)[] = [null, null, null, null, null]
      const constraints = generateFreeformConstraints(colinearCorners, colinearWalls, 'inside', overrides)

      const colinConstraints = constraints.filter(c => c.type === 'colinearCorner')

      // Corner Q is between P and R, all on same horizontal line
      expect(colinConstraints).toHaveLength(1)
      expect(colinConstraints[0]).toMatchObject({
        type: 'colinearCorner',
        corner: 'outcorner_q'
      })
    })
  })

  describe('outside reference side', () => {
    it('uses left constraint side and outside points for alignment', () => {
      const overrides: (number | null)[] = [null, null, null, null]
      const constraints = generateFreeformConstraints(rectCorners, rectWalls, 'outside', overrides)

      const hConstraints = constraints.filter(c => c.type === 'horizontalWall')
      const vConstraints = constraints.filter(c => c.type === 'verticalWall')

      // Outside points of the rectangle are also axis-aligned
      expect(hConstraints).toHaveLength(2)
      expect(vConstraints).toHaveLength(2)
    })

    it('uses left side for distance constraints', () => {
      const overrides: (number | null)[] = [7000, null, null, null]
      const constraints = generateFreeformConstraints(rectCorners, rectWalls, 'outside', overrides)

      const distConstraints = constraints.filter(c => c.type === 'wallLength')
      expect(distConstraints).toHaveLength(1)
      expect(distConstraints[0]).toMatchObject({
        type: 'wallLength',
        side: 'left',
        length: 7000
      })
    })
  })
})

describe('generateIntermediateWallConstraints', () => {
  it('generates only explicit length overrides and uses the alignment side', () => {
    const wall = makeIntermediateWall('intermediate_a', 'wallnode_a', 'wallnode_b', newVec2(1, 0))
    const constraints = generateIntermediateWallConstraints([wall], [wall], [], [], 'right', new Map([[wall.id, 240]]))

    expect(constraints).toEqual(
      expect.arrayContaining([
        { type: 'wallLength', wall: wall.id, side: 'right', length: 240 },
        { type: 'horizontalWall', wall: wall.id }
      ])
    )
  })

  it('does not generate a length constraint without an override', () => {
    const wall = makeIntermediateWall('intermediate_a', 'wallnode_a', 'wallnode_b', newVec2(0, 1))
    const constraints = generateIntermediateWallConstraints([wall], [wall], [], [], 'left', new Map())

    expect(constraints).toEqual([{ type: 'verticalWall', wall: wall.id }])
  })

  it('generates perpendicular and colinear constraints only for adjacent wall pairs', () => {
    const perpendicularWall = makeIntermediateWall(
      'intermediate_perpendicular',
      'wallnode_a',
      'wallnode_b',
      newVec2(1, 0)
    )
    const otherWall = makeIntermediateWall('intermediate_other', 'wallnode_a', 'wallnode_c', newVec2(0, 1))
    const colinearWall = makeIntermediateWall('intermediate_colinear', 'wallnode_a', 'wallnode_d', newVec2(-1, 0))
    const node = makeInnerNode('wallnode_a', [perpendicularWall.id, otherWall.id, colinearWall.id])

    const constraints = generateIntermediateWallConstraints(
      [perpendicularWall],
      [perpendicularWall, otherWall, colinearWall],
      [],
      [node],
      'left',
      new Map()
    )

    expect(constraints).toContainEqual({
      type: 'wallNodePerpendicular',
      node: node.id,
      wallA: otherWall.id,
      wallB: perpendicularWall.id
    })
    expect(constraints).toContainEqual({
      type: 'wallNodeColinear',
      node: node.id,
      wallA: perpendicularWall.id,
      wallB: colinearWall.id
    })
    expect(constraints).not.toContainEqual({
      type: 'wallNodePerpendicular',
      node: node.id,
      wallA: otherWall.id,
      wallB: colinearWall.id
    })
  })
})
