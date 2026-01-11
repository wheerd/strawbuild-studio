import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type StoreyId, createStoreyId, createWallAssemblyId } from '@/building/model/ids'
import { NotFoundError } from '@/building/store/errors'
import type { PerimetersSlice } from '@/building/store/slices/perimeterSlice'
import { newVec2 } from '@/shared/geometry'
import { ensurePolygonIsClockwise, wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'

import {
  createLShapedBoundary,
  createRectangularBoundary,
  createTriangularBoundary,
  expectConsistentPerimeterReferences,
  expectGeometryExists,
  expectNoOrphanedEntities,
  expectThrowsForInvalidId,
  setupPerimeterSlice
} from './testHelpers'

// Mock geometry functions
vi.mock('@/shared/geometry/polygon', async importOriginal => {
  return {
    ...(await importOriginal()),
    wouldClosingPolygonSelfIntersect: vi.fn(),
    ensurePolygonIsClockwise: vi.fn()
  }
})

const wouldClosingPolygonSelfIntersectMock = vi.mocked(wouldClosingPolygonSelfIntersect)
const ensurePolygonIsClockwiseMock = vi.mocked(ensurePolygonIsClockwise)

describe('perimeterSlice - Basic CRUD', () => {
  let slice: PerimetersSlice
  let testStoreyId: StoreyId

  beforeEach(() => {
    wouldClosingPolygonSelfIntersectMock.mockReset()
    wouldClosingPolygonSelfIntersectMock.mockReturnValue(false)
    ensurePolygonIsClockwiseMock.mockReset()
    ensurePolygonIsClockwiseMock.mockImplementation(p => p)

    const setup = setupPerimeterSlice()
    slice = setup.slice
    testStoreyId = setup.testStoreyId
  })

  describe('addPerimeter', () => {
    it('should create perimeter with walls and corners', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const thickness = 420

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, thickness)

      expect(perimeter).toBeDefined()
      expect(perimeter.id).toBeTruthy()
      expect(perimeter.storeyId).toBe(testStoreyId)
      expect(perimeter.wallIds).toHaveLength(4)
      expect(perimeter.cornerIds).toHaveLength(4)
      expect(perimeter.referenceSide).toBe('inside') // default
    })

    it('should create walls with correct properties', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const thickness = 420

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, thickness)
      const walls = perimeter.wallIds.map(id => slice.actions.getPerimeterWallById(id))

      walls.forEach(wall => {
        expect(wall.wallAssemblyId).toBe(wallAssemblyId)
        expect(wall.thickness).toBe(thickness)
        expect(wall.perimeterId).toBe(perimeter.id)
        expect(wall.entityIds).toEqual([])
      })
    })

    it('should create corners with correct properties', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const thickness = 420

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, thickness)
      const corners = perimeter.cornerIds.map(id => slice.actions.getPerimeterCornerById(id))

      corners.forEach(corner => {
        expect(corner.id).toBeTruthy()
        expect(corner.perimeterId).toBe(perimeter.id)
        expect(corner.constructedByWall).toBe('next') // default
        expect(corner.insidePoint).toBeDefined()
        expect(corner.outsidePoint).toBeDefined()
      })
    })

    it('should normalize polygon to clockwise', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      expect(ensurePolygonIsClockwiseMock).toHaveBeenCalledWith(boundary)
    })

    it('should handle triangular perimeter', () => {
      const boundary = createTriangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      expect(perimeter.wallIds).toHaveLength(3)
      expect(perimeter.cornerIds).toHaveLength(3)
    })

    it('should handle L-shaped perimeter with reflex angles', () => {
      const boundary = createLShapedBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      expect(perimeter.wallIds).toHaveLength(6)
      expect(perimeter.cornerIds).toHaveLength(6)
    })

    it('should support optional ring beam assemblies', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const baseRingBeamId = 'rb_base' as any
      const topRingBeamId = 'rb_top' as any

      const perimeter = slice.actions.addPerimeter(
        testStoreyId,
        boundary,
        wallAssemblyId,
        420,
        baseRingBeamId,
        topRingBeamId
      )

      const walls = perimeter.wallIds.map(id => slice.actions.getPerimeterWallById(id))
      walls.forEach(wall => {
        expect(wall.baseRingBeamAssemblyId).toBe(baseRingBeamId)
        expect(wall.topRingBeamAssemblyId).toBe(topRingBeamId)
      })
    })

    it('should support custom reference side', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(
        testStoreyId,
        boundary,
        wallAssemblyId,
        420,
        undefined,
        undefined,
        'outside'
      )

      expect(perimeter.referenceSide).toBe('outside')
    })

    it('should reject polygon with less than 3 points', () => {
      const invalidBoundary = {
        points: [newVec2(0, 0), newVec2(100, 0)]
      }
      const wallAssemblyId = createWallAssemblyId()

      expect(() => {
        slice.actions.addPerimeter(testStoreyId, invalidBoundary as any, wallAssemblyId, 420)
      }).toThrow('Perimeter boundary must have at least 3 points')
    })

    it('should reject self-intersecting polygon', () => {
      wouldClosingPolygonSelfIntersectMock.mockReturnValue(true)
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      expect(() => {
        slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
      }).toThrow('Perimeter boundary must not self-intersect')
    })

    it('should reject invalid thickness (zero)', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      expect(() => {
        slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 0)
      }).toThrow('Wall thickness must be greater than 0')
    })

    it('should reject invalid thickness (negative)', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      expect(() => {
        slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, -100)
      }).toThrow('Wall thickness must be greater than 0')
    })
  })

  describe('Reference Consistency', () => {
    it('should maintain correct references between perimeter, walls, and corners', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      expectConsistentPerimeterReferences(slice, perimeter.id)
    })

    it('should maintain references for complex polygon', () => {
      const boundary = createLShapedBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      expectConsistentPerimeterReferences(slice, perimeter.id)
    })
  })

  describe('Geometry Creation', () => {
    it('should create geometry for all entities', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      expectGeometryExists(slice, perimeter.id)
    })

    it('should compute wall geometry correctly', () => {
      const boundary = createRectangularBoundary(10000, 5000)
      const wallAssemblyId = createWallAssemblyId()
      const thickness = 420

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, thickness)
      const firstWall = slice.actions.getPerimeterWallById(perimeter.wallIds[0])

      // First wall should be bottom horizontal wall
      expect(firstWall.wallLength).toBeGreaterThan(0)
      expect(firstWall.outsideLength).toBeGreaterThan(0)
      expect(firstWall.wallLength).toBeGreaterThan(0)
      expect(firstWall.direction).toBeDefined()
      expect(firstWall.outsideDirection).toBeDefined()
    })

    it('should compute corner angles correctly for rectangular perimeter', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
      const corners = perimeter.cornerIds.map(id => slice.actions.getPerimeterCornerById(id))

      // All corners in rectangle should be 90 degrees
      corners.forEach(corner => {
        expect(corner.interiorAngle).toBe(90)
        expect(corner.exteriorAngle).toBe(270)
      })
    })
  })

  describe('removePerimeter', () => {
    it('should remove perimeter from collection', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
      expect(slice.perimeters[perimeter.id]).toBeDefined()

      slice.actions.removePerimeter(perimeter.id)

      expect(slice.perimeters[perimeter.id]).toBeUndefined()
    })

    it('should cascade delete all walls', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
      const wallIds = [...perimeter.wallIds]

      slice.actions.removePerimeter(perimeter.id)

      wallIds.forEach(wallId => {
        expect(slice.perimeterWalls[wallId]).toBeUndefined()
      })
    })

    it('should cascade delete all corners', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
      const cornerIds = [...perimeter.cornerIds]

      slice.actions.removePerimeter(perimeter.id)

      cornerIds.forEach(cornerId => {
        expect(slice.perimeterCorners[cornerId]).toBeUndefined()
      })
    })

    it('should clean up all geometry', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
      const wallIds = [...perimeter.wallIds]
      const cornerIds = [...perimeter.cornerIds]

      slice.actions.removePerimeter(perimeter.id)

      expect(slice._perimeterGeometry[perimeter.id]).toBeUndefined()
      wallIds.forEach(wallId => {
        expect(slice._perimeterWallGeometry[wallId]).toBeUndefined()
      })
      cornerIds.forEach(cornerId => {
        expect(slice._perimeterCornerGeometry[cornerId]).toBeUndefined()
      })
    })

    it('should handle removing non-existent perimeter gracefully', () => {
      expect(() => {
        slice.actions.removePerimeter('perimeter_fake' as any)
      }).not.toThrow()
    })

    it('should not affect other perimeters', () => {
      const boundary1 = createRectangularBoundary()
      const boundary2 = createTriangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter1 = slice.actions.addPerimeter(testStoreyId, boundary1, wallAssemblyId, 420)
      const perimeter2 = slice.actions.addPerimeter(testStoreyId, boundary2, wallAssemblyId, 420)

      slice.actions.removePerimeter(perimeter1.id)

      expect(slice.perimeters[perimeter1.id]).toBeUndefined()
      expect(slice.perimeters[perimeter2.id]).toBeDefined()
      expectConsistentPerimeterReferences(slice, perimeter2.id)
    })
  })

  describe('No Orphaned Entities', () => {
    it('should have no orphaned entities after add', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      expectNoOrphanedEntities(slice)
    })

    it('should have no orphaned entities after remove', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
      slice.actions.removePerimeter(perimeter.id)

      expectNoOrphanedEntities(slice)
    })

    it('should have no orphaned entities with multiple perimeters', () => {
      const wallAssemblyId = createWallAssemblyId()

      slice.actions.addPerimeter(testStoreyId, createRectangularBoundary(), wallAssemblyId, 420)
      const perimeter2 = slice.actions.addPerimeter(testStoreyId, createTriangularBoundary(), wallAssemblyId, 420)
      slice.actions.addPerimeter(testStoreyId, createLShapedBoundary(), wallAssemblyId, 420)

      slice.actions.removePerimeter(perimeter2.id)

      expectNoOrphanedEntities(slice)
    })
  })

  describe('getPerimeterById', () => {
    it('should return perimeter with geometry', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const created = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
      const retrieved = slice.actions.getPerimeterById(created.id)

      expect(retrieved).toEqual(created)
      expect(retrieved.innerPolygon).toBeDefined()
      expect(retrieved.outerPolygon).toBeDefined()
    })

    it('should throw for non-existent perimeter', () => {
      expectThrowsForInvalidId(() => slice.actions.getPerimeterById('perimeter_fake' as any))
    })
  })

  describe('getPerimetersByStorey', () => {
    it('should return all perimeters for storey', () => {
      const wallAssemblyId = createWallAssemblyId()
      const storey1 = testStoreyId
      const storey2 = createStoreyId()

      slice.actions.addPerimeter(storey1, createRectangularBoundary(), wallAssemblyId, 420)
      slice.actions.addPerimeter(storey1, createTriangularBoundary(), wallAssemblyId, 420)
      slice.actions.addPerimeter(storey2, createLShapedBoundary(), wallAssemblyId, 420)

      const storey1Perimeters = slice.actions.getPerimetersByStorey(storey1)
      const storey2Perimeters = slice.actions.getPerimetersByStorey(storey2)

      expect(storey1Perimeters).toHaveLength(2)
      expect(storey2Perimeters).toHaveLength(1)
    })

    it('should return empty array for storey with no perimeters', () => {
      const emptyStorey = createStoreyId()
      const perimeters = slice.actions.getPerimetersByStorey(emptyStorey)

      expect(perimeters).toEqual([])
    })
  })

  describe('Movement Operations', () => {
    describe('movePerimeter', () => {
      it('should translate all corners by offset', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        const originalCorners = perimeter.cornerIds.map(id => slice.actions.getPerimeterCornerById(id))
        const offset = newVec2(1000, 500)

        slice.actions.movePerimeter(perimeter.id, offset)

        const movedCorners = perimeter.cornerIds.map(id => slice.actions.getPerimeterCornerById(id))
        movedCorners.forEach((corner, i) => {
          expect(corner.insidePoint[0]).toBe(originalCorners[i].insidePoint[0] + offset[0])
          expect(corner.insidePoint[1]).toBe(originalCorners[i].insidePoint[1] + offset[1])
        })
      })

      it('should recalculate geometry after move', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        const offset = newVec2(1000, 500)
        slice.actions.movePerimeter(perimeter.id, offset)

        // Verify geometry still exists and is valid
        expectGeometryExists(slice, perimeter.id)
        const updatedPerimeter = slice.actions.getPerimeterById(perimeter.id)
        expect(updatedPerimeter.innerPolygon).toBeDefined()
        expect(updatedPerimeter.outerPolygon).toBeDefined()
      })

      it('should preserve perimeter shape', () => {
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        const originalWalls = perimeter.wallIds.map(id => slice.actions.getPerimeterWallById(id))
        const originalLengths = originalWalls.map(w => w.wallLength)

        slice.actions.movePerimeter(perimeter.id, newVec2(2000, -1000))

        const movedWalls = perimeter.wallIds.map(id => slice.actions.getPerimeterWallById(id))
        movedWalls.forEach((wall, i) => {
          expect(wall.wallLength).toBeCloseTo(originalLengths[i], 1)
        })
      })
    })

    describe('updatePerimeterBoundary', () => {
      it('should update boundary with new points', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        const newBoundary = [newVec2(0, 0), newVec2(15000, 0), newVec2(15000, 8000), newVec2(0, 8000)]

        const success = slice.actions.updatePerimeterBoundary(perimeter.id, newBoundary)

        expect(success).toBe(true)
        const updatedPerimeter = slice.actions.getPerimeterById(perimeter.id)
        expect(updatedPerimeter.cornerIds).toHaveLength(4)
      })

      it('should do nothing when point count changes', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        expect(perimeter.wallIds).toHaveLength(4)

        const triangleBoundary = [newVec2(0, 0), newVec2(10000, 0), newVec2(5000, 8000)]

        slice.actions.updatePerimeterBoundary(perimeter.id, triangleBoundary)

        const updated = slice.actions.getPerimeterById(perimeter.id)
        expect(updated).toEqual(perimeter)
      })

      it('should preserve wall properties where possible', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        const newAssemblyId = createWallAssemblyId()
        slice.actions.updateAllPerimeterWallsAssembly(perimeter.id, newAssemblyId)

        const newBoundary = [newVec2(0, 0), newVec2(12000, 0), newVec2(12000, 6000), newVec2(0, 6000)]

        slice.actions.updatePerimeterBoundary(perimeter.id, newBoundary)

        const walls = slice.actions.getPerimeterWallsById(perimeter.id)
        walls.forEach(wall => {
          expect(wall.wallAssemblyId).toBe(newAssemblyId)
          expect(wall.thickness).toBe(420)
        })
      })

      it('should reject boundary with less than 3 points', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        const invalidBoundary = [newVec2(0, 0), newVec2(100, 0)]

        const success = slice.actions.updatePerimeterBoundary(perimeter.id, invalidBoundary)

        expect(success).toBe(false)
      })

      it('should return throw for non-existent perimeter', () => {
        const newBoundary = [newVec2(0, 0), newVec2(100, 0), newVec2(50, 100)]

        expect(() => slice.actions.updatePerimeterBoundary('perimeter_fake' as any, newBoundary)).toThrow(NotFoundError)
      })
    })
  })

  describe('Bulk Operations', () => {
    describe('updateAllPerimeterWallsAssembly', () => {
      it('should update assembly for all walls', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        const newAssemblyId = createWallAssemblyId()
        slice.actions.updateAllPerimeterWallsAssembly(perimeter.id, newAssemblyId)

        const walls = perimeter.wallIds.map(id => slice.actions.getPerimeterWallById(id))
        walls.forEach(wall => {
          expect(wall.wallAssemblyId).toBe(newAssemblyId)
        })
      })
    })

    describe('updateAllPerimeterWallsThickness', () => {
      it('should update thickness for all walls and recalculate geometry', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        const newThickness = 300
        slice.actions.updateAllPerimeterWallsThickness(perimeter.id, newThickness)

        const walls = perimeter.wallIds.map(id => slice.actions.getPerimeterWallById(id))
        walls.forEach(wall => {
          expect(wall.thickness).toBe(newThickness)
        })

        // Verify geometry was recalculated
        expectGeometryExists(slice, perimeter.id)
      })

      it('should reject invalid thickness', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        expect(() => {
          slice.actions.updateAllPerimeterWallsThickness(perimeter.id, 0)
        }).toThrow()
      })
    })
  })

  describe('Ring Beam Bulk Operations', () => {
    it('should set base ring beam for all walls', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      const ringBeamId = 'rb_base' as any
      slice.actions.setAllWallsBaseRingBeam(perimeter.id, ringBeamId)

      const walls = perimeter.wallIds.map(id => slice.actions.getPerimeterWallById(id))
      walls.forEach(wall => {
        expect(wall.baseRingBeamAssemblyId).toBe(ringBeamId)
      })
    })

    it('should set top ring beam for all walls', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      const ringBeamId = 'rb_top' as any
      slice.actions.setAllWallsTopRingBeam(perimeter.id, ringBeamId)

      const walls = perimeter.wallIds.map(id => slice.actions.getPerimeterWallById(id))
      walls.forEach(wall => {
        expect(wall.topRingBeamAssemblyId).toBe(ringBeamId)
      })
    })

    it('should remove base ring beam from all walls', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const ringBeamId = 'rb_base' as any
      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420, ringBeamId)

      slice.actions.removeAllWallsBaseRingBeam(perimeter.id)

      const walls = perimeter.wallIds.map(id => slice.actions.getPerimeterWallById(id))
      walls.forEach(wall => {
        expect(wall.baseRingBeamAssemblyId).toBeUndefined()
      })
    })

    it('should remove top ring beam from all walls', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const ringBeamId = 'rb_top' as any
      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420, undefined, ringBeamId)

      slice.actions.removeAllWallsTopRingBeam(perimeter.id)

      const walls = perimeter.wallIds.map(id => slice.actions.getPerimeterWallById(id))
      walls.forEach(wall => {
        expect(wall.topRingBeamAssemblyId).toBeUndefined()
      })
    })
  })

  describe('setPerimeterReferenceSide', () => {
    it('should update reference side', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      expect(perimeter.referenceSide).toBe('inside')

      slice.actions.setPerimeterReferenceSide(perimeter.id, 'outside')

      const updated = slice.actions.getPerimeterById(perimeter.id)
      expect(updated.referenceSide).toBe('outside')
    })

    it('geometry should stay the same when changing reference side', () => {
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      const insideGeometry = slice.actions.getPerimeterById(perimeter.id)

      slice.actions.setPerimeterReferenceSide(perimeter.id, 'outside')

      const outsideGeometry = slice.actions.getPerimeterById(perimeter.id)

      // Geometry should be different
      expect(outsideGeometry.innerPolygon).toEqual(insideGeometry.innerPolygon)
      expect(outsideGeometry.outerPolygon).toEqual(insideGeometry.outerPolygon)
    })
  })
})
