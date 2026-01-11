import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OpeningId, PerimeterId, PerimeterWallId, StoreyId } from '@/building/model/ids'
import { createWallAssemblyId } from '@/building/model/ids'
import type { PerimetersSlice } from '@/building/store/slices/perimeterSlice'
import { ensurePolygonIsClockwise, wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'

import {
  createLShapedBoundary,
  createRectangularBoundary,
  expectNoOrphanedEntities,
  expectThrowsForInvalidId,
  setupPerimeterSlice
} from './testHelpers'

vi.mock('@/shared/geometry/polygon', async importOriginal => {
  return {
    ...(await importOriginal()),
    wouldClosingPolygonSelfIntersect: vi.fn(),
    ensurePolygonIsClockwise: vi.fn()
  }
})

const wouldClosingPolygonSelfIntersectMock = vi.mocked(wouldClosingPolygonSelfIntersect)
const ensurePolygonIsClockwiseMock = vi.mocked(ensurePolygonIsClockwise)

describe('openingSlice', () => {
  let slice: PerimetersSlice
  let testStoreyId: StoreyId
  let perimeterId: PerimeterId
  let wallId: PerimeterWallId

  beforeEach(() => {
    wouldClosingPolygonSelfIntersectMock.mockReset()
    wouldClosingPolygonSelfIntersectMock.mockReturnValue(false)
    ensurePolygonIsClockwiseMock.mockReset()
    ensurePolygonIsClockwiseMock.mockImplementation(p => p)

    const setup = setupPerimeterSlice()
    slice = setup.slice
    testStoreyId = setup.testStoreyId

    // Create a default perimeter for testing
    const boundary = createRectangularBoundary()
    const wallAssemblyId = createWallAssemblyId()
    const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
    perimeterId = perimeter.id
    wallId = perimeter.wallIds[0]
  })

  describe('Basic Opening CRUD', () => {
    describe('addWallOpening', () => {
      it('should create opening with correct wall reference', () => {
        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        expect(opening).toBeTruthy()
        expect(opening.wallId).toBe(wallId)
        expect(opening.openingType).toBe('door')
        expect(opening.centerOffsetFromWallStart).toBe(2000)
        expect(opening.width).toBe(900)
        expect(opening.height).toBe(2100)

        // Verify it's also in the state
        const storedOpening = slice.openings[opening.id]
        expect(storedOpening).toBeDefined()
      })

      it('should update wall entityIds array', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        const originalEntityCount = wall.entityIds.length

        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'window',
          centerOffsetFromWallStart: 2000,
          width: 1200,
          height: 1500
        })

        const updatedWall = slice.actions.getPerimeterWallById(wallId)
        expect(updatedWall.entityIds).toHaveLength(originalEntityCount + 1)
        expect(updatedWall.entityIds).toContain(opening.id)
      })

      it('should create opening geometry', () => {
        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        expect(slice._openingGeometry[opening.id]).toBeDefined()
        const geometry = slice._openingGeometry[opening.id]
        expect(geometry.polygon).toBeDefined()
        expect(geometry.polygon.points).toHaveLength(4)
      })

      it('should reject invalid width (zero)', () => {
        expect(() =>
          slice.actions.addWallOpening(wallId, {
            openingType: 'door',
            centerOffsetFromWallStart: 2000,
            width: 0,
            height: 2100
          })
        ).toThrow()
      })

      it('should reject invalid width (negative)', () => {
        expect(() =>
          slice.actions.addWallOpening(wallId, {
            openingType: 'door',
            centerOffsetFromWallStart: 2000,
            width: -100,
            height: 2100
          })
        ).toThrow()
      })

      it('should reject invalid height (zero)', () => {
        expect(() =>
          slice.actions.addWallOpening(wallId, {
            openingType: 'door',
            centerOffsetFromWallStart: 2000,
            width: 900,
            height: 0
          })
        ).toThrow()
      })

      it('should reject invalid height (negative)', () => {
        expect(() =>
          slice.actions.addWallOpening(wallId, {
            openingType: 'door',
            centerOffsetFromWallStart: 2000,
            width: 900,
            height: -100
          })
        ).toThrow()
      })

      it('should reject invalid placement', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)

        // Try to place opening beyond wall length
        expect(() =>
          slice.actions.addWallOpening(wallId, {
            openingType: 'door',
            centerOffsetFromWallStart: wall.wallLength + 1000,
            width: 900,
            height: 2100
          })
        ).toThrow()
      })

      it('should reject overlapping openings', () => {
        // Add first opening
        slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        // Try to add overlapping opening
        expect(() =>
          slice.actions.addWallOpening(wallId, {
            openingType: 'window',
            centerOffsetFromWallStart: 2200,
            width: 1200,
            height: 1500
          })
        ).toThrow()
      })
    })

    describe('removeWallOpening', () => {
      let openingId: OpeningId

      beforeEach(() => {
        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })
        openingId = opening.id
      })

      it('should remove opening from state', () => {
        slice.actions.removeWallOpening(openingId)

        expect(slice.openings[openingId]).toBeUndefined()
      })

      it('should update wall entityIds array', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        expect(wall.entityIds).toContain(openingId)

        slice.actions.removeWallOpening(openingId)

        const updatedWall = slice.actions.getPerimeterWallById(wallId)
        expect(updatedWall.entityIds).not.toContain(openingId)
      })

      it('should clean up opening geometry', () => {
        expect(slice._openingGeometry[openingId]).toBeDefined()

        slice.actions.removeWallOpening(openingId)

        expect(slice._openingGeometry[openingId]).toBeUndefined()
      })

      it('should have no orphaned entities after removal', () => {
        slice.actions.removeWallOpening(openingId)

        expectNoOrphanedEntities(slice)
      })

      it('should not throw for non-existent opening', () => {
        expect(() => {
          slice.actions.removeWallOpening('opening_fake' as any)
        }).not.toThrow()
      })
    })

    describe('updateWallOpening', () => {
      let openingId: OpeningId

      beforeEach(() => {
        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })
        openingId = opening.id
      })

      it('should update opening properties', () => {
        slice.actions.updateWallOpening(openingId, {
          centerOffsetFromWallStart: 3000,
          width: 1000,
          height: 2200
        })

        const opening = slice.openings[openingId]
        expect(opening.centerOffsetFromWallStart).toBe(3000)
        expect(opening.width).toBe(1000)
        expect(opening.height).toBe(2200)
      })

      it('should recalculate opening geometry', () => {
        const originalGeometry = slice._openingGeometry[openingId]

        slice.actions.updateWallOpening(openingId, {
          centerOffsetFromWallStart: 3000
        })

        const updatedGeometry = slice._openingGeometry[openingId]
        expect(updatedGeometry).not.toEqual(originalGeometry)
      })

      it('should reject invalid updates', () => {
        const originalOpening = { ...slice.openings[openingId] }

        slice.actions.updateWallOpening(openingId, {
          width: 0
        })

        // Opening should be unchanged
        const opening = slice.openings[openingId]
        expect(opening.width).toBe(originalOpening.width)
      })

      it('should throw for non-existent opening', () => {
        expect(() => {
          slice.actions.updateWallOpening('opening_fake' as any, {
            width: 1000
          })
        }).toThrow()
      })
    })
  })

  describe('Opening Getters', () => {
    describe('getWallOpeningById', () => {
      it('should return opening with geometry', () => {
        const addedOpening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        const opening = slice.actions.getWallOpeningById(addedOpening.id)

        expect(opening.id).toBe(addedOpening.id)
        expect(opening.wallId).toBe(wallId)
        expect(opening.polygon).toBeDefined()
      })

      it('should throw for non-existent opening', () => {
        expectThrowsForInvalidId(() => slice.actions.getWallOpeningById('opening_fake' as any))
      })
    })

    describe('getWallEntityById', () => {
      it('should return opening when entity is an opening', () => {
        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        const entity = slice.actions.getWallEntityById(opening.id)

        expect(entity.id).toBe(opening.id)
        expect(entity.type).toBe('opening')
        expect.assert(entity.type === 'opening')
        expect(entity.openingType).toBe('door')
      })

      it('should throw for non-existent entity', () => {
        expectThrowsForInvalidId(() => slice.actions.getWallEntityById('opening_fake' as any))
      })
    })

    describe('getWallOpeningsById', () => {
      it('should return all openings for wall', () => {
        slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 1000,
          width: 900,
          height: 2100
        })

        slice.actions.addWallOpening(wallId, {
          openingType: 'window',
          centerOffsetFromWallStart: 4000,
          width: 1200,
          height: 1500
        })

        const openings = slice.actions.getWallOpeningsById(wallId)

        expect(openings).toHaveLength(2)
        openings.forEach(opening => {
          expect(opening.wallId).toBe(wallId)
        })
      })

      it('should return empty array for wall with no openings', () => {
        const openings = slice.actions.getWallOpeningsById(wallId)

        expect(openings).toHaveLength(0)
      })
    })
  })

  describe('Opening Validation', () => {
    describe('isWallOpeningPlacementValid', () => {
      it('should return true for valid placement', () => {
        const isValid = slice.actions.isWallOpeningPlacementValid(wallId, 2000, 900)

        expect(isValid).toBe(true)
      })

      it('should return false when opening extends beyond wall start', () => {
        const isValid = slice.actions.isWallOpeningPlacementValid(wallId, 200, 900)

        expect(isValid).toBe(false)
      })

      it('should return false when opening extends beyond wall end', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)

        const isValid = slice.actions.isWallOpeningPlacementValid(wallId, wall.wallLength - 200, 900)

        expect(isValid).toBe(false)
      })

      it('should return false when overlapping with existing opening', () => {
        slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        const isValid = slice.actions.isWallOpeningPlacementValid(wallId, 2200, 1200)

        expect(isValid).toBe(false)
      })

      it('should allow excluding specific opening from overlap check', () => {
        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        // Should be valid because we're excluding the existing opening
        const isValid = slice.actions.isWallOpeningPlacementValid(wallId, 2200, 900, opening.id)

        expect(isValid).toBe(true)
      })
    })

    describe('findNearestValidWallOpeningPosition', () => {
      it('should return same position when already valid', () => {
        const position = slice.actions.findNearestValidWallOpeningPosition(wallId, 2000, 900)

        expect(position).toBe(2000)
      })

      it('should adjust position when near wall start', () => {
        const position = slice.actions.findNearestValidWallOpeningPosition(wallId, 200, 900)

        expect(position).toBeGreaterThanOrEqual(450) // At least half width from start
      })

      it('should adjust position when near wall end', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)

        const position = slice.actions.findNearestValidWallOpeningPosition(wallId, wall.wallLength - 200, 900)

        expect(position).toBeLessThanOrEqual(wall.wallLength - 450) // At least half width from end
      })

      it('should return null when no valid position exists', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)

        // Try to place opening wider than wall
        const position = slice.actions.findNearestValidWallOpeningPosition(
          wallId,
          wall.wallLength / 2,
          wall.wallLength + 1000
        )

        expect(position).toBeNull()
      })

      it('should find position avoiding existing openings', () => {
        // Add opening in middle of wall
        slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        // Try to place opening at overlapping position
        const position = slice.actions.findNearestValidWallOpeningPosition(wallId, 2200, 900)

        // Should find valid position away from existing opening
        expect(position).toBeGreaterThanOrEqual(2900) // At least one width away
      })
    })
  })

  describe('Opening Cascade Cleanup', () => {
    it('should remove openings when wall is removed', () => {
      const boundary = createLShapedBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      const opening = slice.actions.addWallOpening(perimeter.wallIds[0], {
        openingType: 'door',
        centerOffsetFromWallStart: 2000,
        width: 900,
        height: 2100
      })

      expect(slice.openings[opening.id]).toBeDefined()

      slice.actions.removePerimeterWall(perimeter.wallIds[0])

      expect(slice.openings[opening.id]).toBeUndefined()
      expect(slice._openingGeometry[opening.id]).toBeUndefined()
    })

    it('should remove openings when perimeter is removed', () => {
      const opening = slice.actions.addWallOpening(wallId, {
        openingType: 'door',
        centerOffsetFromWallStart: 2000,
        width: 900,
        height: 2100
      })

      expect(slice.openings[opening.id]).toBeDefined()

      slice.actions.removePerimeter(perimeterId)

      expect(slice.openings[opening.id]).toBeUndefined()
      expect(slice._openingGeometry[opening.id]).toBeUndefined()
    })

    it('should redistribute openings when wall is split', () => {
      const wall = slice.actions.getPerimeterWallById(wallId)
      const splitPosition = wall.wallLength / 2

      // Add opening before split point
      const opening1 = slice.actions.addWallOpening(wallId, {
        openingType: 'door',
        centerOffsetFromWallStart: splitPosition - 1000,
        width: 900,
        height: 2100
      })

      // Add opening after split point
      const opening2 = slice.actions.addWallOpening(wallId, {
        openingType: 'window',
        centerOffsetFromWallStart: splitPosition + 1000,
        width: 1200,
        height: 1500
      })

      const newWallId = slice.actions.splitPerimeterWall(wallId, splitPosition)!

      const firstWall = slice.actions.getPerimeterWallById(wallId)
      const secondWall = slice.actions.getPerimeterWallById(newWallId)

      expect(firstWall.entityIds).toContain(opening1.id)
      expect(secondWall.entityIds).toContain(opening2.id)

      // Both openings should still exist
      expect(slice.openings[opening1.id]).toBeDefined()
      expect(slice.openings[opening2.id]).toBeDefined()
    })
  })

  describe('Opening Reference Consistency', () => {
    it('should maintain correct wall reference', () => {
      const opening = slice.actions.addWallOpening(wallId, {
        openingType: 'door',
        centerOffsetFromWallStart: 2000,
        width: 900,
        height: 2100
      })

      const storedOpening = slice.openings[opening.id]
      expect(storedOpening.wallId).toBe(wallId)

      const wall = slice.actions.getPerimeterWallById(wallId)
      expect(wall.entityIds).toContain(opening.id)
    })

    it('should update wall reference when opening moves to different wall after split', () => {
      const wall = slice.actions.getPerimeterWallById(wallId)
      const splitPosition = wall.wallLength / 2

      const opening = slice.actions.addWallOpening(wallId, {
        openingType: 'door',
        centerOffsetFromWallStart: splitPosition + 1000,
        width: 900,
        height: 2100
      })

      const newWallId = slice.actions.splitPerimeterWall(wallId, splitPosition)!

      const storedOpening = slice.openings[opening.id]
      expect(storedOpening.wallId).toBe(newWallId)

      const newWall = slice.actions.getPerimeterWallById(newWallId)
      expect(newWall.entityIds).toContain(opening.id)
    })
  })
})
