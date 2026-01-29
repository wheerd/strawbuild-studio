import { describe, expect } from 'vitest'

import { type Length, type LineSegment2D, type Polygon2D, type Vec2, newVec2 } from '@/shared/geometry'

import { VerticalOffsetMap } from './offsets'

const createSquare = (center: Vec2, size: Length): Polygon2D => {
  const half = size / 2
  return {
    points: [
      newVec2(center[0] - half, center[1] - half),
      newVec2(center[0] + half, center[1] - half),
      newVec2(center[0] + half, center[1] + half),
      newVec2(center[0] - half, center[1] + half)
    ]
  }
}

const createLine = (start: Vec2, end: Vec2): LineSegment2D => ({
  start,
  end
})

describe('VerticalOffsetMap', () => {
  describe('with no areas', () => {
    test('returns fallback at both ends', () => {
      const map = new VerticalOffsetMap(100)
      const line = createLine(newVec2(0, 0), newVec2(1000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 100 }),
        expect.objectContaining({ position: 1, offset: 100 })
      ])
    })
  })

  describe('single constant area', () => {
    test('line outside area → only fallback', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 1000)
      map.addConstantArea(polygon, 100)
      const line = createLine(newVec2(2000, 0), newVec2(3000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })

    test('line completely inside → constant offset', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      map.addConstantArea(polygon, 100)
      const line = createLine(newVec2(-500, 0), newVec2(500, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 100 }),
        expect.objectContaining({ position: 1, offset: 100 })
      ])
    })

    test('line entering and exiting → transitions', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 1000)
      map.addConstantArea(polygon, 100)
      const line = createLine(newVec2(-1000, 0), newVec2(1000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({ position: expect.closeTo(0.25, 3), offsetBefore: 0, offsetAfter: 100 }),
        expect.objectContaining({ position: expect.closeTo(0.75, 3), offsetBefore: 100, offsetAfter: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })

    test('line tangent to polygon → no intersection', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 1000)
      map.addConstantArea(polygon, 100)
      const line = createLine(newVec2(1000, 0), newVec2(0, 1000))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })
  })

  describe('single sloped area', () => {
    test('flat slope (0°) → behaves like constant', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      map.addSlopedArea(polygon, newVec2(0, 0), newVec2(1, 0), 0, 100)
      const line = createLine(newVec2(-500, 0), newVec2(500, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 100 }),
        expect.objectContaining({ position: 1, offset: 100 })
      ])
    })

    test('line parallel to downSlopeDir → constant offset', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      map.addSlopedArea(polygon, newVec2(-1000, 0), newVec2(1, 0), Math.PI / 6, 100)
      const line = createLine(newVec2(-1000, -500), newVec2(-1000, 500))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 100 }),
        expect.objectContaining({ position: 1, offset: 100 })
      ])
    })

    test('positive slope → ascending offset', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      const angle = Math.atan(0.5)
      map.addSlopedArea(polygon, newVec2(-1000, 0), newVec2(-1, 0), angle, 100)
      const line = createLine(newVec2(-500, 0), newVec2(500, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 350 }),
        expect.objectContaining({ position: 1, offset: 850 })
      ])
    })

    test('negative slope → descending offset', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      const angle = Math.atan(0.5)
      map.addSlopedArea(polygon, newVec2(0, 1000), newVec2(0, -1), angle, 200)
      const line = createLine(newVec2(0, -500), newVec2(0, 500))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: -550 }),
        expect.objectContaining({ position: 1, offset: -50 })
      ])
    })

    test('45° slope → proper calculation', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      map.addSlopedArea(polygon, newVec2(-1000, 0), newVec2(1, 0), Math.PI / 4, 100)
      const line = createLine(newVec2(-500, 0), newVec2(500, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: -400 }),
        expect.objectContaining({ position: 1, offset: -1400 })
      ])
    })

    test('15° standard roof pitch', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 6000)
      const angle = 15 * (Math.PI / 180)
      map.addSlopedArea(polygon, newVec2(-3000, 0), newVec2(1, 0), angle, 100)
      const line = createLine(newVec2(-2000, 0), newVec2(2000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: expect.closeTo(-167.95, 2) }),
        expect.objectContaining({ position: 1, offset: expect.closeTo(-1239.75, 2) })
      ])
    })

    test('30° standard roof pitch', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 8000)
      const angle = 30 * (Math.PI / 180)
      map.addSlopedArea(polygon, newVec2(-4000, 0), newVec2(1, 0), angle, 100)
      const line = createLine(newVec2(-3000, 0), newVec2(3000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: expect.closeTo(-477.35, 2) }),
        expect.objectContaining({ position: 1, offset: expect.closeTo(-3941.45, 2) })
      ])
    })

    test('line perpendicular to downSlopeDir', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      map.addSlopedArea(polygon, newVec2(0, -1000), newVec2(0, 1), Math.PI / 6, 100)
      const line = createLine(newVec2(-1000, 0), newVec2(1000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: expect.closeTo(-477.35, 2) }),
        expect.objectContaining({ position: 1, offset: expect.closeTo(-477.35, 2) })
      ])
    })

    test('line parallel to downSlopeDir', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      map.addSlopedArea(polygon, newVec2(-1000, 0), newVec2(1, 0), Math.PI / 6, 100)
      const line = createLine(newVec2(-500, 0), newVec2(500, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: expect.closeTo(-188.68, 2) }),
        expect.objectContaining({ position: 1, offset: expect.closeTo(-766.03, 2) })
      ])
    })
  })

  describe('multiple constant areas', () => {
    test('non-overlapping areas → multiple transitions', () => {
      const map = new VerticalOffsetMap(0)
      const polygon1 = createSquare(newVec2(-1500, 0), 1000)
      const polygon2 = createSquare(newVec2(1500, 0), 1000)
      map.addConstantArea(polygon1, 100)
      map.addConstantArea(polygon2, 200)
      const line = createLine(newVec2(-2500, 0), newVec2(2500, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({ position: expect.closeTo(0.1, 3), offsetBefore: 0, offsetAfter: 100 }),
        expect.objectContaining({ position: expect.closeTo(0.3, 3), offsetBefore: 100, offsetAfter: 0 }),
        expect.objectContaining({ position: expect.closeTo(0.7, 3), offsetBefore: 0, offsetAfter: 200 }),
        expect.objectContaining({ position: expect.closeTo(0.9, 3), offsetBefore: 200, offsetAfter: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })

    test('overlapping areas → maximum wins', () => {
      const map = new VerticalOffsetMap(0)
      const polygon1 = createSquare(newVec2(0, 0), 1000)
      const polygon2 = createSquare(newVec2(200, 0), 1000)
      map.addConstantArea(polygon1, 100)
      map.addConstantArea(polygon2, 200)
      const line = createLine(newVec2(-1000, 0), newVec2(1000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({ position: expect.closeTo(0.25, 3), offsetBefore: 0, offsetAfter: 100 }),
        expect.objectContaining({ position: expect.closeTo(0.35, 3), offsetBefore: 100, offsetAfter: 200 }),
        expect.objectContaining({ position: expect.closeTo(0.85, 3), offsetBefore: 200, offsetAfter: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })

    test('adjacent same offset → no jump', () => {
      const map = new VerticalOffsetMap(0)
      const polygon1 = createSquare(newVec2(-500, 0), 1000)
      const polygon2 = createSquare(newVec2(500, 0), 1000)
      map.addConstantArea(polygon1, 100)
      map.addConstantArea(polygon2, 100)
      const line = createLine(newVec2(-2000, 0), newVec2(2000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({ position: 0.25, offsetBefore: 0, offsetAfter: 100 }),
        expect.objectContaining({ position: 0.5, offset: 100 }),
        expect.objectContaining({ position: 0.75, offsetBefore: 100, offsetAfter: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })

    test('adjacent different offsets → jump created', () => {
      const map = new VerticalOffsetMap(0)
      const polygon1 = createSquare(newVec2(-500, 0), 1000)
      const polygon2 = createSquare(newVec2(500, 0), 1000)
      map.addConstantArea(polygon1, 100)
      map.addConstantArea(polygon2, 200)
      const line = createLine(newVec2(-2000, 0), newVec2(2000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({ position: 0.25, offsetBefore: 0, offsetAfter: 100 }),
        expect.objectContaining({ position: 0.5, offsetBefore: 100, offsetAfter: 200 }),
        expect.objectContaining({ position: 0.75, offsetBefore: 200, offsetAfter: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })

    test('nested areas → highest wins', () => {
      const map = new VerticalOffsetMap(0)
      const outer = createSquare(newVec2(0, 0), 2000)
      const inner = createSquare(newVec2(0, 0), 1000)
      map.addConstantArea(outer, 100)
      map.addConstantArea(inner, 200)
      const line = createLine(newVec2(-1500, 0), newVec2(1500, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({ position: expect.closeTo(0.167, 3), offsetBefore: 0, offsetAfter: 100 }),
        expect.objectContaining({ position: expect.closeTo(0.333, 3), offsetBefore: 100, offsetAfter: 200 }),
        expect.objectContaining({ position: expect.closeTo(0.667, 3), offsetBefore: 200, offsetAfter: 100 }),
        expect.objectContaining({ position: expect.closeTo(0.833, 3), offsetBefore: 100, offsetAfter: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })

    test('three areas in sequence', () => {
      const map = new VerticalOffsetMap(0)
      const polygon1 = createSquare(newVec2(-2000, 0), 1000)
      const polygon2 = createSquare(newVec2(0, 0), 1000)
      const polygon3 = createSquare(newVec2(2000, 0), 1000)
      map.addConstantArea(polygon1, 100)
      map.addConstantArea(polygon2, 200)
      map.addConstantArea(polygon3, 150)
      const line = createLine(newVec2(-3000, 0), newVec2(3000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({ position: expect.closeTo(0.083, 3), offsetBefore: 0, offsetAfter: 100 }),
        expect.objectContaining({ position: expect.closeTo(0.25, 3), offsetBefore: 100, offsetAfter: 0 }),
        expect.objectContaining({ position: expect.closeTo(0.417, 3), offsetBefore: 0, offsetAfter: 200 }),
        expect.objectContaining({ position: expect.closeTo(0.583, 3), offsetBefore: 200, offsetAfter: 0 }),
        expect.objectContaining({ position: expect.closeTo(0.75, 3), offsetBefore: 0, offsetAfter: 150 }),
        expect.objectContaining({ position: expect.closeTo(0.917, 3), offsetBefore: 150, offsetAfter: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })
  })

  describe('multiple sloped areas', () => {
    test('parallel slopes different heights', () => {
      const map = new VerticalOffsetMap(0)
      const polygon1 = createSquare(newVec2(-500, 0), 1000)
      const polygon2 = createSquare(newVec2(500, 0), 1000)
      const angle = Math.PI / 6
      map.addSlopedArea(polygon1, newVec2(0, 0), newVec2(0, 1), angle, 100)
      map.addSlopedArea(polygon2, newVec2(0, 0), newVec2(0, 1), angle, 200)
      const line = createLine(newVec2(-2000, 0), newVec2(2000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({ position: 0.25, offsetBefore: 0, offsetAfter: 100 }),
        expect.objectContaining({ position: 0.5, offsetBefore: 100, offsetAfter: 200 }),
        expect.objectContaining({ position: 0.75, offsetBefore: 200, offsetAfter: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })

    test('parallel slopes same height → no jump', () => {
      const map = new VerticalOffsetMap(0)
      const polygon1 = createSquare(newVec2(-500, 0), 1000)
      const polygon2 = createSquare(newVec2(500, 0), 1000)
      const angle = Math.PI / 6
      map.addSlopedArea(polygon1, newVec2(0, 0), newVec2(0, 1), angle, 100)
      map.addSlopedArea(polygon2, newVec2(0, 0), newVec2(0, 1), angle, 100)
      const line = createLine(newVec2(-2000, 0), newVec2(2000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({ position: 0.25, offsetBefore: 0, offsetAfter: 100 }),
        expect.objectContaining({ position: 0.5, offset: 100 }),
        expect.objectContaining({ position: 0.75, offsetBefore: 100, offsetAfter: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })

    test('one area entirely above another', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      const angle = Math.PI / 6
      map.addSlopedArea(polygon, newVec2(-1000, 0), newVec2(1, 0), angle, 100)
      map.addSlopedArea(polygon, newVec2(-1000, 0), newVec2(1, 0), angle, 200)
      const line = createLine(newVec2(-1000, 0), newVec2(500, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 200 }),
        expect.objectContaining({ position: 1, offset: expect.closeTo(-666.03, 2) })
      ])
    })
  })

  describe('mixed constant and sloped areas', () => {
    test('constant on top of sloped', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      const angle = Math.PI / 6
      map.addSlopedArea(polygon, newVec2(-1000, 0), newVec2(1, 0), angle, 100)
      map.addConstantArea(polygon, 300)
      const line = createLine(newVec2(-500, 0), newVec2(500, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 300 }),
        expect.objectContaining({ position: 1, offset: 300 })
      ])
    })

    test('sloped on top of constant', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      const angle = Math.PI / 6
      map.addConstantArea(polygon, 100)
      map.addSlopedArea(polygon, newVec2(0, 0), newVec2(1, 0), angle, 200)
      const line = createLine(newVec2(-500, 0), newVec2(500, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 488.68 }),
        // There isn't a break point here, because so far this isn't needed for the roofs.
        // In practice, the constant areas of the roof will have a more extreme offset than the slope behind it
        expect.objectContaining({ position: 1, offset: 100 })
      ])
    })
  })

  describe('edge cases', () => {
    test('zero-length segments filtered', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 1000)
      map.addConstantArea(polygon, 100)
      const line = createLine(newVec2(500, 0), newVec2(501, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })

    test('duplicate transition points deduplicated', () => {
      const map = new VerticalOffsetMap(0)
      const polygon1 = createSquare(newVec2(-1000, 0), 1000)
      const polygon2 = createSquare(newVec2(1000, 0), 1000)
      map.addConstantArea(polygon1, 100)
      map.addConstantArea(polygon2, 200)
      const line = createLine(newVec2(-2000, 0), newVec2(2000, 0))
      const result = map.getOffsets(line)
      const positions = result.map(r => r.position)
      const uniquePositions = new Set(positions)
      expect(positions.length).toBe(uniquePositions.size)
    })

    test('line completely inside overlapping areas', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      map.addConstantArea(polygon, 100)
      map.addConstantArea(polygon, 200)
      const line = createLine(newVec2(-500, 0), newVec2(500, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 200 }),
        expect.objectContaining({ position: 1, offset: 200 })
      ])
    })

    test('boundary at t=1', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      map.addConstantArea(polygon, 100)
      const line = createLine(newVec2(0, 0), newVec2(1000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 100 }),
        expect.objectContaining({ position: 1, offset: 100 })
      ])
    })

    test('boundary at t=0', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 2000)
      map.addConstantArea(polygon, 100)
      const line = createLine(newVec2(-1000, 0), newVec2(0, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 100 }),
        expect.objectContaining({ position: 1, offset: 100 })
      ])
    })
  })

  describe('HeightLine output validation', () => {
    test('correct item types for jumps', () => {
      const map = new VerticalOffsetMap(0)
      const polygon1 = createSquare(newVec2(-1000, 0), 1000)
      const polygon2 = createSquare(newVec2(1000, 0), 1000)
      map.addConstantArea(polygon1, 100)
      map.addConstantArea(polygon2, 200)
      const line = createLine(newVec2(-2000, 0), newVec2(2000, 0))
      const result = map.getOffsets(line)
      const jumpItems = result.filter(item => 'offsetBefore' in item)
      expect(jumpItems.length).toBeGreaterThan(0)
    })

    test('correct item types for regular items', () => {
      const map = new VerticalOffsetMap(0)
      const polygon = createSquare(newVec2(0, 0), 1000)
      map.addConstantArea(polygon, 100)
      const line = createLine(newVec2(-1000, 0), newVec2(1000, 0))
      const result = map.getOffsets(line)
      const regularItems = result.filter(item => 'offset' in item)
      expect(regularItems.length).toBeGreaterThan(0)
    })

    test('positions sorted and in [0,1]', () => {
      const map = new VerticalOffsetMap(0)
      const polygon1 = createSquare(newVec2(-1000, 0), 1000)
      const polygon2 = createSquare(newVec2(1000, 0), 1000)
      map.addConstantArea(polygon1, 100)
      map.addConstantArea(polygon2, 200)
      const line = createLine(newVec2(-2000, 0), newVec2(2000, 0))
      const result = map.getOffsets(line)
      const positions = result.map(r => r.position)
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]).toBeGreaterThan(positions[i - 1])
      }
      for (const pos of positions) {
        expect(pos).toBeGreaterThanOrEqual(0)
        expect(pos).toBeLessThanOrEqual(1)
      }
    })

    test('nullAfter only on last item', () => {
      const map = new VerticalOffsetMap(0)
      const polygon1 = createSquare(newVec2(-1000, 0), 1000)
      const polygon2 = createSquare(newVec2(1000, 0), 1000)
      map.addConstantArea(polygon1, 100)
      map.addConstantArea(polygon2, 200)
      const line = createLine(newVec2(-2000, 0), newVec2(2000, 0))
      const result = map.getOffsets(line)
      const nullAfterItems = result.filter(r => 'nullAfter' in r && r.nullAfter)
      expect(nullAfterItems).toHaveLength(1)
      expect(nullAfterItems[0]).toEqual(result[result.length - 1])
    })

    test('no duplicate positions', () => {
      const map = new VerticalOffsetMap(0)
      const polygon1 = createSquare(newVec2(-1000, 0), 1000)
      const polygon2 = createSquare(newVec2(1000, 0), 1000)
      map.addConstantArea(polygon1, 100)
      map.addConstantArea(polygon2, 200)
      const line = createLine(newVec2(-2000, 0), newVec2(2000, 0))
      const result = map.getOffsets(line)
      const positions = result.map(r => r.position)
      const uniquePositions = new Set(positions)
      expect(positions.length).toBe(uniquePositions.size)
    })
  })

  describe('real-world scenarios', () => {
    test('gable roof', () => {
      const map = new VerticalOffsetMap(0)
      const leftSlope = createSquare(newVec2(-3000, 0), 6000)
      const rightSlope = createSquare(newVec2(3000, 0), 6000)
      const angle = 30 * (Math.PI / 180)
      const ridgeHeight = 2000
      map.addSlopedArea(leftSlope, newVec2(0, 0), newVec2(-1, 0), angle, ridgeHeight)
      map.addSlopedArea(rightSlope, newVec2(0, 0), newVec2(1, 0), angle, ridgeHeight)
      const line = createLine(newVec2(-7000, 0), newVec2(7000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({
          position: expect.closeTo(0.071, 3),
          offsetBefore: 0,
          offsetAfter: expect.closeTo(-1464.1, 2)
        }),
        expect.objectContaining({ position: expect.closeTo(0.5, 3), offset: 2000 }),
        expect.objectContaining({
          position: expect.closeTo(0.929, 3),
          offsetBefore: expect.closeTo(-1464.1, 2),
          offsetAfter: 0
        }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })

    test('shed roof', () => {
      const map = new VerticalOffsetMap(0)
      const roof = createSquare(newVec2(0, 0), 8000)
      const angle = 5 * (Math.PI / 180)
      const ridgeHeight = 2500
      map.addSlopedArea(roof, newVec2(4000, 0), newVec2(-1, 0), angle, ridgeHeight)
      const line = createLine(newVec2(-5000, 0), newVec2(5000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({
          position: expect.closeTo(0.1, 3),
          offsetBefore: 0,
          offsetAfter: expect.closeTo(1800.09, 2)
        }),
        expect.objectContaining({ position: expect.closeTo(0.9, 3), offsetBefore: 2500, offsetAfter: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })

    test('flat roof with raised section', () => {
      const map = new VerticalOffsetMap(0)
      const mainRoof = createSquare(newVec2(0, 0), 8000)
      const raisedSection = createSquare(newVec2(0, 0), 3000)
      map.addConstantArea(mainRoof, 200)
      map.addConstantArea(raisedSection, 400)
      const line = createLine(newVec2(-5000, 0), newVec2(5000, 0))
      const result = map.getOffsets(line)
      expect(result).toEqual([
        expect.objectContaining({ position: 0, offset: 0 }),
        expect.objectContaining({ position: expect.closeTo(0.1, 3), offsetBefore: 0, offsetAfter: 200 }),
        expect.objectContaining({ position: expect.closeTo(0.35, 3), offsetBefore: 200, offsetAfter: 400 }),
        expect.objectContaining({ position: expect.closeTo(0.65, 3), offsetBefore: 400, offsetAfter: 200 }),
        expect.objectContaining({ position: expect.closeTo(0.9, 3), offsetBefore: 200, offsetAfter: 0 }),
        expect.objectContaining({ position: 1, offset: 0 })
      ])
    })
  })
})
