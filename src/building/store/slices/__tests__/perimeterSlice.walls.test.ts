import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PerimeterId, PerimeterWallId, StoreyId } from '@/building/model/ids'
import { createWallAssemblyId } from '@/building/model/ids'
import { NotFoundError } from '@/building/store/errors'
import { ensurePolygonIsClockwise, wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'

import type { PerimetersSlice } from '../perimeterSlice'
import {
  createLShapedBoundary,
  createRectangularBoundary,
  expectThrowsForInvalidId,
  mockPost,
  setupPerimeterSlice,
  verifyGeometryExists,
  verifyNoOrphanedEntities,
  verifyPerimeterReferences
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

describe('perimeterWallSlice', () => {
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
    const boundary = createLShapedBoundary()
    const wallAssemblyId = createWallAssemblyId()
    const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
    perimeterId = perimeter.id
    wallId = perimeter.wallIds[0]
  })

  describe('Basic Wall Operations', () => {
    describe('updatePerimeterWallAssembly', () => {
      it('should update wall assembly', () => {
        const newAssemblyId = createWallAssemblyId()

        slice.actions.updatePerimeterWallAssembly(wallId, newAssemblyId)

        const wall = slice.actions.getPerimeterWallById(wallId)
        expect(wall.wallAssemblyId).toBe(newAssemblyId)
      })

      it('should not affect other walls', () => {
        const newAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.getPerimeterById(perimeterId)
        const otherWallId = perimeter.wallIds[1]
        const originalOtherWall = slice.actions.getPerimeterWallById(otherWallId)

        slice.actions.updatePerimeterWallAssembly(wallId, newAssemblyId)

        const updatedOtherWall = slice.actions.getPerimeterWallById(otherWallId)
        expect(updatedOtherWall.wallAssemblyId).toBe(originalOtherWall.wallAssemblyId)
      })
    })

    describe('updatePerimeterWallThickness', () => {
      it('should update wall thickness', () => {
        const newThickness = 300

        slice.actions.updatePerimeterWallThickness(wallId, newThickness)

        const wall = slice.actions.getPerimeterWallById(wallId)
        expect(wall.thickness).toBe(newThickness)
      })

      it('should recalculate geometry', () => {
        slice.actions.updatePerimeterWallThickness(wallId, 300)

        verifyGeometryExists(slice, perimeterId)
      })

      it('should reject zero thickness', () => {
        expect(() => {
          slice.actions.updatePerimeterWallThickness(wallId, 0)
        }).toThrow('Wall thickness must be greater than 0')
      })

      it('should reject negative thickness', () => {
        expect(() => {
          slice.actions.updatePerimeterWallThickness(wallId, -100)
        }).toThrow('Wall thickness must be greater than 0')
      })
    })

    describe('getPerimeterWallById', () => {
      it('should return wall with geometry', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)

        expect(wall.id).toBe(wallId)
        expect(wall.insideLine).toBeDefined()
        expect(wall.outsideLine).toBeDefined()
        expect(wall.wallLength).toBeGreaterThan(0)
        expect(wall.wallLength).toBeGreaterThan(0)
      })

      it('should throw for non-existent wall', () => {
        expectThrowsForInvalidId(() => slice.actions.getPerimeterWallById('wall_fake' as any))
      })
    })

    describe('getPerimeterWallsById', () => {
      it('should return all walls for perimeter', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        const walls = slice.actions.getPerimeterWallsById(perimeterId)

        expect(walls).toHaveLength(6)
        walls.forEach(wall => {
          expect(wall.perimeterId).toBe(perimeterId)
        })
      })
    })
  })

  describe('Ring Beam Operations', () => {
    describe('setWallBaseRingBeam', () => {
      it('should set base ring beam assembly', () => {
        const ringBeamId = 'rb_base' as any

        slice.actions.setWallBaseRingBeam(wallId, ringBeamId)

        const wall = slice.actions.getPerimeterWallById(wallId)
        expect(wall.baseRingBeamAssemblyId).toBe(ringBeamId)
      })

      it('should not affect other walls', () => {
        const perimeter = slice.actions.getPerimeterById(perimeterId)
        const otherWallId = perimeter.wallIds[1]
        const ringBeamId = 'rb_base' as any

        slice.actions.setWallBaseRingBeam(wallId, ringBeamId)

        const otherWall = slice.actions.getPerimeterWallById(otherWallId)
        expect(otherWall.baseRingBeamAssemblyId).toBeUndefined()
      })
    })

    describe('setWallTopRingBeam', () => {
      it('should set top ring beam assembly', () => {
        const ringBeamId = 'rb_top' as any

        slice.actions.setWallTopRingBeam(wallId, ringBeamId)

        const wall = slice.actions.getPerimeterWallById(wallId)
        expect(wall.topRingBeamAssemblyId).toBe(ringBeamId)
      })
    })

    describe('removeWallBaseRingBeam', () => {
      it('should remove base ring beam', () => {
        const ringBeamId = 'rb_base' as any
        slice.actions.setWallBaseRingBeam(wallId, ringBeamId)

        slice.actions.removeWallBaseRingBeam(wallId)

        const wall = slice.actions.getPerimeterWallById(wallId)
        expect(wall.baseRingBeamAssemblyId).toBeUndefined()
      })
    })

    describe('removeWallTopRingBeam', () => {
      it('should remove top ring beam', () => {
        const ringBeamId = 'rb_top' as any
        slice.actions.setWallTopRingBeam(wallId, ringBeamId)

        slice.actions.removeWallTopRingBeam(wallId)

        const wall = slice.actions.getPerimeterWallById(wallId)
        expect(wall.topRingBeamAssemblyId).toBeUndefined()
      })
    })
  })

  describe('Wall Removal', () => {
    describe('removePerimeterWall', () => {
      it('should remove wall and merge adjacent corners', () => {
        const perimeter = slice.actions.getPerimeterById(perimeterId)
        const wallToRemove = perimeter.wallIds[0]
        const wall = slice.actions.getPerimeterWallById(wallToRemove)
        const startCorner = wall.startCornerId
        const endCorner = wall.endCornerId

        const success = slice.actions.removePerimeterWall(wallToRemove)

        expect(success).toBe(true)
        const updatedPerimeter = slice.actions.getPerimeterById(perimeterId)
        expect(updatedPerimeter.wallIds).toHaveLength(4)
        expect(updatedPerimeter.cornerIds).toHaveLength(4)

        // Original corners should be removed
        expect(slice.perimeterCorners[startCorner]).toBeUndefined()
        expect(slice.perimeterCorners[endCorner]).toBeUndefined()
      })

      it('should clean up wall geometry', () => {
        const wallToRemove = wallId

        slice.actions.removePerimeterWall(wallToRemove)

        expect(slice.perimeterWalls[wallToRemove]).toBeUndefined()
        expect(slice._perimeterWallGeometry[wallToRemove]).toBeUndefined()
      })

      it('should maintain reference consistency', () => {
        slice.actions.removePerimeterWall(wallId)

        verifyPerimeterReferences(slice, perimeterId)
      })

      it('should return false for minimum walls', () => {
        // Remove one wall, leaves us with 4 walls
        const perimeter = slice.actions.getPerimeterById(perimeterId)
        slice.actions.removePerimeterWall(perimeter.wallIds[0])

        const updated = slice.actions.getPerimeterById(perimeterId)
        expect(updated.wallIds).toHaveLength(4)

        // Try to remove one more (would leave only 2)
        const result = slice.actions.canRemovePerimeterWall(updated.wallIds[0])

        expect(result.canRemove).toBe(false)
        expect(result.reason).toBe('cannotDeleteMinWalls')
      })

      it('should cascade to openings on wall', () => {
        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 1000,
          width: 900,
          height: 2100
        })

        expect(slice.openings[opening!.id]).toBeDefined()

        slice.actions.removePerimeterWall(wallId)

        expect(slice.openings[opening!.id]).toBeUndefined()
        expect(slice._openingGeometry[opening!.id]).toBeUndefined()
      })

      it('should cascade to wall posts', () => {
        const post = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )

        expect(slice.wallPosts[post!.id]).toBeDefined()

        slice.actions.removePerimeterWall(wallId)

        expect(slice.wallPosts[post!.id]).toBeUndefined()
        expect(slice._wallPostGeometry[post!.id]).toBeUndefined()
      })

      it('should have no orphaned entities after removal', () => {
        slice.actions.removePerimeterWall(wallId)

        verifyNoOrphanedEntities(slice)
      })
    })

    describe('canRemovePerimeterWall', () => {
      it('should return canRemove: true for valid removal', () => {
        const result = slice.actions.canRemovePerimeterWall(wallId)

        expect(result.canRemove).toBe(true)
        expect(result.reason).toBeUndefined()
      })

      it('should throw for non-existent wall', () => {
        expect(() => {
          slice.actions.canRemovePerimeterWall('wall_fake' as any)
        }).toThrow(NotFoundError)
      })
    })
  })

  describe('Wall Splitting', () => {
    describe('splitPerimeterWall', () => {
      it('should create new wall and corner', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        const originalWallCount = slice.actions.getPerimeterById(perimeterId).wallIds.length
        const originalCornerCount = slice.actions.getPerimeterById(perimeterId).cornerIds.length
        const splitPosition = wall.wallLength / 2

        const newWallId = slice.actions.splitPerimeterWall(wallId, splitPosition)

        expect(newWallId).toBeTruthy()
        const updatedPerimeter = slice.actions.getPerimeterById(perimeterId)
        expect(updatedPerimeter.wallIds).toHaveLength(originalWallCount + 1)
        expect(updatedPerimeter.cornerIds).toHaveLength(originalCornerCount + 1)
      })

      it('should preserve wall properties', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        const originalAssembly = wall.wallAssemblyId
        const originalThickness = wall.thickness
        const ringBeamId = 'rb_test' as any
        slice.actions.setWallBaseRingBeam(wallId, ringBeamId)

        const splitPosition = wall.wallLength / 2
        const newWallId = slice.actions.splitPerimeterWall(wallId, splitPosition)

        const newWall = slice.actions.getPerimeterWallById(newWallId!)
        expect(newWall.wallAssemblyId).toBe(originalAssembly)
        expect(newWall.thickness).toBe(originalThickness)
        expect(newWall.baseRingBeamAssemblyId).toBe(ringBeamId)
      })

      it('should maintain reference consistency', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        const splitPosition = wall.wallLength / 2

        slice.actions.splitPerimeterWall(wallId, splitPosition)

        verifyPerimeterReferences(slice, perimeterId)
      })

      it('should redistribute openings based on position', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        const splitPosition = wall.wallLength / 2

        // Add opening before split point
        const opening1 = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: splitPosition - 500,
          width: 900,
          height: 2100
        })

        // Add opening after split point
        const opening2 = slice.actions.addWallOpening(wallId, {
          openingType: 'window',
          centerOffsetFromWallStart: splitPosition + 500,
          width: 900,
          height: 1500
        })

        const newWallId = slice.actions.splitPerimeterWall(wallId, splitPosition)

        const firstWall = slice.actions.getPerimeterWallById(wallId)
        const secondWall = slice.actions.getPerimeterWallById(newWallId!)

        // First opening should be on first wall
        expect(firstWall.entityIds).toContain(opening1!.id)

        // Second opening should be on second wall
        expect(secondWall.entityIds).toContain(opening2!.id)
      })

      it('should reject invalid split position (negative)', () => {
        const result = slice.actions.splitPerimeterWall(wallId, -100)

        expect(result).toBeNull()
      })

      it('should reject invalid split position (beyond wall length)', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        const result = slice.actions.splitPerimeterWall(wallId, wall.wallLength + 100)

        expect(result).toBeNull()
      })

      it('should create geometry for new entities', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        const splitPosition = wall.wallLength / 2

        const newWallId = slice.actions.splitPerimeterWall(wallId, splitPosition)

        expect(slice._perimeterWallGeometry[newWallId!]).toBeDefined()
        verifyGeometryExists(slice, perimeterId)
      })
    })
  })
})
