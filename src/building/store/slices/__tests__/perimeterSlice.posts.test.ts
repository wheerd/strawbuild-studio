import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PerimeterId, PerimeterWallId, StoreyId, WallPostId } from '@/building/model/ids'
import { createWallAssemblyId } from '@/building/model/ids'
import type { PerimetersSlice } from '@/building/store/slices/perimeterSlice'
import { ensurePolygonIsClockwise, wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'

import {
  createLShapedBoundary,
  createRectangularBoundary,
  expectThrowsForInvalidId,
  mockPost,
  setupPerimeterSlice,
  verifyNoOrphanedEntities
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

describe('wallPostSlice', () => {
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

  describe('Basic Wall Post CRUD', () => {
    describe('addWallPost', () => {
      it('should create wall post with correct wall reference', () => {
        const post = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )

        expect(post).toBeTruthy()
        const storedPost = slice.wallPosts[post.id]
        expect(storedPost).toBeDefined()
        expect(storedPost.wallId).toBe(wallId)
        expect(storedPost.centerOffsetFromWallStart).toBe(2000)
        expect(storedPost.width).toBe(100)
      })

      it('should update wall entityIds array', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        const originalEntityCount = wall.entityIds.length

        const post = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )

        const updatedWall = slice.actions.getPerimeterWallById(wallId)
        expect(updatedWall.entityIds).toHaveLength(originalEntityCount + 1)
        expect(updatedWall.entityIds).toContain(post.id)
      })

      it('should create wall post geometry', () => {
        const post = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )

        expect(slice._wallPostGeometry[post.id]).toBeDefined()
        const geometry = slice._wallPostGeometry[post.id]
        expect(geometry.polygon).toBeDefined()
        expect(geometry.polygon.points).toHaveLength(4)
      })

      it('should reject invalid width (zero)', () => {
        expect(() =>
          slice.actions.addWallPost(
            wallId,
            mockPost({
              centerOffsetFromWallStart: 2000,
              width: 0
            })
          )
        ).toThrow()
      })

      it('should reject invalid width (negative)', () => {
        expect(() =>
          slice.actions.addWallPost(
            wallId,
            mockPost({
              centerOffsetFromWallStart: 2000,
              width: -100
            })
          )
        ).toThrow()
      })

      it('should reject invalid placement', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)

        // Try to place post beyond wall length
        expect(() =>
          slice.actions.addWallPost(
            wallId,
            mockPost({
              centerOffsetFromWallStart: wall.wallLength + 1000,
              width: 100
            })
          )
        ).toThrow()
      })

      it('should reject overlapping posts', () => {
        // Add first post
        slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )

        // Try to add overlapping post
        expect(() =>
          slice.actions.addWallPost(
            wallId,
            mockPost({
              centerOffsetFromWallStart: 2050,
              width: 100
            })
          )
        ).toThrow()
      })

      it('should reject post overlapping with opening', () => {
        // Add opening
        slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        // Try to add post overlapping with opening
        expect(() =>
          slice.actions.addWallPost(
            wallId,
            mockPost({
              centerOffsetFromWallStart: 2100,
              width: 100
            })
          )
        ).toThrow()
      })
    })

    describe('removeWallPost', () => {
      let postId: WallPostId

      beforeEach(() => {
        const post = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )
        postId = post.id
      })

      it('should remove post from state', () => {
        slice.actions.removeWallPost(postId)

        expect(slice.wallPosts[postId]).toBeUndefined()
      })

      it('should update wall entityIds array', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        expect(wall.entityIds).toContain(postId)

        slice.actions.removeWallPost(postId)

        const updatedWall = slice.actions.getPerimeterWallById(wallId)
        expect(updatedWall.entityIds).not.toContain(postId)
      })

      it('should clean up post geometry', () => {
        expect(slice._wallPostGeometry[postId]).toBeDefined()

        slice.actions.removeWallPost(postId)

        expect(slice._wallPostGeometry[postId]).toBeUndefined()
      })

      it('should have no orphaned entities after removal', () => {
        slice.actions.removeWallPost(postId)

        verifyNoOrphanedEntities(slice)
      })

      it('should not throw for non-existent post', () => {
        expect(() => {
          slice.actions.removeWallPost('wallpost_fake' as any)
        }).not.toThrow()
      })
    })

    describe('updateWallPost', () => {
      let postId: WallPostId

      beforeEach(() => {
        const post = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )
        postId = post.id
      })

      it('should update post properties', () => {
        slice.actions.updateWallPost(postId, {
          centerOffsetFromWallStart: 3000,
          width: 150
        })

        const post = slice.wallPosts[postId]
        expect(post.centerOffsetFromWallStart).toBe(3000)
        expect(post.width).toBe(150)
      })

      it('should recalculate post geometry', () => {
        const originalGeometry = slice._wallPostGeometry[postId]

        slice.actions.updateWallPost(postId, {
          centerOffsetFromWallStart: 3000
        })

        const updatedGeometry = slice._wallPostGeometry[postId]
        expect(updatedGeometry).not.toEqual(originalGeometry)
      })

      it('should reject invalid updates', () => {
        const originalPost = { ...slice.wallPosts[postId] }

        slice.actions.updateWallPost(postId, {
          width: 0
        })

        // Post should be unchanged
        const post = slice.wallPosts[postId]
        expect(post.width).toBe(originalPost.width)
      })

      it('should throw for non-existent post', () => {
        expect(() => {
          slice.actions.updateWallPost('wallpost_fake' as any, {
            width: 150
          })
        }).toThrow()
      })
    })
  })

  describe('Wall Post Getters', () => {
    describe('getWallPostById', () => {
      it('should return post with geometry', () => {
        const addedPost = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )

        const post = slice.actions.getWallPostById(addedPost.id)

        expect(post.id).toBe(addedPost.id)
        expect(post.wallId).toBe(wallId)
        expect(post.polygon).toBeDefined()
      })

      it('should throw for non-existent post', () => {
        expectThrowsForInvalidId(() => slice.actions.getWallPostById('wallpost_fake' as any))
      })
    })

    describe('getWallEntityById', () => {
      it('should return post when entity is a post', () => {
        const post = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )

        const entity = slice.actions.getWallEntityById(post.id)

        expect(entity.id).toBe(post.id)
        expect(entity.wallId).toBe(wallId)
      })
    })
  })

  describe('Wall Post Validation', () => {
    describe('isWallPostPlacementValid', () => {
      it('should return true for valid placement', () => {
        const isValid = slice.actions.isWallPostPlacementValid(wallId, 2000, 100)

        expect(isValid).toBe(true)
      })

      it('should return false when post extends beyond wall start and corner belongs to other wall', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        slice.actions.updatePerimeterCornerConstructedByWall(wall.startCornerId, 'previous')

        const isValid = slice.actions.isWallPostPlacementValid(wallId, 30, 100)

        expect(isValid).toBe(false)
      })

      it('should return true when post extends into start corner belonging to wall', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        slice.actions.updatePerimeterCornerConstructedByWall(wall.startCornerId, 'next')

        const isValid = slice.actions.isWallPostPlacementValid(wallId, 30, 100)

        expect(isValid).toBe(true)
      })

      it('should return false when post extends beyond wall end and corner belongs to other wall', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        slice.actions.updatePerimeterCornerConstructedByWall(wall.startCornerId, 'next')

        const isValid = slice.actions.isWallPostPlacementValid(wallId, wall.wallLength - 30, 100)

        expect(isValid).toBe(false)
      })

      it('should return true when post extends into end corner belonging to wall', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        slice.actions.updatePerimeterCornerConstructedByWall(wall.startCornerId, 'previous')

        const isValid = slice.actions.isWallPostPlacementValid(wallId, wall.wallLength - 30, 100)

        expect(isValid).toBe(false)
      })

      it('should return false when overlapping with existing post', () => {
        slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )

        const isValid = slice.actions.isWallPostPlacementValid(wallId, 2050, 100)

        expect(isValid).toBe(false)
      })

      it('should return false when overlapping with opening', () => {
        slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        const isValid = slice.actions.isWallPostPlacementValid(wallId, 2100, 100)

        expect(isValid).toBe(false)
      })

      it('should allow excluding specific post from overlap check', () => {
        const post = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )

        // Should be valid because we're excluding the existing post
        const isValid = slice.actions.isWallPostPlacementValid(wallId, 2050, 100, post.id)

        expect(isValid).toBe(true)
      })
    })

    describe('findNearestValidWallPostPosition', () => {
      it('should return same position when already valid', () => {
        const position = slice.actions.findNearestValidWallPostPosition(wallId, 2000, 100)

        expect(position).toBe(2000)
      })

      it('should adjust position when near wall start and corner belongs to other wall', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        slice.actions.updatePerimeterCornerConstructedByWall(wall.startCornerId, 'previous')

        const position = slice.actions.findNearestValidWallPostPosition(wallId, 30, 100)

        expect(position).toBeGreaterThanOrEqual(50)
      })

      it('should allow overlap near wall start and corner belongs to wall', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)
        slice.actions.updatePerimeterCornerConstructedByWall(wall.startCornerId, 'next')

        const position = slice.actions.findNearestValidWallPostPosition(wallId, 30, 100)

        expect(position).toBeGreaterThanOrEqual(30) // At least half width from start
      })

      it('should adjust position when near wall end', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)

        const position = slice.actions.findNearestValidWallPostPosition(wallId, wall.wallLength - 30, 100)

        expect(position).toBeLessThanOrEqual(wall.wallLength - 50) // At least half width from end
      })

      it('should return null when no valid position exists', () => {
        const wall = slice.actions.getPerimeterWallById(wallId)

        // Try to place post wider than wall
        const position = slice.actions.findNearestValidWallPostPosition(
          wallId,
          wall.wallLength / 2,
          wall.wallLength + 1000
        )

        expect(position).toBeNull()
      })

      it('should find position avoiding existing posts', () => {
        // Add post in middle of wall
        slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )

        // Try to place post at overlapping position
        const position = slice.actions.findNearestValidWallPostPosition(wallId, 2050, 100)

        // Should find valid position away from existing post
        expect(position).toBeGreaterThanOrEqual(2100) // At least one width away
      })

      it('should find position avoiding openings', () => {
        // Add opening in middle of wall
        slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })

        // Try to place post at overlapping position
        const position = slice.actions.findNearestValidWallPostPosition(wallId, 2100, 100)

        // Should find valid position away from opening
        expect(position).toBeGreaterThanOrEqual(2000 + 450 + 50) // Opening half-width + post half-width
      })
    })
  })

  describe('Wall Post Cascade Cleanup', () => {
    it('should remove posts when wall is removed', () => {
      const boundary = createLShapedBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      const post = slice.actions.addWallPost(
        perimeter.wallIds[0],
        mockPost({
          centerOffsetFromWallStart: 100,
          width: 100
        })
      )

      expect(slice.wallPosts[post.id]).toBeDefined()

      slice.actions.removePerimeterWall(perimeter.wallIds[0])

      expect(slice.wallPosts[post.id]).toBeUndefined()
      expect(slice._wallPostGeometry[post.id]).toBeUndefined()
    })

    it('should remove posts when perimeter is removed', () => {
      const post = slice.actions.addWallPost(
        wallId,
        mockPost({
          centerOffsetFromWallStart: 2000,
          width: 100
        })
      )

      expect(slice.wallPosts[post.id]).toBeDefined()

      slice.actions.removePerimeter(perimeterId)

      expect(slice.wallPosts[post.id]).toBeUndefined()
      expect(slice._wallPostGeometry[post.id]).toBeUndefined()
    })

    it('should redistribute posts when wall is split', () => {
      const wall = slice.actions.getPerimeterWallById(wallId)
      const splitPosition = wall.wallLength / 2

      // Add post before split point
      const post1 = slice.actions.addWallPost(
        wallId,
        mockPost({
          centerOffsetFromWallStart: splitPosition - 1000,
          width: 100
        })
      )

      // Add post after split point
      const post2 = slice.actions.addWallPost(
        wallId,
        mockPost({
          centerOffsetFromWallStart: splitPosition + 1000,
          width: 100
        })
      )

      const newWallId = slice.actions.splitPerimeterWall(wallId, splitPosition)!

      const firstWall = slice.actions.getPerimeterWallById(wallId)
      const secondWall = slice.actions.getPerimeterWallById(newWallId)

      expect(firstWall.entityIds).toContain(post1.id)
      expect(secondWall.entityIds).toContain(post2.id)

      // Both posts should still exist
      expect(slice.wallPosts[post1.id]).toBeDefined()
      expect(slice.wallPosts[post2.id]).toBeDefined()
    })
  })

  describe('Wall Post Reference Consistency', () => {
    it('should maintain correct wall reference', () => {
      const post = slice.actions.addWallPost(
        wallId,
        mockPost({
          centerOffsetFromWallStart: 2000,
          width: 100
        })
      )

      const storedPost = slice.wallPosts[post.id]
      expect(storedPost.wallId).toBe(wallId)

      const wall = slice.actions.getPerimeterWallById(wallId)
      expect(wall.entityIds).toContain(post.id)
    })

    it('should update wall reference when post moves to different wall after split', () => {
      const wall = slice.actions.getPerimeterWallById(wallId)
      const splitPosition = wall.wallLength / 2

      const post = slice.actions.addWallPost(
        wallId,
        mockPost({
          centerOffsetFromWallStart: splitPosition + 1000,
          width: 100
        })
      )

      const newWallId = slice.actions.splitPerimeterWall(wallId, splitPosition)!

      const storedPost = slice.wallPosts[post.id]
      expect(storedPost.wallId).toBe(newWallId)

      const newWall = slice.actions.getPerimeterWallById(newWallId)
      expect(newWall.entityIds).toContain(post.id)
    })
  })

  describe('Mixed Entities on Wall', () => {
    it('should handle both openings and posts on same wall', () => {
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

      const wall = slice.actions.getPerimeterWallById(wallId)
      expect(wall.entityIds).toContain(opening.id)
      expect(wall.entityIds).toContain(post.id)
      expect(wall.entityIds).toHaveLength(2)
    })

    it('should validate posts against openings', () => {
      slice.actions.addWallOpening(wallId, {
        openingType: 'door',
        centerOffsetFromWallStart: 2000,
        width: 900,
        height: 2100
      })

      // Post should not overlap with opening
      const isValid = slice.actions.isWallPostPlacementValid(wallId, 2100, 100)

      expect(isValid).toBe(false)
    })

    it('should redistribute both posts and openings when wall splits', () => {
      const wall = slice.actions.getPerimeterWallById(wallId)
      const splitPosition = wall.wallLength / 2

      const opening = slice.actions.addWallOpening(wallId, {
        openingType: 'door',
        centerOffsetFromWallStart: splitPosition - 1000,
        width: 900,
        height: 2100
      })

      const post = slice.actions.addWallPost(
        wallId,
        mockPost({
          centerOffsetFromWallStart: splitPosition + 1000,
          width: 100
        })
      )

      const newWallId = slice.actions.splitPerimeterWall(wallId, splitPosition)!

      const firstWall = slice.actions.getPerimeterWallById(wallId)
      const secondWall = slice.actions.getPerimeterWallById(newWallId)

      expect(firstWall.entityIds).toContain(opening.id)
      expect(secondWall.entityIds).toContain(post.id)
    })
  })
})
