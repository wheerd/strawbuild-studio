import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OpeningId, StoreyId, WallEntityId } from '@/building/model/ids'
import { createStoreyId, createWallAssemblyId, isOpeningId } from '@/building/model/ids'
import type { PerimetersSlice } from '@/building/store/slices/perimeterSlice'
import { ensurePolygonIsClockwise, wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'

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

describe('perimeterIntegration', () => {
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

  describe('Complex Scenarios', () => {
    describe('Add perimeter → add openings → split wall → verify redistribution', () => {
      it('should redistribute openings correctly after wall split', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const wallId = perimeter.wallIds[0]
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
          width: 900,
          height: 1500
        })

        // Add post before split point
        const post1 = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: splitPosition - 100,
            width: 100
          })
        )

        // Add post after split point
        const post2 = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: splitPosition + 100,
            width: 100
          })
        )

        const newWallId = slice.actions.splitPerimeterWall(wallId, splitPosition)!

        const firstWall = slice.actions.getPerimeterWallById(wallId)
        const secondWall = slice.actions.getPerimeterWallById(newWallId)

        // Verify entities are on correct walls
        expect(firstWall.entityIds).toContain(opening1.id)
        expect(firstWall.entityIds).toContain(post1.id)
        expect(secondWall.entityIds).toContain(opening2.id)
        expect(secondWall.entityIds).toContain(post2.id)

        // All entities should still exist
        expect(slice.openings[opening1.id]).toBeDefined()
        expect(slice.openings[opening2.id]).toBeDefined()
        expect(slice.wallPosts[post1.id]).toBeDefined()
        expect(slice.wallPosts[post2.id]).toBeDefined()

        // Verify reference consistency
        verifyPerimeterReferences(slice, perimeter.id)
        verifyNoOrphanedEntities(slice)
      })
    })

    describe('Add perimeter → remove corner → verify walls merged and entities preserved', () => {
      it('should merge walls and remove all wall entities when corner is removed', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const cornerToRemove = perimeter.cornerIds[0]
        const corner = slice.actions.getPerimeterCornerById(cornerToRemove)
        const firstWall = slice.actions.getPerimeterWallById(corner.previousWallId)
        const secondWall = slice.actions.getPerimeterWallById(corner.nextWallId)

        // Add opening to previous wall
        const opening1 = slice.actions.addWallOpening(firstWall.id, {
          openingType: 'door',
          centerOffsetFromWallStart: 1000,
          width: 900,
          height: 2100
        })

        // Add post to previous wall
        const post1 = slice.actions.addWallPost(
          firstWall.id,
          mockPost({
            centerOffsetFromWallStart: 3000,
            width: 100
          })
        )

        // Add opening to next wall
        const opening2 = slice.actions.addWallOpening(secondWall.id, {
          openingType: 'door',
          centerOffsetFromWallStart: 1000,
          width: 900,
          height: 2100
        })

        // Add post to next wall
        const post2 = slice.actions.addWallPost(
          secondWall.id,
          mockPost({
            centerOffsetFromWallStart: 3000,
            width: 100
          })
        )

        const originalWallCount = perimeter.wallIds.length
        const originalCornerCount = perimeter.cornerIds.length

        slice.actions.removePerimeterCorner(cornerToRemove)

        const updatedPerimeter = slice.actions.getPerimeterById(perimeter.id)
        expect(updatedPerimeter.wallIds).toHaveLength(originalWallCount - 1)
        expect(updatedPerimeter.cornerIds).toHaveLength(originalCornerCount - 1)

        // Opening and post should not exist anymore
        expect(slice.openings[opening1.id]).toBeUndefined()
        expect(slice.wallPosts[post1.id]).toBeUndefined()
        expect(slice.openings[opening2.id]).toBeUndefined()
        expect(slice.wallPosts[post2.id]).toBeUndefined()

        verifyPerimeterReferences(slice, perimeter.id)
        verifyNoOrphanedEntities(slice)
      })

      it('should merge walls and preserve entities when corner is removed between two colinear walls', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const firstWall = slice.actions.getPerimeterWallById(perimeter.wallIds[0])
        const secondWallId = slice.actions.splitPerimeterWall(firstWall.id, firstWall.wallLength / 2)!
        const secondWall = slice.actions.getPerimeterWallById(secondWallId)
        const cornerToRemove = secondWall.startCornerId

        // Add opening to next wall
        const opening1 = slice.actions.addWallOpening(firstWall.id, {
          openingType: 'door',
          centerOffsetFromWallStart: 1000,
          width: 900,
          height: 2100
        })

        // Add post to next wall
        const post1 = slice.actions.addWallPost(
          firstWall.id,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )

        // Add opening to next wall
        const opening2 = slice.actions.addWallOpening(secondWall.id, {
          openingType: 'door',
          centerOffsetFromWallStart: 1000,
          width: 900,
          height: 2100
        })

        // Add post to next wall
        const post2 = slice.actions.addWallPost(
          secondWall.id,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )

        const originalWallCount = perimeter.wallIds.length
        const originalCornerCount = perimeter.cornerIds.length

        slice.actions.removePerimeterCorner(cornerToRemove)

        const updatedPerimeter = slice.actions.getPerimeterById(perimeter.id)
        expect(updatedPerimeter.wallIds).toHaveLength(originalWallCount - 1)
        expect(updatedPerimeter.cornerIds).toHaveLength(originalCornerCount - 1)

        // Opening and post should still exist
        expect(slice.openings[opening2.id]).toBeDefined()
        expect(slice.wallPosts[post2.id]).toBeDefined()

        // Find merged wall
        const mergedWallId = updatedPerimeter.wallIds.find(wId => {
          const wall = slice.actions.getPerimeterWallById(wId)
          return wall.entityIds.includes(opening2.id)
        })

        expect(mergedWallId).toBeDefined()

        const mergedWall = slice.actions.getPerimeterWallById(mergedWallId!)
        expect(mergedWall.entityIds).toHaveLength(4)
        expect(mergedWall.entityIds).toContain(opening1.id)
        expect(mergedWall.entityIds).toContain(post1.id)
        expect(mergedWall.entityIds).toContain(opening2.id)
        expect(mergedWall.entityIds).toContain(post2.id)

        verifyPerimeterReferences(slice, perimeter.id)
        verifyNoOrphanedEntities(slice)
      })
    })

    describe('Add perimeter → change all thicknesses → verify geometry recalculated', () => {
      it('should recalculate all geometry when all wall thicknesses change', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        // Add entities
        const wallId = perimeter.wallIds[0]
        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        const post = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 4000,
            width: 100
          })
        )

        // Store original geometry
        const originalWalls = perimeter.wallIds.map(id => ({
          id,
          geometry: { ...slice._perimeterWallGeometry[id] }
        }))
        const originalCorners = perimeter.cornerIds.map(id => ({
          id,
          geometry: { ...slice._perimeterCornerGeometry[id] }
        }))
        const originalOpeningGeometry = { ...slice._openingGeometry[opening.id] }
        const originalPostGeometry = { ...slice._wallPostGeometry[post.id] }

        // Change all wall thicknesses
        slice.actions.updateAllPerimeterWallsThickness(perimeter.id, 600)

        // Verify all walls have new thickness
        const walls = slice.actions.getPerimeterWallsById(perimeter.id)
        walls.forEach(wall => {
          expect(wall.thickness).toBe(600)
        })

        // Verify geometry changed
        originalWalls.forEach(({ id }) => {
          const newGeometry = slice._perimeterWallGeometry[id]
          expect(newGeometry).not.toEqual(originalWalls.find(w => w.id === id)?.geometry)
        })

        originalCorners.forEach(({ id }) => {
          const newGeometry = slice._perimeterCornerGeometry[id]
          expect(newGeometry).not.toEqual(originalCorners.find(c => c.id === id)?.geometry)
        })

        expect(slice._openingGeometry[opening.id]).not.toEqual(originalOpeningGeometry)
        expect(slice._wallPostGeometry[post.id]).not.toEqual(originalPostGeometry)

        verifyGeometryExists(slice, perimeter.id)
        verifyPerimeterReferences(slice, perimeter.id)
      })
    })

    describe('Add multiple perimeters on same storey → verify independence', () => {
      it('should maintain independence between perimeters on same storey', () => {
        const boundary1 = createRectangularBoundary(10000, 5000)
        const boundary2 = createRectangularBoundary(8000, 4000)
        const wallAssemblyId1 = createWallAssemblyId()
        const wallAssemblyId2 = createWallAssemblyId()

        const perimeter1 = slice.actions.addPerimeter(testStoreyId, boundary1, wallAssemblyId1, 420)
        const perimeter2 = slice.actions.addPerimeter(testStoreyId, boundary2, wallAssemblyId2, 500)

        expect(perimeter1.id).not.toBe(perimeter2.id)

        // Add opening to first perimeter
        const wall1Id = perimeter1.wallIds[0]
        const opening1 = slice.actions.addWallOpening(wall1Id, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        // Modify first perimeter
        slice.actions.updatePerimeterWallThickness(wall1Id, 600)

        // Second perimeter should be unaffected
        const walls2 = slice.actions.getPerimeterWallsById(perimeter2.id)
        walls2.forEach(wall => {
          expect(wall.thickness).toBe(500)
        })

        // First perimeter should have opening, second should not
        const walls1 = slice.actions.getPerimeterWallsById(perimeter1.id)
        const hasOpening1 = walls1.some(wall => wall.entityIds.includes(opening1.id))
        expect(hasOpening1).toBe(true)

        const hasOpening2 = walls2.some(wall => wall.entityIds.includes(opening1.id))
        expect(hasOpening2).toBe(false)

        verifyPerimeterReferences(slice, perimeter1.id)
        verifyPerimeterReferences(slice, perimeter2.id)
        verifyNoOrphanedEntities(slice)
      })
    })
  })

  describe('Getter Tests', () => {
    describe('Error handling for non-existent IDs', () => {
      it('should throw for non-existent perimeter ID', () => {
        expectThrowsForInvalidId(() => slice.actions.getPerimeterById('perimeter_fake' as any))
      })

      it('should throw for non-existent wall ID', () => {
        expectThrowsForInvalidId(() => slice.actions.getPerimeterWallById('wall_fake' as any))
      })

      it('should throw for non-existent corner ID', () => {
        expectThrowsForInvalidId(() => slice.actions.getPerimeterCornerById('corner_fake' as any))
      })

      it('should throw for non-existent opening ID', () => {
        expectThrowsForInvalidId(() => slice.actions.getWallOpeningById('opening_fake' as any))
      })

      it('should throw for non-existent post ID', () => {
        expectThrowsForInvalidId(() => slice.actions.getWallPostById('wallpost_fake' as any))
      })
    })

    describe('getPerimetersByStorey', () => {
      it('should return correct perimeters for storey', () => {
        const storey1 = createStoreyId()
        const storey2 = createStoreyId()
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()

        const perimeter1 = slice.actions.addPerimeter(storey1, boundary, wallAssemblyId, 420)
        const perimeter2 = slice.actions.addPerimeter(storey1, boundary, wallAssemblyId, 420)
        const perimeter3 = slice.actions.addPerimeter(storey2, boundary, wallAssemblyId, 420)

        const storeyPerimeters = slice.actions.getPerimetersByStorey(storey1)

        expect(storeyPerimeters).toHaveLength(2)
        expect(storeyPerimeters.map(p => p.id)).toContain(perimeter1.id)
        expect(storeyPerimeters.map(p => p.id)).toContain(perimeter2.id)
        expect(storeyPerimeters.map(p => p.id)).not.toContain(perimeter3.id)
      })

      it('should return empty array for storey with no perimeters', () => {
        const storey = createStoreyId()
        const perimeters = slice.actions.getPerimetersByStorey(storey)

        expect(perimeters).toHaveLength(0)
      })
    })

    describe('getAllPerimeters', () => {
      it('should return all perimeters', () => {
        const storey1 = createStoreyId()
        const storey2 = createStoreyId()
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()

        const perimeter1 = slice.actions.addPerimeter(storey1, boundary, wallAssemblyId, 420)
        const perimeter2 = slice.actions.addPerimeter(storey2, boundary, wallAssemblyId, 420)

        const allPerimeters = slice.actions.getAllPerimeters()

        expect(allPerimeters).toHaveLength(2)
        expect(allPerimeters.map(p => p.id)).toContain(perimeter1.id)
        expect(allPerimeters.map(p => p.id)).toContain(perimeter2.id)
      })

      it('should return empty array when no perimeters exist', () => {
        const allPerimeters = slice.actions.getAllPerimeters()

        expect(allPerimeters).toHaveLength(0)
      })
    })
  })

  describe('Reference Integrity', () => {
    describe('After complex operations, all references are valid', () => {
      it('should maintain valid references after multiple operations', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        // Add entities
        const wallId = perimeter.wallIds[0]
        slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 4000,
            width: 100
          })
        )

        // Perform various operations
        const wall = slice.actions.getPerimeterWallById(wallId)
        slice.actions.splitPerimeterWall(wallId, wall.wallLength / 2)

        const updatedPerimeter = slice.actions.getPerimeterById(perimeter.id)
        slice.actions.removePerimeterCorner(updatedPerimeter.cornerIds[0])

        slice.actions.updateAllPerimeterWallsThickness(perimeter.id, 600)

        // Verify references are still valid
        verifyPerimeterReferences(slice, perimeter.id)
        verifyNoOrphanedEntities(slice)
        verifyGeometryExists(slice, perimeter.id)
      })
    })

    describe('No orphaned entities after complex operations', () => {
      it('should not create orphaned entities', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()

        // Create and delete perimeters
        const perimeter1 = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const perimeter2 = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 500)

        // Add entities to first perimeter
        const wallId = perimeter1.wallIds[0]
        slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        // Remove first perimeter
        slice.actions.removePerimeter(perimeter1.id)

        // Should have no orphaned entities
        verifyNoOrphanedEntities(slice)

        // Second perimeter should still exist
        const remaining = slice.actions.getPerimeterById(perimeter2.id)
        expect(remaining).toBeDefined()
      })
    })

    describe('No orphaned geometry records', () => {
      it('should clean up all geometry when entities are removed', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        const wallId = perimeter.wallIds[0]
        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        const post = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 4000,
            width: 100
          })
        )!

        // Remove entities
        slice.actions.removeWallOpening(opening.id)
        slice.actions.removeWallPost(post.id)

        // Geometry should be cleaned up
        expect(slice._openingGeometry[opening.id]).toBeUndefined()
        expect(slice._wallPostGeometry[post.id]).toBeUndefined()

        // Remove perimeter
        slice.actions.removePerimeter(perimeter.id)

        // All geometry should be cleaned up
        expect(slice._perimeterGeometry[perimeter.id]).toBeUndefined()
        perimeter.wallIds.forEach(wId => {
          expect(slice._perimeterWallGeometry[wId]).toBeUndefined()
        })
        perimeter.cornerIds.forEach(cId => {
          expect(slice._perimeterCornerGeometry[cId]).toBeUndefined()
        })

        verifyNoOrphanedEntities(slice)
      })
    })
  })

  describe('Edge Cases and Stress Tests', () => {
    describe('Multiple split operations', () => {
      it('should handle splitting the same wall multiple times', () => {
        const boundary = createRectangularBoundary(20000, 10000)
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        let wallId = perimeter.wallIds[0]

        // Split wall multiple times
        for (let i = 0; i < 3; i++) {
          const wall = slice.actions.getPerimeterWallById(wallId)
          const splitPosition = wall.wallLength / 2
          const newWallId = slice.actions.splitPerimeterWall(wallId, splitPosition)
          expect(newWallId).toBeTruthy()
          wallId = newWallId!
        }

        const updatedPerimeter = slice.actions.getPerimeterById(perimeter.id)
        expect(updatedPerimeter.wallIds.length).toBeGreaterThan(4)

        verifyPerimeterReferences(slice, perimeter.id)
        verifyNoOrphanedEntities(slice)
      })
    })

    describe('Many entities on single wall', () => {
      it('should handle wall with many entities', () => {
        const boundary = createLShapedBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const wallId = perimeter.wallIds[0]

        // Add many entities
        const entityIds: OpeningId[] = []
        for (let i = 0; i < 5; i++) {
          const opening = slice.actions.addWallOpening(wallId, {
            openingType: i % 2 === 0 ? 'door' : 'window',
            centerOffsetFromWallStart: 200 + i * 400,
            width: 300,
            height: 2100
          })
          if (opening) entityIds.push(opening.id)
        }

        expect(entityIds.length).toBeGreaterThan(0)

        const wall = slice.actions.getPerimeterWallById(wallId)
        expect(wall.entityIds.length).toBe(entityIds.length)

        // Remove wall
        slice.actions.removePerimeterWall(wallId)

        // All entities should be removed
        entityIds.forEach(id => {
          expect(slice.openings[id]).toBeUndefined()
        })

        verifyNoOrphanedEntities(slice)
      })
    })

    describe('Cascade deletion chain', () => {
      it('should handle cascade deletion correctly', () => {
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()
        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        // Add entities to multiple walls
        const entityIds: WallEntityId[] = []
        perimeter.wallIds.forEach(wallId => {
          const opening = slice.actions.addWallOpening(wallId, {
            openingType: 'door',
            centerOffsetFromWallStart: 2000,
            width: 900,
            height: 2100
          })
          if (opening) entityIds.push(opening.id)

          const post = slice.actions.addWallPost(
            wallId,
            mockPost({
              centerOffsetFromWallStart: 4000,
              width: 100
            })
          )
          if (post) entityIds.push(post.id)
        })

        // Remove perimeter (should cascade to all walls and entities)
        slice.actions.removePerimeter(perimeter.id)

        // Verify everything is cleaned up
        expect(slice.perimeters[perimeter.id]).toBeUndefined()
        perimeter.wallIds.forEach(wallId => {
          expect(slice.perimeterWalls[wallId]).toBeUndefined()
        })
        perimeter.cornerIds.forEach(cornerId => {
          expect(slice.perimeterCorners[cornerId]).toBeUndefined()
        })
        entityIds.forEach(entityId => {
          if (isOpeningId(entityId)) {
            expect(slice.openings[entityId]).toBeUndefined()
          } else {
            expect(slice.wallPosts[entityId]).toBeUndefined()
          }
        })

        verifyNoOrphanedEntities(slice)
      })
    })
  })
})
