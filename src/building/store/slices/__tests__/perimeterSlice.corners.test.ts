import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PerimeterCornerId, PerimeterId, StoreyId } from '@/building/model/ids'
import { createWallAssemblyId } from '@/building/model/ids'
import { NotFoundError } from '@/building/store/errors'
import type { PerimetersSlice } from '@/building/store/slices/perimeterSlice'
import type { MaterialId } from '@/construction/materials/material'
import { ensurePolygonIsClockwise, wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'

import {
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

describe('perimeterCornerSlice', () => {
  let slice: PerimetersSlice
  let testStoreyId: StoreyId
  let perimeterId: PerimeterId
  let cornerId: PerimeterCornerId

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
    cornerId = perimeter.cornerIds[0]
  })

  describe('Basic Corner Operations', () => {
    describe('getPerimeterCornerById', () => {
      it('should return corner with geometry', () => {
        const corner = slice.actions.getPerimeterCornerById(cornerId)

        expect(corner.id).toBe(cornerId)
        expect(corner.insidePoint).toBeDefined()
        expect(corner.outsidePoint).toBeDefined()
        expect(corner.interiorAngle).toBeGreaterThan(0)
      })

      it('should throw for non-existent corner', () => {
        expectThrowsForInvalidId(() => slice.actions.getPerimeterCornerById('corner_fake' as any))
      })
    })

    describe('getPerimeterCornersById', () => {
      it('should return all corners for perimeter', () => {
        const corners = slice.actions.getPerimeterCornersById(perimeterId)

        expect(corners).toHaveLength(4)
        corners.forEach(corner => {
          expect(corner.perimeterId).toBe(perimeterId)
        })
      })
    })
  })

  describe('Corner Removal', () => {
    describe('removePerimeterCorner', () => {
      it('should remove corner and merge adjacent walls', () => {
        const perimeter = slice.actions.getPerimeterById(perimeterId)
        const cornerToRemove = perimeter.cornerIds[0]
        const corner = slice.actions.getPerimeterCornerById(cornerToRemove)
        const previousWall = corner.previousWallId
        const nextWall = corner.nextWallId

        const success = slice.actions.removePerimeterCorner(cornerToRemove)

        expect(success).toBe(true)
        const updatedPerimeter = slice.actions.getPerimeterById(perimeterId)
        expect(updatedPerimeter.cornerIds).toHaveLength(3)
        expect(updatedPerimeter.wallIds).toHaveLength(3)

        // Original walls should be removed
        expect(slice.perimeterWalls[previousWall]).toBeUndefined()
        expect(slice.perimeterWalls[nextWall]).toBeUndefined()

        // Corner should be removed
        expect(slice.perimeterCorners[cornerToRemove]).toBeUndefined()
      })

      it('should clean up corner geometry', () => {
        const cornerToRemove = cornerId

        slice.actions.removePerimeterCorner(cornerToRemove)

        expect(slice.perimeterCorners[cornerToRemove]).toBeUndefined()
        expect(slice._perimeterCornerGeometry[cornerToRemove]).toBeUndefined()
      })

      it('should maintain reference consistency', () => {
        slice.actions.removePerimeterCorner(cornerId)

        verifyPerimeterReferences(slice, perimeterId)
      })

      it('should return false for minimum corners', () => {
        // Remove until we have 3 corners
        const perimeter = slice.actions.getPerimeterById(perimeterId)
        slice.actions.removePerimeterCorner(perimeter.cornerIds[0])

        const updated = slice.actions.getPerimeterById(perimeterId)
        expect(updated.cornerIds).toHaveLength(3)

        // Try to remove one more (would leave only 2)
        const result = slice.actions.canRemovePerimeterCorner(updated.cornerIds[0])

        expect(result.canRemove).toBe(false)
        expect(result.reason).toBe('cannotDeleteMinCorners')
      })

      it('should return false if removal would cause self-intersection', () => {
        wouldClosingPolygonSelfIntersectMock.mockReturnValue(true)

        const result = slice.actions.canRemovePerimeterCorner(cornerId)

        expect(result.canRemove).toBe(false)
        expect(result.reason).toBe('cannotDeleteSelfIntersect')
      })

      it('should recalculate perimeter geometry', () => {
        slice.actions.removePerimeterCorner(cornerId)

        verifyGeometryExists(slice, perimeterId)
      })

      it('should have no orphaned entities after removal', () => {
        slice.actions.removePerimeterCorner(cornerId)

        verifyNoOrphanedEntities(slice)
      })

      it('should remove openings on merged wall', () => {
        const perimeter = slice.actions.getPerimeterById(perimeterId)
        const corner = slice.actions.getPerimeterCornerById(perimeter.cornerIds[0])
        const nextWall = corner.nextWallId

        // Add opening to next wall
        const opening = slice.actions.addWallOpening(nextWall, {
          openingType: 'door',
          centerOffsetFromWallStart: 1000,
          width: 900,
          height: 2100
        })

        slice.actions.removePerimeterCorner(perimeter.cornerIds[0])

        // Opening should still exist
        expect(slice.openings[opening!.id]).toBeUndefined()
      })
    })

    describe('canRemovePerimeterCorner', () => {
      it('should return canRemove: true for valid removal', () => {
        const result = slice.actions.canRemovePerimeterCorner(cornerId)

        expect(result.canRemove).toBe(true)
        expect(result.reason).toBeUndefined()
      })

      it('should throw for non-existent corner', () => {
        expect(() => {
          slice.actions.canRemovePerimeterCorner('corner_fake' as any)
        }).toThrow(NotFoundError)
      })
    })
  })

  describe('Corner Switching', () => {
    describe('updatePerimeterCornerConstructedByWall', () => {
      it('should switch corner construction ownership', () => {
        const corner = slice.actions.getPerimeterCornerById(cornerId)
        const originalConstructedBy = corner.constructedByWall

        const newConstructedBy = originalConstructedBy === 'previous' ? 'next' : 'previous'
        slice.actions.updatePerimeterCornerConstructedByWall(cornerId, newConstructedBy)

        const updatedCorner = slice.actions.getPerimeterCornerById(cornerId)
        expect(updatedCorner.constructedByWall).toBe(newConstructedBy)
      })

      it('should recalculate geometry', () => {
        const corner = slice.actions.getPerimeterCornerById(cornerId)
        const originalConstructedBy = corner.constructedByWall
        const newConstructedBy = originalConstructedBy === 'previous' ? 'next' : 'previous'

        slice.actions.updatePerimeterCornerConstructedByWall(cornerId, newConstructedBy)

        verifyGeometryExists(slice, perimeterId)
      })

      it('should maintain reference consistency', () => {
        const corner = slice.actions.getPerimeterCornerById(cornerId)
        const originalConstructedBy = corner.constructedByWall
        const newConstructedBy = originalConstructedBy === 'previous' ? 'next' : 'previous'

        slice.actions.updatePerimeterCornerConstructedByWall(cornerId, newConstructedBy)

        verifyPerimeterReferences(slice, perimeterId)
      })

      it('should throw for non-existent corner', () => {
        expect(() => {
          slice.actions.updatePerimeterCornerConstructedByWall('corner_fake' as any, 'next')
        }).toThrow()
      })
    })

    describe('canSwitchCornerConstructedByWall', () => {
      it('should return canSwitch: true when walls have same thickness', () => {
        const result = slice.actions.canSwitchCornerConstructedByWall(cornerId)

        expect(result).toBe(true)
      })

      it('should return canSwitch: false when there is a post on the constructing wall in that corner', () => {
        const corner = slice.actions.getPerimeterCornerById(cornerId)
        slice.actions.updatePerimeterCornerConstructedByWall(corner.id, 'next')
        slice.actions.addWallPost(
          corner.nextWallId,
          mockPost({
            centerOffsetFromWallStart: -1,
            postType: 'center',
            width: 20,
            thickness: 20,
            material: 'material' as MaterialId,
            infillMaterial: 'material' as MaterialId,
            replacesPosts: true
          })
        )

        const result = slice.actions.canSwitchCornerConstructedByWall(cornerId)

        expect(result).toBe(false)
      })

      it('should throw for non-existent corner', () => {
        expect(() => {
          slice.actions.canSwitchCornerConstructedByWall('corner_fake' as any)
        }).toThrow(NotFoundError)
      })
    })
  })

  describe('Corner Geometry', () => {
    it('should have valid geometry after creation', () => {
      const corner = slice.actions.getPerimeterCornerById(cornerId)

      expect(corner.insidePoint).toBeDefined()
      expect(corner.outsidePoint).toBeDefined()
      expect(corner.insidePoint[0]).toBeTypeOf('number')
      expect(corner.insidePoint[1]).toBeTypeOf('number')
      expect(corner.outsidePoint[0]).toBeTypeOf('number')
      expect(corner.outsidePoint[1]).toBeTypeOf('number')
    })

    it('should have valid angles', () => {
      const corner = slice.actions.getPerimeterCornerById(cornerId)

      expect(corner.interiorAngle).toBeGreaterThan(0)
      expect(corner.interiorAngle).toBeLessThanOrEqual(360)
      expect(corner.exteriorAngle).toBeGreaterThan(0)
      expect(corner.exteriorAngle).toBeLessThanOrEqual(360)
    })

    it('should update geometry when adjacent wall thickness changes', () => {
      const corner = slice.actions.getPerimeterCornerById(cornerId)
      const originalInsidePoint = { ...corner.insidePoint }
      const originalOutsidePoint = { ...corner.outsidePoint }

      // Change adjacent wall thickness
      slice.actions.updatePerimeterWallThickness(corner.nextWallId, 600)

      const updatedCorner = slice.actions.getPerimeterCornerById(cornerId)

      // Geometry should have changed
      expect(updatedCorner.insidePoint).not.toEqual(originalInsidePoint)
      expect(updatedCorner.outsidePoint).not.toEqual(originalOutsidePoint)
    })

    it('should update geometry when corner switches construction', () => {
      const corner = slice.actions.getPerimeterCornerById(cornerId)
      const originalInsidePoint = { ...corner.insidePoint }
      const originalOutsidePoint = { ...corner.outsidePoint }
      const originalConstructedBy = corner.constructedByWall
      const newConstructedBy = originalConstructedBy === 'previous' ? 'next' : 'previous'

      slice.actions.updatePerimeterCornerConstructedByWall(cornerId, newConstructedBy)

      const updatedCorner = slice.actions.getPerimeterCornerById(cornerId)

      // Geometry should have changed
      expect(updatedCorner.insidePoint).not.toEqual(originalInsidePoint)
      expect(updatedCorner.outsidePoint).not.toEqual(originalOutsidePoint)
    })
  })
})
