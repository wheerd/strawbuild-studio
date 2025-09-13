import { describe, it, expect } from 'vitest'
import type { Opening } from '@/model'
import type { Length } from '@/types/geometry'
import { createOpeningId } from '@/types/ids'
import { segmentWall, createConstructionElementId, type WallSegment } from './base'

const createTestOpening = (overrides: Partial<Opening> = {}): Opening => ({
  id: createOpeningId(),
  type: 'window',
  offsetFromStart: 1000 as Length,
  width: 800 as Length,
  height: 1200 as Length,
  sillHeight: 900 as Length,
  ...overrides
})

describe('segmentWall', () => {
  describe('basic segmentation', () => {
    it('creates single wall segment when no openings', () => {
      const wallLength = 5000 as Length
      const openings: Opening[] = []

      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        type: 'wall',
        position: 0,
        width: 5000,
        constructionType: 'infill'
      })
    })

    it('creates segments with single opening in middle', () => {
      const wallLength = 5000 as Length
      const opening = createTestOpening({
        offsetFromStart: 2000 as Length,
        width: 800 as Length
      })
      const openings = [opening]

      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(3)

      // First wall segment
      expect(result[0]).toEqual({
        type: 'wall',
        position: 0,
        width: 2000,
        constructionType: 'infill'
      })

      // Opening segment
      expect(result[1]).toEqual({
        type: 'opening',
        position: 2000,
        width: 800,
        opening
      })

      // Final wall segment
      expect(result[2]).toEqual({
        type: 'wall',
        position: 2800,
        width: 2200,
        constructionType: 'infill'
      })
    })

    it('creates segments with opening at start', () => {
      const wallLength = 3000 as Length
      const opening = createTestOpening({
        offsetFromStart: 0 as Length,
        width: 800 as Length
      })
      const openings = [opening]

      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(2)

      // Opening segment at start
      expect(result[0]).toEqual({
        type: 'opening',
        position: 0,
        width: 800,
        opening
      })

      // Wall segment after opening
      expect(result[1]).toEqual({
        type: 'wall',
        position: 800,
        width: 2200,
        constructionType: 'infill'
      })
    })

    it('creates segments with opening at end', () => {
      const wallLength = 3000 as Length
      const opening = createTestOpening({
        offsetFromStart: 2200 as Length,
        width: 800 as Length
      })
      const openings = [opening]

      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(2)

      // Wall segment before opening
      expect(result[0]).toEqual({
        type: 'wall',
        position: 0,
        width: 2200,
        constructionType: 'infill'
      })

      // Opening segment at end
      expect(result[1]).toEqual({
        type: 'opening',
        position: 2200,
        width: 800,
        opening
      })
    })
  })

  describe('multiple openings', () => {
    it('creates segments with multiple openings', () => {
      const wallLength = 6000 as Length
      const opening1 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 800 as Length,
        type: 'door'
      })
      const opening2 = createTestOpening({
        offsetFromStart: 3000 as Length,
        width: 1000 as Length,
        type: 'window'
      })
      const openings = [opening1, opening2]

      const result = segmentWall(wallLength, openings, 'strawhenge')

      expect(result).toHaveLength(5)

      // First wall segment
      expect(result[0]).toEqual({
        type: 'wall',
        position: 0,
        width: 1000,
        constructionType: 'strawhenge'
      })

      // First opening
      expect(result[1]).toEqual({
        type: 'opening',
        position: 1000,
        width: 800,
        opening: opening1
      })

      // Middle wall segment
      expect(result[2]).toEqual({
        type: 'wall',
        position: 1800,
        width: 1200,
        constructionType: 'strawhenge'
      })

      // Second opening
      expect(result[3]).toEqual({
        type: 'opening',
        position: 3000,
        width: 1000,
        opening: opening2
      })

      // Final wall segment
      expect(result[4]).toEqual({
        type: 'wall',
        position: 4000,
        width: 2000,
        constructionType: 'strawhenge'
      })
    })

    it('handles openings in unsorted order', () => {
      const wallLength = 5000 as Length
      const opening1 = createTestOpening({
        offsetFromStart: 3000 as Length,
        width: 600 as Length
      })
      const opening2 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 800 as Length
      })
      // Provide openings in reverse order
      const openings = [opening1, opening2]

      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(5)

      // Should be sorted by position automatically
      expect(result[0].type).toBe('wall')
      expect(result[0].position).toBe(0)
      expect(result[0].width).toBe(1000)

      expect(result[1].type).toBe('opening')
      expect(result[1].position).toBe(1000)
      expect(result[1].opening).toBe(opening2)

      expect(result[2].type).toBe('wall')
      expect(result[2].position).toBe(1800)
      expect(result[2].width).toBe(1200)

      expect(result[3].type).toBe('opening')
      expect(result[3].position).toBe(3000)
      expect(result[3].opening).toBe(opening1)

      expect(result[4].type).toBe('wall')
      expect(result[4].position).toBe(3600)
      expect(result[4].width).toBe(1400)
    })

    it('handles adjacent openings', () => {
      const wallLength = 4000 as Length
      const opening1 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 800 as Length
      })
      const opening2 = createTestOpening({
        offsetFromStart: 1800 as Length,
        width: 600 as Length
      })
      const openings = [opening1, opening2]

      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(4)

      // Wall before openings
      expect(result[0]).toEqual({
        type: 'wall',
        position: 0,
        width: 1000,
        constructionType: 'infill'
      })

      // First opening
      expect(result[1]).toEqual({
        type: 'opening',
        position: 1000,
        width: 800,
        opening: opening1
      })

      // Second opening (adjacent)
      expect(result[2]).toEqual({
        type: 'opening',
        position: 1800,
        width: 600,
        opening: opening2
      })

      // Wall after openings
      expect(result[3]).toEqual({
        type: 'wall',
        position: 2400,
        width: 1600,
        constructionType: 'infill'
      })
    })
  })

  describe('edge cases', () => {
    it('handles opening that fills entire wall', () => {
      const wallLength = 2000 as Length
      const opening = createTestOpening({
        offsetFromStart: 0 as Length,
        width: 2000 as Length
      })
      const openings = [opening]

      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        type: 'opening',
        position: 0,
        width: 2000,
        opening
      })
    })

    it('handles very small wall segments', () => {
      const wallLength = 1000 as Length
      const opening = createTestOpening({
        offsetFromStart: 100 as Length,
        width: 800 as Length
      })
      const openings = [opening]

      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(3)

      // Small wall segment before
      expect(result[0].width).toBe(100)

      // Opening
      expect(result[1].width).toBe(800)

      // Small wall segment after
      expect(result[2].width).toBe(100)
    })
  })

  describe('error handling', () => {
    it('throws error when opening extends beyond wall', () => {
      const wallLength = 3000 as Length
      const opening = createTestOpening({
        offsetFromStart: 2500 as Length,
        width: 800 as Length // extends to 3300, beyond wall length of 3000
      })
      const openings = [opening]

      expect(() => {
        segmentWall(wallLength, openings, 'infill')
      }).toThrow('Opening extends beyond wall length: opening ends at 3300mm but wall is only 3000mm long')
    })

    it('throws error when openings overlap', () => {
      const wallLength = 5000 as Length
      const opening1 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 1000 as Length // ends at 2000
      })
      const opening2 = createTestOpening({
        offsetFromStart: 1500 as Length, // starts at 1500, overlaps with opening1
        width: 800 as Length
      })
      const openings = [opening1, opening2]

      expect(() => {
        segmentWall(wallLength, openings, 'infill')
      }).toThrow('Opening overlaps with previous segment: opening starts at 1500mm but previous segment ends at 2000mm')
    })

    it('throws error when second opening starts before first ends', () => {
      const wallLength = 5000 as Length
      const opening1 = createTestOpening({
        offsetFromStart: 2000 as Length,
        width: 800 as Length // ends at 2800
      })
      const opening2 = createTestOpening({
        offsetFromStart: 2700 as Length, // starts before opening1 ends
        width: 600 as Length
      })
      const openings = [opening1, opening2]

      expect(() => {
        segmentWall(wallLength, openings, 'infill')
      }).toThrow('Opening overlaps with previous segment: opening starts at 2700mm but previous segment ends at 2800mm')
    })
  })

  describe('construction type parameter', () => {
    it('uses provided construction type for wall segments', () => {
      const wallLength = 3000 as Length
      const opening = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 800 as Length
      })
      const openings = [opening]

      const result = segmentWall(wallLength, openings, 'strawhenge')

      const wallSegments = result.filter(s => s.type === 'wall') as WallSegment[]
      wallSegments.forEach(segment => {
        expect(segment.constructionType).toBe('strawhenge')
      })
    })

    it('defaults to infill construction type', () => {
      const wallLength = 2000 as Length
      const openings: Opening[] = []

      const result = segmentWall(wallLength, openings) // no construction type specified

      expect(result[0].constructionType).toBe('infill')
    })
  })

  describe('additional edge cases and stress tests', () => {
    it('handles maximum number of openings without performance issues', () => {
      const wallLength = 20000 as Length
      const openings: Opening[] = []

      // Create 20 openings evenly spaced
      for (let i = 0; i < 20; i++) {
        openings.push(
          createTestOpening({
            offsetFromStart: (i * 1000) as Length,
            width: 500 as Length
          })
        )
      }

      const startTime = performance.now()
      const result = segmentWall(wallLength, openings, 'infill')
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100) // Should complete in < 100ms
      expect(result).toHaveLength(40) // 20 openings + 20 wall segments (including final segment)
    })

    it('maintains precision with very small dimensions', () => {
      const wallLength = 100 as Length
      const opening = createTestOpening({
        offsetFromStart: 50 as Length,
        width: 10 as Length
      })
      const openings = [opening]

      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(3)
      expect(result[0].width).toBe(50)
      expect(result[1].width).toBe(10)
      expect(result[2].width).toBe(40)

      // Check total equals original wall length
      const totalWidth = result.reduce((sum, segment) => sum + segment.width, 0)
      expect(totalWidth).toBe(wallLength)
    })

    it('handles very large wall dimensions', () => {
      const wallLength = 100000 as Length // 100 meters
      const opening = createTestOpening({
        offsetFromStart: 50000 as Length,
        width: 2000 as Length
      })
      const openings = [opening]

      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(3)
      expect(result[0].width).toBe(50000)
      expect(result[1].width).toBe(2000)
      expect(result[2].width).toBe(48000)
    })

    it('validates opening sequence is monotonically increasing', () => {
      const wallLength = 5000 as Length
      const opening1 = createTestOpening({
        offsetFromStart: 2000 as Length,
        width: 500 as Length
      })
      const opening2 = createTestOpening({
        offsetFromStart: 1500 as Length, // Earlier position
        width: 400 as Length
      })
      const openings = [opening1, opening2] // Out of order

      // Should handle out-of-order openings by sorting them
      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(5)
      // First opening should be at position 1500 after sorting
      expect(result[1].type).toBe('opening')
      expect(result[1].position).toBe(1500)
      expect(result[3].type).toBe('opening')
      expect(result[3].position).toBe(2000)
    })

    it('handles floating point precision in calculations', () => {
      const wallLength = 1000.1 as Length
      const opening = createTestOpening({
        offsetFromStart: 333.33 as Length,
        width: 333.34 as Length
      })
      const openings = [opening]

      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(3)

      // Check floating point calculations are handled correctly
      const totalWidth = result.reduce((sum, segment) => sum + segment.width, 0)
      expect(Math.abs(totalWidth - wallLength)).toBeLessThan(0.001) // Within 1μm tolerance
    })

    it('preserves opening references in segments', () => {
      const wallLength = 3000 as Length
      const opening1 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 500 as Length,
        type: 'door'
      })
      const opening2 = createTestOpening({
        offsetFromStart: 2000 as Length,
        width: 600 as Length,
        type: 'window'
      })
      const openings = [opening1, opening2]

      const result = segmentWall(wallLength, openings, 'infill')

      const openingSegments = result.filter(s => s.type === 'opening')
      expect(openingSegments).toHaveLength(2)

      expect(openingSegments[0].opening).toBe(opening1)
      expect(openingSegments[1].opening).toBe(opening2)
      expect(openingSegments[0].opening!.type).toBe('door')
      expect(openingSegments[1].opening!.type).toBe('window')
    })

    it('handles wall with only openings (no wall segments)', () => {
      const wallLength = 800 as Length
      const opening = createTestOpening({
        offsetFromStart: 0 as Length,
        width: 800 as Length // Fills entire wall
      })
      const openings = [opening]

      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('opening')
      expect(result[0].width).toBe(wallLength)
    })

    it('validates all segments have positive widths', () => {
      const wallLength = 5000 as Length
      const openings = [
        createTestOpening({ offsetFromStart: 1000 as Length, width: 800 as Length }),
        createTestOpening({ offsetFromStart: 3000 as Length, width: 600 as Length })
      ]

      const result = segmentWall(wallLength, openings, 'infill')

      result.forEach(segment => {
        expect(segment.width).toBeGreaterThan(0)
      })
    })

    it('maintains segment position continuity', () => {
      const wallLength = 6000 as Length
      const openings = [
        createTestOpening({ offsetFromStart: 1500 as Length, width: 700 as Length }),
        createTestOpening({ offsetFromStart: 3500 as Length, width: 800 as Length })
      ]

      const result = segmentWall(wallLength, openings, 'infill')

      // Check that each segment starts where the previous one ends
      for (let i = 1; i < result.length; i++) {
        const prevSegmentEnd = result[i - 1].position + result[i - 1].width
        expect(result[i].position).toBe(prevSegmentEnd)
      }
    })

    it('handles identical opening positions (should throw error)', () => {
      const wallLength = 3000 as Length
      const opening1 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 500 as Length
      })
      const opening2 = createTestOpening({
        offsetFromStart: 1000 as Length, // Same position
        width: 400 as Length
      })
      const openings = [opening1, opening2]

      expect(() => {
        segmentWall(wallLength, openings, 'infill')
      }).toThrow('Opening overlaps with previous segment')
    })

    it('handles zero-width openings', () => {
      const wallLength = 2000 as Length
      const opening = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 0 as Length
      })
      const openings = [opening]

      const result = segmentWall(wallLength, openings, 'infill')

      expect(result).toHaveLength(3)
      expect(result[1].width).toBe(0)
      expect(result[1].type).toBe('opening')
    })
  })

  describe('construction element utilities', () => {
    it('creates unique construction element IDs', () => {
      const ids = new Set()
      for (let i = 0; i < 1000; i++) {
        const id = createConstructionElementId()
        expect(ids.has(id)).toBe(false)
        ids.add(id)
      }
    })

    it('creates construction element IDs with expected format', () => {
      const id = createConstructionElementId()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(10) // Should be reasonably long for uniqueness
    })
  })
})
