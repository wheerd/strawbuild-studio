import { describe, expect, it } from 'vitest'

import { createOpeningId, createPerimeterConstructionMethodId, createPerimeterWallId } from '@/building/model/ids'
import type { Opening, PerimeterWall } from '@/building/model/model'
import type { LayersConfig } from '@/construction/config/types'
import type { Length } from '@/shared/geometry'
import { createLength } from '@/shared/geometry'

import { segmentWall } from './segmentation'

const createTestOpening = (overrides: Partial<Opening> = {}): Opening => ({
  id: createOpeningId(),
  type: 'window',
  offsetFromStart: 1000 as Length,
  width: 800 as Length,
  height: 1200 as Length,
  sillHeight: 900 as Length,
  ...overrides
})

const createTestLayersConfig = (): LayersConfig => ({
  insideThickness: createLength(20),
  outsideThickness: createLength(20)
})

const createTestWall = (overrides: Partial<PerimeterWall> = {}): PerimeterWall => ({
  id: createPerimeterWallId(),
  thickness: 360 as Length,
  constructionMethodId: createPerimeterConstructionMethodId(),
  openings: [],
  insideLength: 5000 as Length,
  outsideLength: 5000 as Length,
  wallLength: 5000 as Length,
  insideLine: { start: [0, 0], end: [5000, 0] },
  outsideLine: { start: [0, 360], end: [5000, 360] },
  direction: [1, 0],
  outsideDirection: [0, 1],
  ...overrides
})

describe('segmentWall', () => {
  describe('basic segmentation', () => {
    it('creates single wall segment when no openings', () => {
      const wall = createTestWall({
        wallLength: 5000 as Length,
        thickness: 360 as Length,
        openings: []
      })
      const wallHeight = 2500 as Length

      const result = segmentWall(wall, wallHeight, wall.insideLength, 0 as Length, createTestLayersConfig())

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        type: 'wall',
        position: [0, 20, 0],
        size: [5000, 320, 2500]
      })
    })

    it('creates segments with single opening in middle', () => {
      const opening = createTestOpening({
        offsetFromStart: 2000 as Length,
        width: 800 as Length
      })
      const wall = createTestWall({
        wallLength: 5000 as Length,
        insideLength: 5000 as Length, // Match wallLength
        thickness: 360 as Length,
        constructionMethodId: createPerimeterConstructionMethodId(),
        openings: [opening]
      })
      const wallHeight = 2500 as Length

      const result = segmentWall(wall, wallHeight, wall.insideLength, 0 as Length, createTestLayersConfig())

      expect(result).toHaveLength(3)

      // First wall segment
      expect(result[0]).toEqual({
        type: 'wall',
        position: [0, 20, 0],
        size: [2000, 320, 2500]
      })

      // Opening segment
      expect(result[1]).toEqual({
        type: 'opening',
        position: [2000, 20, 0],
        size: [800, 320, 2500],
        openings: [opening]
      })

      // Final wall segment
      expect(result[2]).toEqual({
        type: 'wall',
        position: [2800, 20, 0],
        size: [2200, 320, 2500]
      })
    })

    it('creates segments with opening at start', () => {
      const opening = createTestOpening({
        offsetFromStart: 0 as Length,
        width: 800 as Length
      })
      const wall = createTestWall({
        wallLength: 3000 as Length,
        insideLength: 3000 as Length, // Match wallLength
        thickness: 360 as Length,
        constructionMethodId: createPerimeterConstructionMethodId(),
        openings: [opening]
      })
      const wallHeight = 2500 as Length

      const result = segmentWall(wall, wallHeight, wall.insideLength, 0 as Length, createTestLayersConfig())

      expect(result).toHaveLength(2)

      // Opening segment at start
      expect(result[0]).toEqual({
        type: 'opening',
        position: [0, 20, 0],
        size: [800, 320, 2500],
        openings: [opening]
      })

      // Wall segment after opening
      expect(result[1]).toEqual({
        type: 'wall',
        position: [800, 20, 0],
        size: [2200, 320, 2500]
      })
    })

    it('creates segments with opening at end', () => {
      const opening = createTestOpening({
        offsetFromStart: 2200 as Length,
        width: 800 as Length
      })
      const wall = createTestWall({
        wallLength: 3000 as Length,
        insideLength: 3000 as Length, // Match wallLength
        thickness: 360 as Length,
        constructionMethodId: createPerimeterConstructionMethodId(),
        openings: [opening]
      })
      const wallHeight = 2500 as Length

      const result = segmentWall(wall, wallHeight, wall.insideLength, 0 as Length, createTestLayersConfig())

      expect(result).toHaveLength(2)

      // Wall segment before opening
      expect(result[0]).toEqual({
        type: 'wall',
        position: [0, 20, 0],
        size: [2200, 320, 2500]
      })

      // Opening segment at end
      expect(result[1]).toEqual({
        type: 'opening',
        position: [2200, 20, 0],
        size: [800, 320, 2500],
        openings: [opening]
      })
    })
  })

  describe('multiple openings', () => {
    it('creates segments with multiple openings', () => {
      const opening1 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 800 as Length,
        type: 'door',
        sillHeight: 0 as Length // Different from opening2
      })
      const opening2 = createTestOpening({
        offsetFromStart: 3000 as Length,
        width: 1000 as Length,
        type: 'window',
        sillHeight: 900 as Length // Different from opening1
      })
      const wall = createTestWall({
        wallLength: 6000 as Length,
        insideLength: 6000 as Length, // Match wallLength
        thickness: 360 as Length,
        constructionMethodId: createPerimeterConstructionMethodId(),
        openings: [opening1, opening2]
      })
      const wallHeight = 2500 as Length

      const result = segmentWall(wall, wallHeight, wall.insideLength, 0 as Length, createTestLayersConfig())

      expect(result).toHaveLength(5)

      // First wall segment
      expect(result[0]).toEqual({
        type: 'wall',
        position: [0, 20, 0],
        size: [1000, 320, 2500]
      })

      // First opening
      expect(result[1]).toEqual({
        type: 'opening',
        position: [1000, 20, 0],
        size: [800, 320, 2500],
        openings: [opening1]
      })

      // Middle wall segment
      expect(result[2]).toEqual({
        type: 'wall',
        position: [1800, 20, 0],
        size: [1200, 320, 2500]
      })

      // Second opening
      expect(result[3]).toEqual({
        type: 'opening',
        position: [3000, 20, 0],
        size: [1000, 320, 2500],
        openings: [opening2]
      })

      // Final wall segment
      expect(result[4]).toEqual({
        type: 'wall',
        position: [4000, 20, 0],
        size: [2000, 320, 2500]
      })
    })

    it('handles openings in unsorted order', () => {
      const opening1 = createTestOpening({
        offsetFromStart: 3000 as Length,
        width: 600 as Length,
        sillHeight: 900 as Length
      })
      const opening2 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 800 as Length,
        sillHeight: 800 as Length // Different sill height to prevent merging
      })
      const wall = createTestWall({
        wallLength: 5000 as Length,
        insideLength: 5000 as Length, // Match wallLength
        thickness: 360 as Length,
        constructionMethodId: createPerimeterConstructionMethodId(),
        openings: [opening1, opening2] // Provide openings in reverse order
      })
      const wallHeight = 2500 as Length

      const result = segmentWall(wall, wallHeight, wall.insideLength, 0 as Length, createTestLayersConfig())

      expect(result).toHaveLength(5)

      // Should be sorted by position automatically
      expect(result[0].type).toBe('wall')
      expect(result[0].position).toEqual([0, 20, 0])
      expect(result[0].size).toEqual([1000, 320, 2500])

      expect(result[1].type).toBe('opening')
      expect(result[1].position).toEqual([1000, 20, 0])
      expect(result[1].openings).toEqual([opening2])

      expect(result[2].type).toBe('wall')
      expect(result[2].position).toEqual([1800, 20, 0])
      expect(result[2].size).toEqual([1200, 320, 2500])

      expect(result[3].type).toBe('opening')
      expect(result[3].position).toEqual([3000, 20, 0])
      expect(result[3].openings).toEqual([opening1])

      expect(result[4].type).toBe('wall')
      expect(result[4].position).toEqual([3600, 20, 0])
      expect(result[4].size).toEqual([1400, 320, 2500])
    })

    it('merges adjacent openings with same sill and header heights', () => {
      const opening1 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 800 as Length,
        sillHeight: 900 as Length,
        height: 1200 as Length
      })
      const opening2 = createTestOpening({
        offsetFromStart: 1800 as Length,
        width: 600 as Length,
        sillHeight: 900 as Length,
        height: 1200 as Length
      })
      const wall = createTestWall({
        wallLength: 4000 as Length,
        insideLength: 4000 as Length, // Match wallLength
        thickness: 360 as Length,
        constructionMethodId: createPerimeterConstructionMethodId(),
        openings: [opening1, opening2]
      })
      const wallHeight = 2500 as Length

      const result = segmentWall(wall, wallHeight, wall.insideLength, 0 as Length, createTestLayersConfig())

      expect(result).toHaveLength(3)

      // Wall before openings
      expect(result[0]).toEqual({
        type: 'wall',
        position: [0, 20, 0],
        size: [1000, 320, 2500]
      })

      // Merged opening segment
      expect(result[1]).toEqual({
        type: 'opening',
        position: [1000, 20, 0],
        size: [1400, 320, 2500],
        openings: [opening1, opening2]
      })

      // Wall after openings
      expect(result[2]).toEqual({
        type: 'wall',
        position: [2400, 20, 0],
        size: [1600, 320, 2500]
      })
    })

    it('does not merge adjacent openings with different sill heights', () => {
      const opening1 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 800 as Length,
        sillHeight: 900 as Length,
        height: 1200 as Length
      })
      const opening2 = createTestOpening({
        offsetFromStart: 1800 as Length,
        width: 600 as Length,
        sillHeight: 1000 as Length, // Different sill height
        height: 1200 as Length
      })
      const wall = createTestWall({
        wallLength: 4000 as Length,
        insideLength: 4000 as Length, // Match wallLength
        thickness: 360 as Length,
        constructionMethodId: createPerimeterConstructionMethodId(),
        openings: [opening1, opening2]
      })
      const wallHeight = 2500 as Length

      const result = segmentWall(wall, wallHeight, wall.insideLength, 0 as Length, createTestLayersConfig())

      expect(result).toHaveLength(4)

      // Should not merge - keeps separate opening segments
      expect(result[1]).toEqual({
        type: 'opening',
        position: [1000, 20, 0],
        size: [800, 320, 2500],
        openings: [opening1]
      })

      expect(result[2]).toEqual({
        type: 'opening',
        position: [1800, 20, 0],
        size: [600, 320, 2500],
        openings: [opening2]
      })
    })
  })

  describe('edge cases', () => {
    it('handles opening that fills entire wall', () => {
      const opening = createTestOpening({
        offsetFromStart: 0 as Length,
        width: 2000 as Length
      })
      const wall = createTestWall({
        wallLength: 2000 as Length,
        insideLength: 2000 as Length, // Match wallLength
        thickness: 360 as Length,
        constructionMethodId: createPerimeterConstructionMethodId(),
        openings: [opening]
      })
      const wallHeight = 2500 as Length

      const result = segmentWall(wall, wallHeight, wall.insideLength, 0 as Length, createTestLayersConfig())

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        type: 'opening',
        position: [0, 20, 0],
        size: [2000, 320, 2500],
        openings: [opening]
      })
    })

    it('handles very small wall segments', () => {
      const opening = createTestOpening({
        offsetFromStart: 100 as Length,
        width: 800 as Length
      })
      const wall = createTestWall({
        wallLength: 1000 as Length,
        insideLength: 1000 as Length, // Match wallLength
        thickness: 360 as Length,
        constructionMethodId: createPerimeterConstructionMethodId(),
        openings: [opening]
      })
      const wallHeight = 2500 as Length

      const result = segmentWall(wall, wallHeight, wall.insideLength, 0 as Length, createTestLayersConfig())

      expect(result).toHaveLength(3)

      // Small wall segment before
      expect(result[0].size).toEqual([100, 320, 2500])

      // Opening
      expect(result[1].size).toEqual([800, 320, 2500])

      // Small wall segment after
      expect(result[2].size).toEqual([100, 320, 2500])
    })
  })

  describe('error handling', () => {
    it('throws error when opening extends beyond wall', () => {
      const opening = createTestOpening({
        offsetFromStart: 2500 as Length,
        width: 800 as Length // extends to 3300, beyond wall length of 3000
      })
      const wall = createTestWall({
        wallLength: 3000 as Length,
        insideLength: 3000 as Length, // Match wallLength
        thickness: 360 as Length,
        constructionMethodId: createPerimeterConstructionMethodId(),
        openings: [opening]
      })
      const wallHeight = 2500 as Length

      expect(() => {
        segmentWall(wall, wallHeight, wall.insideLength, 0 as Length, createTestLayersConfig())
      }).toThrow('Opening extends beyond wall length')
    })

    it('throws error when openings overlap', () => {
      const opening1 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 1000 as Length // ends at 2000
      })
      const opening2 = createTestOpening({
        offsetFromStart: 1500 as Length, // starts at 1500, overlaps with opening1
        width: 800 as Length
      })
      const wall = createTestWall({
        wallLength: 5000 as Length,
        insideLength: 5000 as Length, // Match wallLength
        thickness: 360 as Length,
        constructionMethodId: createPerimeterConstructionMethodId(),
        openings: [opening1, opening2]
      })
      const wallHeight = 2500 as Length

      expect(() => {
        segmentWall(wall, wallHeight, wall.insideLength, 0 as Length, createTestLayersConfig())
      }).toThrow('Opening overlaps with previous segment')
    })

    it('throws error when second opening starts before first ends', () => {
      const opening1 = createTestOpening({
        offsetFromStart: 2000 as Length,
        width: 800 as Length // ends at 2800
      })
      const opening2 = createTestOpening({
        offsetFromStart: 2700 as Length, // starts before opening1 ends
        width: 600 as Length
      })
      const wall = createTestWall({
        wallLength: 5000 as Length,
        insideLength: 5000 as Length, // Match wallLength
        thickness: 360 as Length,
        constructionMethodId: createPerimeterConstructionMethodId(),
        openings: [opening1, opening2]
      })
      const wallHeight = 2500 as Length

      expect(() => {
        segmentWall(wall, wallHeight, wall.insideLength, 0 as Length, createTestLayersConfig())
      }).toThrow('Opening overlaps with previous segment')
    })
  })
})
