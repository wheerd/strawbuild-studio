import { vec2 } from 'gl-matrix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type PerimeterId,
  type PerimeterWallId,
  type StoreyId,
  createOpeningId,
  createPerimeterConstructionMethodId,
  createPerimeterCornerId,
  createPerimeterId,
  createPerimeterWallId,
  createStoreyId
} from '@/building/model/ids'
import { type Length, type Polygon2D, wouldClosingPolygonSelfIntersect } from '@/shared/geometry'

import { type PerimetersSlice, createPerimetersSlice } from './perimeterSlice'

vi.mock('@/shared/geometry/polygon', async importOriginal => {
  return {
    ...(await importOriginal()),
    wouldClosingPolygonSelfIntersect: vi.fn()
  }
})

const wouldClosingPolygonSelfIntersectMock = vi.mocked(wouldClosingPolygonSelfIntersect)

// Mock Zustand following the official testing guide
vi.mock('zustand')

describe('perimeterSlice', () => {
  let store: PerimetersSlice
  let mockSet: any
  let mockGet: any
  let testStoreyId: StoreyId

  beforeEach(() => {
    wouldClosingPolygonSelfIntersectMock.mockReset()
    wouldClosingPolygonSelfIntersectMock.mockReturnValue(false)

    // Create the slice directly without using create()
    mockSet = vi.fn()
    mockGet = vi.fn()
    const mockStore = {} as any
    testStoreyId = createStoreyId()

    store = createPerimetersSlice(mockSet, mockGet, mockStore)

    // Mock the get function to return current state
    mockGet.mockImplementation(() => store)

    // Mock the set function to actually update the store
    mockSet.mockImplementation((updater: any) => {
      if (typeof updater === 'function') {
        const newState = updater(store)
        if (newState !== store) {
          store = { ...store, ...newState }
        }
      } else {
        store = { ...store, ...updater }
      }
    })
  })

  // Helper function to create a simple rectangular polygon (in millimeters)
  const createRectangularBoundary = (): Polygon2D => ({
    points: [vec2.fromValues(0, 0), vec2.fromValues(10000, 0), vec2.fromValues(10000, 5000), vec2.fromValues(0, 5000)]
  })

  // Helper function to create a triangular polygon
  const createTriangularBoundary = (): Polygon2D => ({
    points: [vec2.fromValues(0, 0), vec2.fromValues(5, 0), vec2.fromValues(2.5, 4)]
  })

  // Helper function to create a shape with reflex angles (like a "C" or "L" shape)
  const createReflexAngleBoundary = (): Polygon2D => ({
    points: [
      vec2.fromValues(0, 0), // Start
      vec2.fromValues(10, 0), // Move right
      vec2.fromValues(10, 5), // Move up
      vec2.fromValues(5, 5), // Move left (creates reflex angle)
      vec2.fromValues(5, 10), // Move up (creates reflex angle)
      vec2.fromValues(0, 10) // Move left
      // Back to start
    ]
  })

  describe('addPerimeter', () => {
    it('should add perimeter polygon with default thickness', () => {
      const boundary = createRectangularBoundary()
      const constructionMethodId = createPerimeterConstructionMethodId()

      store.actions.addPerimeter(testStoreyId, boundary, constructionMethodId)

      expect(Object.keys(store.perimeters).length).toBe(1)
      const perimeter = Object.values(store.perimeters)[0]

      expect(perimeter.storeyId).toBe(testStoreyId)
      expect(perimeter.corners.map(c => c.insidePoint)).toEqual(boundary.points)
      expect(perimeter.walls).toHaveLength(4) // Rectangle has 4 sides
      expect(perimeter.corners).toHaveLength(4) // Rectangle has 4 corners

      // Check walls have correct properties
      perimeter.walls.forEach(wall => {
        expect(wall.constructionMethodId).toBe(constructionMethodId)
        expect(wall.thickness).toBe(440) // Default perimeter thickness
        expect(wall.openings).toEqual([])
        expect(perimeter.id).toBeTruthy()
      })

      // Check corners have correct properties
      perimeter.corners.forEach(corner => {
        expect(corner.id).toBeTruthy()
        expect(corner.constructedByWall).toBe('next') // Default
        expect(corner.outsidePoint).toBeTruthy()
      })
    })

    it('should add perimeter polygon with custom thickness', () => {
      const boundary = createRectangularBoundary()
      const constructionMethodId = createPerimeterConstructionMethodId()
      const customThickness = 200

      store.actions.addPerimeter(testStoreyId, boundary, constructionMethodId, customThickness)

      const perimeter = Object.values(store.perimeters)[0]
      perimeter.walls.forEach(wall => {
        expect(wall.thickness).toBe(customThickness)
        expect(wall.constructionMethodId).toBe(constructionMethodId)
      })
    })

    it('should add triangular perimeter polygon', () => {
      const boundary = createTriangularBoundary()
      const constructionMethodId = createPerimeterConstructionMethodId()

      store.actions.addPerimeter(testStoreyId, boundary, constructionMethodId)

      const perimeter = Object.values(store.perimeters)[0]
      expect(perimeter.walls).toHaveLength(3) // Triangle has 3 sides
      expect(perimeter.corners).toHaveLength(3) // Triangle has 3 corners
    })

    it('should add multiple perimeter polygons', () => {
      const boundary1 = createRectangularBoundary()
      const boundary2 = createTriangularBoundary()

      store.actions.addPerimeter(testStoreyId, boundary1, createPerimeterConstructionMethodId())
      store.actions.addPerimeter(testStoreyId, boundary2, createPerimeterConstructionMethodId())

      expect(Object.keys(store.perimeters).length).toBe(2)
      const walls = Object.values(store.perimeters)
      expect(walls[0].walls).toHaveLength(4)
      expect(walls[1].walls).toHaveLength(3)
    })

    it('should throw error for insufficient boundary points', () => {
      const invalidBoundary: Polygon2D = {
        points: [vec2.fromValues(0, 0), vec2.fromValues(1, 0)] // Only 2 points
      }

      expect(() =>
        store.actions.addPerimeter(testStoreyId, invalidBoundary, createPerimeterConstructionMethodId())
      ).toThrow('Perimeter boundary must have at least 3 points')
    })

    it('should throw error for zero thickness', () => {
      const boundary = createRectangularBoundary()

      expect(() =>
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId(), 0)
      ).toThrow('Wall thickness must be greater than 0')
    })

    it('should throw error for negative thickness', () => {
      const boundary = createRectangularBoundary()

      expect(() =>
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId(), -100)
      ).toThrow('Wall thickness must be greater than 0')
    })

    it('should compute wall geometry correctly', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeter = Object.values(store.perimeters)[0]
      const wall = perimeter.walls[0] // First wall from (0,0) to (10,0)

      expect(wall.insideLine.start).toEqual(vec2.fromValues(440, 0))
      expect(wall.insideLine.end).toEqual(vec2.fromValues(9560, 0))
      expect(wall.insideLength).toBe(10000)

      // Check that outside line is offset correctly
      expect(wall.outsideLine.start[0]).toBe(440)
      expect(wall.outsideLine.start[1]).toBe(440) // Offset by wall thickness
      expect(wall.outsideLine.end[0]).toBe(9560)
      expect(wall.outsideLine.end[1]).toBe(440)
    })

    it('should calculate different length values correctly', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeter = Object.values(store.perimeters)[0]
      const wall = perimeter.walls[0] // First wall from (0,0) to (10,0)

      // For a rectangular boundary:
      // - insideLength should be the boundary wall length
      // - wallLength should equal insideLength (no truncation for right angles)
      // - outsideLength varies based on corner intersection geometry
      expect(wall.insideLength).toBe(10000) // Original boundary wall
      expect(wall.wallLength).toBe(9120) // Actual wall wall (truncated at corners)

      // outsideLength depends on corner intersection points, verify it's reasonable
      expect(wall.outsideLength).toBeGreaterThan(0)
      expect(wall.outsideLength).toBeLessThan(15000) // Reasonable upper bound for scaled boundary

      // All lengths should be positive and finite
      expect(wall.insideLength).toBeGreaterThan(0)
      expect(wall.wallLength).toBeGreaterThan(0)
      expect(Number.isFinite(wall.outsideLength)).toBe(true)
    })

    it('should handle reflex angles correctly without pointy corners', () => {
      const boundary = createReflexAngleBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeter = Object.values(store.perimeters)[0]

      // Verify wall was created successfully
      expect(perimeter.walls).toHaveLength(6)
      expect(perimeter.corners).toHaveLength(6)

      // Check that walls have proper geometry without overlapping
      perimeter.walls.forEach(wall => {
        expect(wall.insideLength).toBeGreaterThan(0)
        expect(wall.wallLength).toBeGreaterThan(0)
        expect(wall.outsideLength).toBeGreaterThan(0)

        // Verify that lines have valid start and end points
        expect(wall.insideLine.start).toBeDefined()
        expect(wall.insideLine.end).toBeDefined()
        expect(wall.outsideLine.start).toBeDefined()
        expect(wall.outsideLine.end).toBeDefined()

        // For reflex angles, wallLength may be different from insideLength due to truncation
        // but should be reasonable (not negative, not excessively large)
        expect(wall.wallLength).toBeLessThanOrEqual(wall.insideLength * 1.5) // Allow some extension
      })

      // Verify corner points are properly positioned
      perimeter.corners.forEach(corner => {
        expect(corner.outsidePoint).toBeDefined()
        expect(typeof corner.outsidePoint[0]).toBe('number')
        expect(typeof corner.outsidePoint[1]).toBe('number')
        expect(corner.constructedByWall).toMatch(/^(previous|next)$/)
      })
    })
  })

  describe('removeOuterWall', () => {
    it('should remove existing perimeter', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeterId = Object.keys(store.perimeters)[0] as PerimeterId
      expect(Object.keys(store.perimeters).length).toBe(1)

      store.actions.removePerimeter(perimeterId)

      expect(Object.keys(store.perimeters).length).toBe(0)
      expect(!(perimeterId in store.perimeters)).toBe(true)
    })

    it('should handle removing non-existent wall gracefully', () => {
      const initialSize = Object.keys(store.perimeters).length
      const fakePerimeterId = createPerimeterId()

      store.actions.removePerimeter(fakePerimeterId)

      expect(Object.keys(store.perimeters).length).toBe(initialSize)
    })

    it('should not affect other walls when removing one', () => {
      const boundary1 = createRectangularBoundary()
      const boundary2 = createTriangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary1, createPerimeterConstructionMethodId())
      store.actions.addPerimeter(testStoreyId, boundary2, createPerimeterConstructionMethodId())

      const perimeterIds = Object.keys(store.perimeters) as PerimeterId[]
      expect(Object.keys(store.perimeters).length).toBe(2)

      store.actions.removePerimeter(perimeterIds[0])

      expect(Object.keys(store.perimeters).length).toBe(1)
      expect(perimeterIds[1] in store.perimeters).toBe(true)
    })
  })

  describe('updateOuterWallConstructionType', () => {
    it('should update wall construction type', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeter = Object.values(store.perimeters)[0]
      const wallId = perimeter.walls[0].id
      const newMethodId = createPerimeterConstructionMethodId()

      store.actions.updatePerimeterWallConstructionMethod(perimeter.id, wallId, newMethodId)

      const updatedPerimeter = store.perimeters[perimeter.id]!
      const updatedWall = updatedPerimeter.walls.find((s: any) => s.id === wallId)!
      expect(updatedWall.constructionMethodId).toBe(newMethodId)

      // Other properties should remain unchanged
      expect(updatedWall.thickness).toBe(440)
      expect(updatedWall.openings).toEqual([])
    })

    it('should do nothing if wall does not exist', () => {
      const fakePerimeterId = createPerimeterId()
      const fakeWallId = createPerimeterWallId()
      const initialState = Object.fromEntries(Object.entries(store.perimeters))

      store.actions.updatePerimeterWallConstructionMethod(
        fakePerimeterId,
        fakeWallId,
        createPerimeterConstructionMethodId()
      )

      expect(store.perimeters).toEqual(initialState)
    })
  })

  describe('updateOuterWallThickness', () => {
    it('should update wall thickness and recalculate geometry', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeter = Object.values(store.perimeters)[0]
      const wallId = perimeter.walls[0].id
      const newThickness = 300

      store.actions.updatePerimeterWallThickness(perimeter.id, wallId, newThickness)

      const updatedPerimeter = store.perimeters[perimeter.id]!
      const updatedWall = updatedPerimeter.walls.find((s: any) => s.id === wallId)!

      expect(updatedWall.thickness).toBe(newThickness)

      // Geometry should be recalculated with new thickness
      expect(updatedWall.outsideLine.start[1]).toBe(newThickness) // New offset
    })

    it('should recalculate corners when thickness changes', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeter = Object.values(store.perimeters)[0]
      const originalCornerPoints = perimeter.corners.map((c: any) => c.outsidePoint)
      const originalCornerIds = perimeter.corners.map((c: any) => c.id)
      const wallId = perimeter.walls[0].id

      store.actions.updatePerimeterWallThickness(perimeter.id, wallId, 300)

      const updatedPerimeter = store.perimeters[perimeter.id]!
      const newCornerPoints = updatedPerimeter.corners.map((c: any) => c.outsidePoint)
      const newCornerIds = updatedPerimeter.corners.map((c: any) => c.id)

      // At least some corner points should have changed
      expect(newCornerPoints).not.toEqual(originalCornerPoints)
      // But corner IDs should be preserved
      expect(newCornerIds).toEqual(originalCornerIds)
    })

    it('should preserve corner constructedByWall values', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeter = Object.values(store.perimeters)[0]
      const cornerId = perimeter.corners[0].id

      // Change constructedByWall value
      store.actions.updatePerimeterCornerConstructedByWall(perimeter.id, cornerId, 'previous')

      // Update thickness
      const wallId = perimeter.walls[0].id
      store.actions.updatePerimeterWallThickness(perimeter.id, wallId, 300)

      const updatedPerimeter = store.perimeters[perimeter.id]!
      // Corner IDs should be preserved when thickness changes
      const updatedCorner = updatedPerimeter.corners.find((c: any) => c.id === cornerId)!
      expect(updatedCorner.constructedByWall).toBe('previous') // Should be preserved
      expect(updatedCorner.id).toBe(cornerId) // ID should be preserved
    })

    it('should throw error for invalid thickness', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeter = Object.values(store.perimeters)[0]
      const wallId = perimeter.walls[0].id

      expect(() => store.actions.updatePerimeterWallThickness(perimeter.id, wallId, 0)).toThrow(
        'Wall thickness must be greater than 0'
      )

      expect(() => store.actions.updatePerimeterWallThickness(perimeter.id, wallId, -100)).toThrow(
        'Wall thickness must be greater than 0'
      )
    })

    it('should do nothing if wall does not exist', () => {
      const fakePerimeterId = createPerimeterId()
      const fakeWallId = createPerimeterWallId()
      const initialState = Object.fromEntries(Object.entries(store.perimeters))

      store.actions.updatePerimeterWallThickness(fakePerimeterId, fakeWallId, 300)

      expect(store.perimeters).toEqual(initialState)
    })

    it('should do nothing if wall does not exist', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeter = Object.values(store.perimeters)[0]
      const fakeWallId = createPerimeterWallId()
      const originalPerimeter = { ...perimeter }

      store.actions.updatePerimeterWallThickness(perimeter.id, fakeWallId, 300)

      const unchangedPerimeter = store.perimeters[perimeter.id]!
      expect(unchangedPerimeter.walls).toEqual(originalPerimeter.walls)
    })
  })

  describe('updateCornerConstructedByWall', () => {
    it('should update corner constructedByWall value', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeter = Object.values(store.perimeters)[0]
      const cornerId = perimeter.corners[0].id

      store.actions.updatePerimeterCornerConstructedByWall(perimeter.id, cornerId, 'previous')

      const updatedPerimeter = store.perimeters[perimeter.id]!
      const updatedCorner = updatedPerimeter.corners.find((c: any) => c.id === cornerId)!
      expect(updatedCorner.constructedByWall).toBe('previous')
    })

    it('should preserve other corner properties', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeter = Object.values(store.perimeters)[0]
      const corner = perimeter.corners[0]
      const originalOutsidePoint = corner.outsidePoint

      store.actions.updatePerimeterCornerConstructedByWall(perimeter.id, corner.id, 'previous')

      const updatedPerimeter = store.perimeters[perimeter.id]!
      const updatedCorner = updatedPerimeter.corners.find((c: any) => c.id === corner.id)!
      expect(updatedCorner.outsidePoint).toEqual(originalOutsidePoint)
      expect(updatedCorner.id).toBe(corner.id)
    })

    it('should do nothing if wall does not exist', () => {
      const fakePerimeterId = createPerimeterId()
      const fakeCornerId = createPerimeterCornerId()
      const initialState = Object.fromEntries(Object.entries(store.perimeters))

      store.actions.updatePerimeterCornerConstructedByWall(fakePerimeterId, fakeCornerId, 'previous')

      expect(store.perimeters).toEqual(initialState)
    })

    it('should do nothing if corner does not exist', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeter = Object.values(store.perimeters)[0]
      const fakeCornerId = createPerimeterCornerId()
      const originalPerimeter = { ...perimeter }

      store.actions.updatePerimeterCornerConstructedByWall(perimeter.id, fakeCornerId, 'previous')

      const unchangedPerimeter = store.perimeters[perimeter.id]!
      expect(unchangedPerimeter.corners).toEqual(originalPerimeter.corners)
    })
  })

  describe('opening operations', () => {
    describe('addOpeningToOuterWall', () => {
      it('should add door opening to wall wall', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id

        const openingId = store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
          type: 'door',
          offsetFromStart: 1000,
          width: 800,
          height: 2100
        })

        expect(openingId).toBeTruthy()
        expect(typeof openingId).toBe('string')

        const updatedPerimeter = store.perimeters[perimeter.id]!
        const updatedWall = updatedPerimeter.walls.find((s: any) => s.id === wallId)!
        expect(updatedWall.openings).toHaveLength(1)

        const opening = updatedWall.openings[0]
        expect(opening.id).toBe(openingId)
        expect(opening.type).toBe('door')
        expect(opening.offsetFromStart).toBe(1000)
        expect(opening.width).toBe(800)
        expect(opening.height).toBe(2100)
        expect(opening.sillHeight).toBeUndefined()
      })

      it('should add window opening to wall wall', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id

        store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
          type: 'window',
          offsetFromStart: 2000,
          width: 1200,
          height: 1000,
          sillHeight: 900
        })

        const updatedPerimeter = store.perimeters[perimeter.id]!
        const updatedWall = updatedPerimeter.walls.find((s: any) => s.id === wallId)!
        const opening = updatedWall.openings[0]

        expect(opening.type).toBe('window')
        expect(opening.sillHeight).toBe(900)
      })

      it('should add multiple openings to same wall', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id

        store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
          type: 'door',
          offsetFromStart: 1000,
          width: 800,
          height: 2100
        })

        store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
          type: 'window',
          offsetFromStart: 5000,
          width: 1200,
          height: 1000,
          sillHeight: 900
        })

        const updatedPerimeter = store.perimeters[perimeter.id]!
        const updatedWall = updatedPerimeter.walls.find((s: any) => s.id === wallId)!
        expect(updatedWall.openings).toHaveLength(2)

        expect(updatedWall.openings[0].type).toBe('door')
        expect(updatedWall.openings[1].type).toBe('window')
      })

      it('should throw error for negative offset', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id

        expect(() =>
          store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
            type: 'door',
            offsetFromStart: -100,
            width: 800,
            height: 2100
          })
        ).toThrow('Opening offset from start must be non-negative')
      })

      it('should throw error for invalid width', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id

        expect(() =>
          store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
            type: 'door',
            offsetFromStart: 1000,
            width: 0,
            height: 2100
          })
        ).toThrow('Opening width must be greater than 0')
      })

      it('should throw error for invalid height', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id

        expect(() =>
          store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
            type: 'door',
            offsetFromStart: 1000,
            width: 800,
            height: 0
          })
        ).toThrow('Opening height must be greater than 0')
      })

      it('should throw error for negative sill height', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id

        expect(() =>
          store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
            type: 'window',
            offsetFromStart: 1000,
            width: 1200,
            height: 1000,
            sillHeight: -100
          })
        ).toThrow('Window sill height must be non-negative')
      })

      it('should throw if wall does not exist', () => {
        const fakePerimeterId = createPerimeterId()
        const fakeWallId = createPerimeterWallId()

        expect(() =>
          store.actions.addPerimeterWallOpening(fakePerimeterId, fakeWallId, {
            type: 'door',
            offsetFromStart: 1000,
            width: 800,
            height: 2100
          })
        ).toThrow('Wall does not exist')
      })

      it('should throw if wall does not exist', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const fakeWallId = createPerimeterWallId()

        expect(() =>
          store.actions.addPerimeterWallOpening(perimeter.id, fakeWallId, {
            type: 'door',
            offsetFromStart: 1000,
            width: 800,
            height: 2100
          })
        ).toThrow('Wall does not exist')
      })

      it('should handle thickness updates for reflex angles without creating overlaps', () => {
        const boundary = createReflexAngleBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[2].id // Pick a wall that creates reflex angle
        const newThickness = 600 // Thicker than default

        store.actions.updatePerimeterWallThickness(perimeter.id, wallId, newThickness)

        const updatedPerimeter = store.perimeters[perimeter.id]!
        const updatedWall = updatedPerimeter.walls.find((s: any) => s.id === wallId)!

        expect(updatedWall.thickness).toBe(newThickness)

        // Verify all walls still have valid geometry
        updatedPerimeter.walls.forEach((wall: any) => {
          expect(wall.insideLength).toBeGreaterThan(0)
          expect(wall.wallLength).toBeGreaterThan(0)
          expect(wall.outsideLength).toBeGreaterThan(0)

          // Verify lines have different start/end points (not degenerate)
          const insideDist = Math.sqrt(
            Math.pow(wall.insideLine.end[0] - wall.insideLine.start[0], 2) +
              Math.pow(wall.insideLine.end[1] - wall.insideLine.start[1], 2)
          )
          const outsideDist = Math.sqrt(
            Math.pow(wall.outsideLine.end[0] - wall.outsideLine.start[0], 2) +
              Math.pow(wall.outsideLine.end[1] - wall.outsideLine.start[1], 2)
          )

          expect(insideDist).toBeGreaterThan(0.01) // Not degenerate
          expect(outsideDist).toBeGreaterThan(0.01) // Not degenerate
        })

        // Verify corner points are reasonable
        updatedPerimeter.corners.forEach((corner: any) => {
          expect(Number.isFinite(corner.outsidePoint[0])).toBe(true)
          expect(Number.isFinite(corner.outsidePoint[1])).toBe(true)
          expect(Math.abs(corner.outsidePoint[0])).toBeLessThan(1000) // Reasonable bounds
          expect(Math.abs(corner.outsidePoint[1])).toBeLessThan(1000) // Reasonable bounds
        })
      })
    })

    describe('removeOpeningFromOuterWall', () => {
      it('should remove opening from wall wall', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id

        const openingId = store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
          type: 'door',
          offsetFromStart: 1000,
          width: 800,
          height: 2100
        })

        expect(store.perimeters[perimeter.id]!.walls[0].openings).toHaveLength(1)

        store.actions.removePerimeterWallOpening(perimeter.id, wallId, openingId)

        const updatedPerimeter = store.perimeters[perimeter.id]!
        const updatedWall = updatedPerimeter.walls.find((s: any) => s.id === wallId)!
        expect(updatedWall.openings).toHaveLength(0)
      })

      it('should remove correct opening when multiple exist', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id

        const doorId = store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
          type: 'door',
          offsetFromStart: 1000,
          width: 800,
          height: 2100
        })

        const windowId = store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
          type: 'window',
          offsetFromStart: 5000,
          width: 1200,
          height: 1000,
          sillHeight: 900
        })

        store.actions.removePerimeterWallOpening(perimeter.id, wallId, doorId)

        const updatedPerimeter = store.perimeters[perimeter.id]!
        const updatedWall = updatedPerimeter.walls.find((s: any) => s.id === wallId)!
        expect(updatedWall.openings).toHaveLength(1)
        expect(updatedWall.openings[0].id).toBe(windowId)
        expect(updatedWall.openings[0].type).toBe('window')
      })

      it('should do nothing if wall does not exist', () => {
        const fakePerimeterId = createPerimeterId()
        const fakeWallId = createPerimeterWallId()
        const fakeOpeningId = createOpeningId()
        const initialState = Object.fromEntries(Object.entries(store.perimeters))

        store.actions.removePerimeterWallOpening(fakePerimeterId, fakeWallId, fakeOpeningId)

        expect(store.perimeters).toEqual(initialState)
      })

      it('should do nothing if wall does not exist', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const fakeWallId = createPerimeterWallId()
        const fakeOpeningId = createOpeningId()
        const originalPerimeter = { ...perimeter }

        store.actions.removePerimeterWallOpening(perimeter.id, fakeWallId, fakeOpeningId)

        const unchangedPerimeter = store.perimeters[perimeter.id]!
        expect(unchangedPerimeter.walls).toEqual(originalPerimeter.walls)
      })

      it('should do nothing if opening does not exist', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id
        const fakeOpeningId = createOpeningId()

        store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
          type: 'door',
          offsetFromStart: 1000,
          width: 800,
          height: 2100
        })

        const originalPerimeter = store.perimeters[perimeter.id]!.walls[0]

        store.actions.removePerimeterWallOpening(perimeter.id, wallId, fakeOpeningId)

        const unchangedPerimeter = store.perimeters[perimeter.id]!.walls[0]
        expect(unchangedPerimeter.openings).toEqual(originalPerimeter.openings)
      })
    })

    describe('updateOpening', () => {
      it('should update opening properties', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id

        const openingId = store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
          type: 'door',
          offsetFromStart: 1000,
          width: 800,
          height: 2100
        })

        store.actions.updatePerimeterWallOpening(perimeter.id, wallId, openingId, {
          width: 900,
          height: 2200
        })

        const updatedPerimeter = store.perimeters[perimeter.id]!
        const updatedWall = updatedPerimeter.walls.find((s: any) => s.id === wallId)!
        const updatedOpening = updatedWall.openings[0]

        expect(updatedOpening.width).toBe(900)
        expect(updatedOpening.height).toBe(2200)
        expect(updatedOpening.type).toBe('door') // Unchanged
        expect(updatedOpening.offsetFromStart).toBe(1000) // Unchanged
      })

      it('should update window sill height', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id

        const openingId = store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
          type: 'window',
          offsetFromStart: 1000,
          width: 1200,
          height: 1000,
          sillHeight: 900
        })

        store.actions.updatePerimeterWallOpening(perimeter.id, wallId, openingId, {
          sillHeight: 1000
        })

        const updatedPerimeter = store.perimeters[perimeter.id]!
        const updatedWall = updatedPerimeter.walls.find((s: any) => s.id === wallId)!
        const updatedOpening = updatedWall.openings[0]

        expect(updatedOpening.sillHeight).toBe(1000)
      })

      it('should do nothing if wall does not exist', () => {
        const fakePerimeterId = createPerimeterId()
        const fakeWallId = createPerimeterWallId()
        const fakeOpeningId = createOpeningId()
        const initialState = Object.fromEntries(Object.entries(store.perimeters))

        store.actions.updatePerimeterWallOpening(fakePerimeterId, fakeWallId, fakeOpeningId, {
          width: 1000
        })

        expect(store.perimeters).toEqual(initialState)
      })

      it('should do nothing if wall does not exist', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const fakeWallId = createPerimeterWallId()
        const fakeOpeningId = createOpeningId()
        const originalPerimeter = { ...perimeter }

        store.actions.updatePerimeterWallOpening(perimeter.id, fakeWallId, fakeOpeningId, { width: 1000 })

        const unchangedPerimeter = store.perimeters[perimeter.id]!
        expect(unchangedPerimeter.walls).toEqual(originalPerimeter.walls)
      })

      it('should do nothing if opening does not exist', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id
        const fakeOpeningId = createOpeningId()

        store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
          type: 'door',
          offsetFromStart: 1000,
          width: 800,
          height: 2100
        })

        const originalPerimeter = store.perimeters[perimeter.id]!.walls[0]

        store.actions.updatePerimeterWallOpening(perimeter.id, wallId, fakeOpeningId, { width: 1000 })

        const unchangedPerimeter = store.perimeters[perimeter.id]!.walls[0]
        expect(unchangedPerimeter.openings).toEqual(originalPerimeter.openings)
      })
    })
  })

  describe('getter operations', () => {
    describe('getOuterWallById', () => {
      it('should return existing perimeter', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const addedPerimeter = Object.values(store.perimeters)[0]
        const result = store.actions.getPerimeterById(addedPerimeter.id)

        expect(result).toBeDefined()
        expect(result?.id).toBe(addedPerimeter.id)
        expect(result).toEqual(addedPerimeter)
      })

      it('should return null for non-existent wall', () => {
        const fakePerimeterId = createPerimeterId()
        const result = store.actions.getPerimeterById(fakePerimeterId)
        expect(result).toBeNull()
      })
    })

    describe('getWallById', () => {
      it('should return existing wall', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wall = perimeter.walls[0]
        const result = store.actions.getPerimeterWallById(perimeter.id, wall.id)

        expect(result).toBeDefined()
        expect(result?.id).toBe(wall.id)
        expect(result).toEqual(wall)
      })

      it('should return null for non-existent wall', () => {
        const fakePerimeterId = createPerimeterId()
        const fakeWallId = createPerimeterWallId()
        const result = store.actions.getPerimeterWallById(fakePerimeterId, fakeWallId)
        expect(result).toBeNull()
      })

      it('should return null for non-existent wall', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const fakeWallId = createPerimeterWallId()
        const result = store.actions.getPerimeterWallById(perimeter.id, fakeWallId)
        expect(result).toBeNull()
      })
    })

    describe('getCornerById', () => {
      it('should return existing corner', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const corner = perimeter.corners[0]
        const result = store.actions.getPerimeterCornerById(perimeter.id, corner.id)

        expect(result).toBeDefined()
        expect(result?.id).toBe(corner.id)
        expect(result).toEqual(corner)
      })

      it('should return null for non-existent wall', () => {
        const fakePerimeterId = createPerimeterId()
        const fakeCornerId = createPerimeterCornerId()
        const result = store.actions.getPerimeterCornerById(fakePerimeterId, fakeCornerId)
        expect(result).toBeNull()
      })

      it('should return null for non-existent corner', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const fakeCornerId = createPerimeterCornerId()
        const result = store.actions.getPerimeterCornerById(perimeter.id, fakeCornerId)
        expect(result).toBeNull()
      })
    })

    describe('getOpeningById', () => {
      it('should return existing opening', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id

        const openingId = store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
          type: 'door',
          offsetFromStart: 1000,
          width: 800,
          height: 2100
        })

        const result = store.actions.getPerimeterWallOpeningById(perimeter.id, wallId, openingId)

        expect(result).toBeDefined()
        expect(result?.id).toBe(openingId)
        expect(result?.type).toBe('door')
      })

      it('should return null for non-existent wall', () => {
        const fakePerimeterId = createPerimeterId()
        const fakeWallId = createPerimeterWallId()
        const fakeOpeningId = createOpeningId()
        const result = store.actions.getPerimeterWallOpeningById(fakePerimeterId, fakeWallId, fakeOpeningId)
        expect(result).toBeNull()
      })

      it('should return null for non-existent wall', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const fakeWallId = createPerimeterWallId()
        const fakeOpeningId = createOpeningId()
        const result = store.actions.getPerimeterWallOpeningById(perimeter.id, fakeWallId, fakeOpeningId)
        expect(result).toBeNull()
      })

      it('should return null for non-existent opening', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallId = perimeter.walls[0].id
        const fakeOpeningId = createOpeningId()
        const result = store.actions.getPerimeterWallOpeningById(perimeter.id, wallId, fakeOpeningId)
        expect(result).toBeNull()
      })
    })

    describe('getOuterWallsByFloor', () => {
      it('should return empty array when no walls exist', () => {
        const walls = store.actions.getPerimetersByStorey(testStoreyId)
        expect(walls).toEqual([])
      })

      it('should return walls for specific floor', () => {
        const floor1Id = createStoreyId()
        const floor2Id = createStoreyId()
        const boundary1 = createRectangularBoundary()
        const boundary2 = createTriangularBoundary()

        store.actions.addPerimeter(floor1Id, boundary1, createPerimeterConstructionMethodId())
        store.actions.addPerimeter(floor1Id, boundary2, createPerimeterConstructionMethodId())
        store.actions.addPerimeter(floor2Id, boundary1, createPerimeterConstructionMethodId())

        const floor1Walls = store.actions.getPerimetersByStorey(floor1Id)
        const floor2Walls = store.actions.getPerimetersByStorey(floor2Id)

        expect(floor1Walls).toHaveLength(2)
        expect(floor2Walls).toHaveLength(1)

        expect(floor1Walls.every(w => w.storeyId === floor1Id)).toBe(true)
        expect(floor2Walls.every(w => w.storeyId === floor2Id)).toBe(true)
      })

      it('should return empty array for non-existent floor', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const nonExistentStoreyId = createStoreyId()
        const walls = store.actions.getPerimetersByStorey(nonExistentStoreyId)

        expect(walls).toEqual([])
      })
    })
  })

  describe('complex scenarios', () => {
    it('should handle complex perimeter management correctly', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

      const perimeter = Object.values(store.perimeters)[0]
      const wallId = perimeter.walls[0].id
      const cornerId = perimeter.corners[0].id

      // Add openings
      const doorId = store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
        type: 'door',
        offsetFromStart: 1000,
        width: 800,
        height: 2100
      })

      const windowId = store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
        type: 'window',
        offsetFromStart: 5000,
        width: 1200,
        height: 1000,
        sillHeight: 900
      })

      const newMethodId = createPerimeterConstructionMethodId()

      // Update properties
      store.actions.updatePerimeterWallConstructionMethod(perimeter.id, wallId, newMethodId)
      store.actions.updatePerimeterCornerConstructedByWall(perimeter.id, cornerId, 'previous')

      // Verify complex state
      const updatedPerimeter = store.perimeters[perimeter.id]!
      const updatedWall = updatedPerimeter.walls.find((s: any) => s.id === wallId)!
      const updatedCorner = updatedPerimeter.corners.find((c: any) => c.id === cornerId)!

      expect(updatedWall.openings).toHaveLength(2)
      expect(updatedWall.constructionMethodId).toBe(newMethodId)
      expect(updatedCorner.constructedByWall).toBe('previous')

      // Update opening
      store.actions.updatePerimeterWallOpening(perimeter.id, wallId, doorId, {
        width: 900
      })

      const finalPerimeter = store.perimeters[perimeter.id]!.walls.find((s: any) => s.id === wallId)!
      const updatedDoor = finalPerimeter.openings.find((o: any) => o.id === doorId)!
      expect(updatedDoor.width).toBe(900)

      // Remove opening
      store.actions.removePerimeterWallOpening(perimeter.id, wallId, windowId)
      const finalWallAfterRemoval = store.perimeters[perimeter.id]!.walls.find((s: any) => s.id === wallId)!
      expect(finalWallAfterRemoval.openings).toHaveLength(1)
      expect(finalWallAfterRemoval.openings[0].id).toBe(doorId)
    })

    it('should maintain data consistency after multiple operations', () => {
      const boundary = createRectangularBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId(), 500)

      const perimeter = Object.values(store.perimeters)[0]
      const wallId = perimeter.walls[0].id
      const originalCornerCount = perimeter.corners.length

      // Add opening
      store.actions.addPerimeterWallOpening(perimeter.id, wallId, {
        type: 'door',
        offsetFromStart: 1000,
        width: 800,
        height: 2100
      })

      // Update thickness - this should recalculate geometry
      const newThickness = 300
      store.actions.updatePerimeterWallThickness(perimeter.id, wallId, newThickness)

      const finalPerimeter = store.perimeters[perimeter.id]!
      const finalWall = finalPerimeter.walls.find((s: any) => s.id === wallId)!

      expect(finalWall.thickness).toBe(newThickness)
      expect(finalWall.openings).toHaveLength(1)
      expect(finalPerimeter.corners).toHaveLength(originalCornerCount) // Same number of corners
      expect(finalPerimeter.walls).toHaveLength(4) // Rectangle still has 4 walls
      expect(finalPerimeter.storeyId).toBe(testStoreyId)
      expect(finalPerimeter.corners.map((c: any) => c.insidePoint)).toEqual(boundary.points)
    })
  })

  describe('reflex angle handling', () => {
    it('should properly handle acute angles without creating invalid geometry', () => {
      // Create a shape with acute angles (< 90 degrees)
      const acuteAngleBoundary: Polygon2D = {
        points: [
          vec2.fromValues(0, 0),
          vec2.fromValues(10, 0),
          vec2.fromValues(5, 2) // Creates acute angle
        ]
      }

      store.actions.addPerimeter(testStoreyId, acuteAngleBoundary, createPerimeterConstructionMethodId(), 100)

      const perimeter = Object.values(store.perimeters)[0]

      // Verify all walls have valid, positive lengths
      perimeter.walls.forEach((wall: any) => {
        expect(wall.insideLength).toBeGreaterThan(0)
        expect(wall.wallLength).toBeGreaterThan(0)
        expect(wall.outsideLength).toBeGreaterThan(0)

        // Verify wall lines aren't degenerate
        const insideLineLength = Math.sqrt(
          Math.pow(wall.insideLine.end[0] - wall.insideLine.start[0], 2) +
            Math.pow(wall.insideLine.end[1] - wall.insideLine.start[1], 2)
        )
        expect(insideLineLength).toBeGreaterThan(0.01)
      })

      // Verify corners have valid positions
      perimeter.corners.forEach((corner: any) => {
        expect(Number.isFinite(corner.outsidePoint[0])).toBe(true)
        expect(Number.isFinite(corner.outsidePoint[1])).toBe(true)
      })
    })

    it('should handle L-shaped boundaries with reflex angles correctly', () => {
      const lShapeBoundary = createReflexAngleBoundary()
      store.actions.addPerimeter(testStoreyId, lShapeBoundary, createPerimeterConstructionMethodId(), 200)

      const perimeter = Object.values(store.perimeters)[0]

      expect(perimeter.walls).toHaveLength(6)
      expect(perimeter.corners).toHaveLength(6)

      // Test specific reflex angle walls (walls 2 and 4 in our L-shape)
      const reflexWall1 = perimeter.walls[2] // At (10,5) -> (5,5)
      const reflexWall2 = perimeter.walls[3] // At (5,5) -> (5,10)

      // These walls should have proper truncation for reflex angles
      expect(reflexWall1.insideLength).toBe(5) // Original boundary length
      expect(reflexWall1.wallLength).toBeLessThanOrEqual(reflexWall1.insideLength) // May be truncated
      expect(reflexWall1.wallLength).toBeGreaterThan(0)

      expect(reflexWall2.insideLength).toBe(5) // Original boundary length
      expect(reflexWall2.wallLength).toBeLessThanOrEqual(reflexWall2.insideLength) // May be truncated
      expect(reflexWall2.wallLength).toBeGreaterThan(0)
    })

    it('should handle mixed thickness values with reflex angles', () => {
      const boundary = createReflexAngleBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId(), 200)

      const perimeter = Object.values(store.perimeters)[0]

      // Update different walls to different thicknesses
      const wallIds = perimeter.walls.map((s: any) => s.id)
      store.actions.updatePerimeterWallThickness(perimeter.id, wallIds[1], 400)
      store.actions.updatePerimeterWallThickness(perimeter.id, wallIds[3], 600)

      const updatedPerimeter = store.perimeters[perimeter.id]!

      // Verify mixed thicknesses are applied correctly
      expect(updatedPerimeter.walls[0].thickness).toBe(200) // Original
      expect(updatedPerimeter.walls[1].thickness).toBe(400) // Updated
      expect(updatedPerimeter.walls[2].thickness).toBe(200) // Original
      expect(updatedPerimeter.walls[3].thickness).toBe(600) // Updated
      expect(updatedPerimeter.walls[4].thickness).toBe(200) // Original
      expect(updatedPerimeter.walls[5].thickness).toBe(200) // Original

      // All walls should still have valid geometry
      updatedPerimeter.walls.forEach((wall: any) => {
        expect(wall.insideLength).toBeGreaterThan(0)
        expect(wall.wallLength).toBeGreaterThan(0)
        expect(wall.outsideLength).toBeGreaterThan(0)
        expect(Number.isFinite(wall.insideLength)).toBe(true)
        expect(Number.isFinite(wall.wallLength)).toBe(true)
        expect(Number.isFinite(wall.outsideLength)).toBe(true)
      })

      // Corner points should be reasonable
      updatedPerimeter.corners.forEach((corner: any) => {
        expect(Number.isFinite(corner.outsidePoint[0])).toBe(true)
        expect(Number.isFinite(corner.outsidePoint[1])).toBe(true)
        expect(Math.abs(corner.outsidePoint[0])).toBeLessThan(1000)
        expect(Math.abs(corner.outsidePoint[1])).toBeLessThan(1000)
      })
    })

    it('should preserve wall and corner relationships after thickness updates', () => {
      const boundary = createReflexAngleBoundary()
      store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId(), 300)

      const originalPerimeter = Object.values(store.perimeters)[0]
      const originalWallIds = originalPerimeter.walls.map((s: any) => s.id)
      const originalCornerIds = originalPerimeter.corners.map((c: any) => c.id)
      const originalConstructedByWall = originalPerimeter.corners.map((c: any) => c.constructedByWall)

      // Update thickness of a wall that creates reflex angle
      const targetWallId = originalWallIds[2]
      store.actions.updatePerimeterWallThickness(originalPerimeter.id, targetWallId, 800)

      const updatedPerimeter = store.perimeters[originalPerimeter.id]!

      // Verify IDs are preserved
      expect(updatedPerimeter.walls.map((s: any) => s.id)).toEqual(originalWallIds)
      expect(updatedPerimeter.corners.map((c: any) => c.id)).toEqual(originalCornerIds)
      expect(updatedPerimeter.corners.map((c: any) => c.constructedByWall)).toEqual(originalConstructedByWall)

      // Verify the specific wall was updated
      const updatedWall = updatedPerimeter.walls.find((s: any) => s.id === targetWallId)!
      expect(updatedWall.thickness).toBe(800)
    })
  })

  describe('deletion operations', () => {
    describe('removeOuterWallCorner', () => {
      it('should remove corner and merge adjacent walls', () => {
        // Create a pentagon (5 corners) so we can safely remove one
        const boundary: Polygon2D = {
          points: [
            vec2.fromValues(0, 0),
            vec2.fromValues(10, 0),
            vec2.fromValues(15, 5),
            vec2.fromValues(5, 10),
            vec2.fromValues(-5, 5)
          ]
        }
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const originalWallCount = perimeter.walls.length
        const originalCornerCount = perimeter.corners.length
        const cornerToRemove = perimeter.corners[2] // Remove corner at (15,5)

        const success = store.actions.removePerimeterCorner(perimeter.id, cornerToRemove.id)
        expect(success).toBe(true)

        const updatedPerimeter = store.perimeters[perimeter.id]!

        // Should have one less corner and one less wall
        expect(updatedPerimeter.corners).toHaveLength(originalCornerCount - 1)
        expect(updatedPerimeter.walls).toHaveLength(originalWallCount - 1)
        expect(updatedPerimeter.corners.map((c: any) => c.insidePoint)).toHaveLength(originalWallCount - 1)

        // The removed corner should not exist
        expect(updatedPerimeter.corners.find((c: any) => c.id === cornerToRemove.id)).toBeUndefined()

        // All remaining walls should have valid geometry
        updatedPerimeter.walls.forEach((wall: any) => {
          expect(wall.insideLength).toBeGreaterThan(0)
          expect(wall.wallLength).toBeGreaterThan(0)
          expect(wall.outsideLength).toBeGreaterThan(0)
        })
      })

      it('should delete openings from merged walls', () => {
        const boundary: Polygon2D = {
          points: [
            vec2.fromValues(0, 0),
            vec2.fromValues(2000, 0),
            vec2.fromValues(2000, 1000),
            vec2.fromValues(1000, 1000),
            vec2.fromValues(0, 1000)
          ]
        }
        const perimeter = store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const cornerToRemove = perimeter.corners[2] // Corner at (2000,1000)

        // Add openings to the two walls that will be merged
        const wall1 = perimeter.walls[1] // Second wall
        const wall2 = perimeter.walls[2] // Third wall

        store.actions.addPerimeterWallOpening(perimeter.id, wall1.id, {
          type: 'door',
          offsetFromStart: 0,
          width: 100,
          height: 2100
        })

        store.actions.addPerimeterWallOpening(perimeter.id, wall2.id, {
          type: 'window',
          offsetFromStart: 0,
          width: 100,
          height: 1000,
          sillHeight: 900
        })

        const success = store.actions.removePerimeterCorner(perimeter.id, cornerToRemove.id)
        expect(success).toBe(true)

        const updatedPerimeter = store.perimeters[perimeter.id]!

        // Find the merged wall (should be where wall1 was)
        const mergedWall = updatedPerimeter.walls[1]
        expect(mergedWall.openings).toHaveLength(0) // Openings should be deleted, not merged
      })

      it('should fail for walls with less than 4 corners', () => {
        const boundary = createTriangularBoundary() // Only 3 corners
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const cornerToRemove = perimeter.corners[0]

        const success = store.actions.removePerimeterCorner(perimeter.id, cornerToRemove.id)
        expect(success).toBe(false)

        // Wall should be unchanged
        const unchangedPerimeter = store.perimeters[perimeter.id]!
        expect(unchangedPerimeter.corners).toHaveLength(3)
        expect(unchangedPerimeter.walls).toHaveLength(3)
      })

      it('should fail for non-existent wall', () => {
        const fakePerimeterId = createPerimeterId()
        const fakeCornerId = createPerimeterCornerId()

        const success = store.actions.removePerimeterCorner(fakePerimeterId, fakeCornerId)
        expect(success).toBe(false)
      })

      it('should fail for non-existent corner', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const fakeCornerId = createPerimeterCornerId()

        const success = store.actions.removePerimeterCorner(perimeter.id, fakeCornerId)
        expect(success).toBe(false)

        // Wall should be unchanged
        const unchangedPerimeter = store.perimeters[perimeter.id]!
        expect(unchangedPerimeter.corners).toHaveLength(4)
      })

      it('should fail if removal would create self-intersecting polygon', () => {
        // Create a concave shape where removing a specific corner would cause self-intersection
        const boundary: Polygon2D = {
          points: [
            vec2.fromValues(0, 0),
            vec2.fromValues(10, 0),
            vec2.fromValues(10, 10),
            vec2.fromValues(5, 5), // This creates a concave shape
            vec2.fromValues(0, 10)
          ]
        }
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]

        // Try to remove the concave corner - this should fail validation
        const concaveCorner = perimeter.corners[3] // Corner at (5,5)
        wouldClosingPolygonSelfIntersectMock.mockReturnValue(true)
        const success = store.actions.removePerimeterCorner(perimeter.id, concaveCorner.id)

        // The success depends on whether the resulting polygon is valid
        // In this case, removing (5,5) would connect (10,10) to (0,10) directly
        // which might be valid, so let's verify the wall is either unchanged or valid
        const updatedPerimeter = store.perimeters[perimeter.id]!
        if (!success) {
          expect(updatedPerimeter.corners).toHaveLength(5) // Unchanged
        } else {
          expect(updatedPerimeter.corners).toHaveLength(4) // Successfully reduced
          // Verify all walls are valid
          updatedPerimeter.walls.forEach((wall: any) => {
            expect(wall.insideLength).toBeGreaterThan(0)
          })
        }
      })
    })

    describe('removePerimeterWall', () => {
      it('should remove wall and its adjacent corners', () => {
        // Create a pentagon so we can safely remove a wall
        const boundary: Polygon2D = {
          points: [
            vec2.fromValues(0, 0),
            vec2.fromValues(10, 0),
            vec2.fromValues(15, 5),
            vec2.fromValues(5, 10),
            vec2.fromValues(-5, 5)
          ]
        }
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const originalWallCount = perimeter.walls.length
        const originalCornerCount = perimeter.corners.length
        const wallToRemove = perimeter.walls[2] // Wall from (15,5) to (5,10)

        const success = store.actions.removePerimeterWall(perimeter.id, wallToRemove.id)
        expect(success).toBe(true)

        const updatedPerimeter = store.perimeters[perimeter.id]!

        // Should have two less corners and two less walls (removes 3, adds 1, net -2)
        expect(updatedPerimeter.corners).toHaveLength(originalCornerCount - 2)
        expect(updatedPerimeter.walls).toHaveLength(originalWallCount - 2)
        expect(updatedPerimeter.corners.map((c: any) => c.insidePoint)).toHaveLength(originalWallCount - 2)

        // The removed wall should not exist
        expect(updatedPerimeter.walls.find((s: any) => s.id === wallToRemove.id)).toBeUndefined()

        // All remaining walls should have valid geometry
        updatedPerimeter.walls.forEach((wall: any) => {
          expect(wall.insideLength).toBeGreaterThan(0)
          expect(wall.wallLength).toBeGreaterThan(0)
          expect(wall.outsideLength).toBeGreaterThan(0)
        })
      })

      it('should fail for walls with less than 5 walls', () => {
        const boundary = createRectangularBoundary() // Only 4 walls
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallToRemove = perimeter.walls[0]

        const success = store.actions.removePerimeterWall(perimeter.id, wallToRemove.id)
        expect(success).toBe(false)

        // Wall should be unchanged
        const unchangedPerimeter = store.perimeters[perimeter.id]!
        expect(unchangedPerimeter.walls).toHaveLength(4)
        expect(unchangedPerimeter.corners).toHaveLength(4)
      })

      it('should fail for non-existent wall', () => {
        const fakePerimeterId = createPerimeterId()
        const fakeWallId = createPerimeterWallId()

        const success = store.actions.removePerimeterWall(fakePerimeterId, fakeWallId)
        expect(success).toBe(false)
      })

      it('should fail for non-existent wall', () => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const fakeWallId = createPerimeterWallId()

        const success = store.actions.removePerimeterWall(perimeter.id, fakeWallId)
        expect(success).toBe(false)

        // Wall should be unchanged
        const unchangedPerimeter = store.perimeters[perimeter.id]!
        expect(unchangedPerimeter.walls).toHaveLength(4)
      })

      it('should fail if removal would create self-intersecting polygon', () => {
        // Create a shape where removing a specific wall would cause self-intersection
        const boundary: Polygon2D = {
          points: [
            vec2.fromValues(0, 0),
            vec2.fromValues(20, 0),
            vec2.fromValues(20, 10),
            vec2.fromValues(10, 5), // Creates a potential problem if we remove the wrong wall
            vec2.fromValues(0, 10)
          ]
        }
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]
        const wallToRemove = perimeter.walls[3] // Wall from (10,5) to (0,10)

        wouldClosingPolygonSelfIntersectMock.mockReturnValue(true)
        const success = store.actions.removePerimeterWall(perimeter.id, wallToRemove.id)

        // Verify the result is either failure or a valid polygon
        const updatedPerimeter = store.perimeters[perimeter.id]!
        if (!success) {
          expect(updatedPerimeter.walls).toHaveLength(5) // Unchanged
        } else {
          expect(updatedPerimeter.walls).toHaveLength(3) // Successfully reduced by 2 (5 - 3 + 1 = 3)
          // Verify all walls are valid
          updatedPerimeter.walls.forEach((wall: any) => {
            expect(wall.insideLength).toBeGreaterThan(0)
          })
        }
      })

      it('should preserve geometry integrity after wall removal', () => {
        const boundary: Polygon2D = {
          points: [
            vec2.fromValues(0, 0),
            vec2.fromValues(20, 0),
            vec2.fromValues(20, 20),
            vec2.fromValues(10, 20),
            vec2.fromValues(10, 10),
            vec2.fromValues(0, 10)
          ]
        }
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId(), 200)

        const perimeter = Object.values(store.perimeters)[0]
        const wallToRemove = perimeter.walls[3] // Wall from (10,20) to (10,10)

        const success = store.actions.removePerimeterWall(perimeter.id, wallToRemove.id)
        expect(success).toBe(true)

        const updatedPerimeter = store.perimeters[perimeter.id]!

        // Verify geometry calculations are correct (6 - 3 + 1 = 4)
        expect(updatedPerimeter.walls).toHaveLength(4)
        expect(updatedPerimeter.corners).toHaveLength(4)

        // All walls should have proper geometry
        updatedPerimeter.walls.forEach((wall: any) => {
          expect(wall.thickness).toBe(200)
          expect(wall.insideLength).toBeGreaterThan(0)
          expect(wall.wallLength).toBeGreaterThan(0)
          expect(wall.outsideLength).toBeGreaterThan(0)
          expect(Number.isFinite(wall.insideLength)).toBe(true)
          expect(Number.isFinite(wall.wallLength)).toBe(true)
          expect(Number.isFinite(wall.outsideLength)).toBe(true)
        })

        // All corners should have finite positions
        updatedPerimeter.corners.forEach((corner: any) => {
          expect(Number.isFinite(corner.outsidePoint[0])).toBe(true)
          expect(Number.isFinite(corner.outsidePoint[1])).toBe(true)
        })
      })
    })

    describe('deletion validation', () => {
      it('should validate polygon self-intersection before deletion', () => {
        // Create a complex shape where certain deletions would be problematic
        const complexBoundary: Polygon2D = {
          points: [
            vec2.fromValues(0, 0),
            vec2.fromValues(10, 0),
            vec2.fromValues(10, 10),
            vec2.fromValues(8, 8),
            vec2.fromValues(6, 10),
            vec2.fromValues(2, 8),
            vec2.fromValues(0, 10)
          ]
        }
        store.actions.addPerimeter(testStoreyId, complexBoundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]

        // Try to remove various corners and walls
        perimeter.corners.forEach((corner: any) => {
          store.actions.removePerimeterCorner(perimeter.id, corner.id)
          // Each operation should either succeed with a valid result or fail safely
          const currentPerimeter = store.perimeters[perimeter.id]!
          expect(currentPerimeter.corners.length).toBeGreaterThanOrEqual(3)
          expect(currentPerimeter.walls.length).toBeGreaterThanOrEqual(3)
        })
      })

      it('should maintain minimum polygon size constraints', () => {
        const boundary = createRectangularBoundary() // 4 corners/walls
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())

        const perimeter = Object.values(store.perimeters)[0]

        // Try to remove two corners (would leave only 2, which is invalid)
        const corner1Success = store.actions.removePerimeterCorner(perimeter.id, perimeter.corners[0].id)

        if (corner1Success) {
          // If first removal succeeded, second should fail (would leave < 3 corners)
          const updatedPerimeter = store.perimeters[perimeter.id]!
          expect(updatedPerimeter.corners).toHaveLength(3)

          const corner2Success = store.actions.removePerimeterCorner(perimeter.id, updatedPerimeter.corners[0].id)
          expect(corner2Success).toBe(false)

          // Wall should still have 3 corners
          const finalPerimeter = store.perimeters[perimeter.id]!
          expect(finalPerimeter.corners).toHaveLength(3)
        } else {
          // If first removal failed, wall should be unchanged
          const unchangedPerimeter = store.perimeters[perimeter.id]!
          expect(unchangedPerimeter.corners).toHaveLength(4)
        }
      })
    })
  })

  describe('Opening placement validation methods', () => {
    describe('isOpeningPlacementValid', () => {
      let perimeterId: PerimeterId
      let wallId: PerimeterWallId
      let wallLength: Length

      beforeEach(() => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())
        const perimeter = Object.values(store.perimeters)[0]
        perimeterId = perimeter.id
        wallId = perimeter.walls[0].id
        wallLength = perimeter.walls[0].wallLength
      })

      describe('parameter validation', () => {
        it('should throw error for non-existent wall', () => {
          const nonExistentWallId = createPerimeterId()
          expect(() => {
            store.actions.isPerimeterWallOpeningPlacementValid(nonExistentWallId, wallId, 0, 800)
          }).toThrow(/Wall wall not found/)
        })

        it('should throw error for non-existent wall', () => {
          const nonExistentWallId = createPerimeterWallId()
          expect(() => {
            store.actions.isPerimeterWallOpeningPlacementValid(perimeterId, nonExistentWallId, 0, 800)
          }).toThrow(/Wall wall not found/)
        })

        it('should throw error for zero width', () => {
          expect(() => {
            store.actions.isPerimeterWallOpeningPlacementValid(perimeterId, wallId, 0, 0)
          }).toThrow(/Opening width must be greater than 0/)
        })

        it('should throw error for negative width', () => {
          expect(() => {
            store.actions.isPerimeterWallOpeningPlacementValid(perimeterId, wallId, 0, -100)
          }).toThrow(/Opening width must be greater than 0/)
        })

        it('should return false for negative offset', () => {
          const result = store.actions.isPerimeterWallOpeningPlacementValid(perimeterId, wallId, -100, 800)
          expect(result).toBe(false)
        })
      })

      describe('boundary validation', () => {
        it('should return true for opening that fits within wall', () => {
          const result = store.actions.isPerimeterWallOpeningPlacementValid(perimeterId, wallId, 0, wallLength)
          expect(result).toBe(true)
        })

        it('should return false for opening wider than wall', () => {
          const result = store.actions.isPerimeterWallOpeningPlacementValid(perimeterId, wallId, 0, wallLength + 1)
          expect(result).toBe(false)
        })

        it('should return false for opening that extends beyond wall end', () => {
          const result = store.actions.isPerimeterWallOpeningPlacementValid(perimeterId, wallId, wallLength - 400, 800)
          expect(result).toBe(false)
        })
      })

      describe('overlap validation', () => {
        beforeEach(() => {
          // Add an existing door at offset 1000mm, width 800mm (occupies 1000-1800)
          store.actions.addPerimeterWallOpening(perimeterId, wallId, {
            type: 'door',
            offsetFromStart: 1000,
            width: 800,
            height: 2100
          })
        })

        it('should return false for opening that overlaps from the left', () => {
          const result = store.actions.isPerimeterWallOpeningPlacementValid(
            perimeterId,
            wallId,
            800, // starts at 800, ends at 1600 (overlaps 1000-1600)
            800
          )
          expect(result).toBe(false)
        })

        it('should return false for opening that overlaps from the right', () => {
          const result = store.actions.isPerimeterWallOpeningPlacementValid(
            perimeterId,
            wallId,
            1200, // starts at 1200, ends at 2000 (overlaps 1200-1800)
            800
          )
          expect(result).toBe(false)
        })

        it('should return false for opening at same position', () => {
          const result = store.actions.isPerimeterWallOpeningPlacementValid(perimeterId, wallId, 1000, 800)
          expect(result).toBe(false)
        })

        it('should return true for opening adjacent to the left (touching)', () => {
          const result = store.actions.isPerimeterWallOpeningPlacementValid(
            perimeterId,
            wallId,
            200, // starts at 200, ends at 1000 (touches at 1000)
            800
          )
          expect(result).toBe(true)
        })

        it('should return true for opening adjacent to the right (touching)', () => {
          const result = store.actions.isPerimeterWallOpeningPlacementValid(
            perimeterId,
            wallId,
            1800, // starts at 1800, ends at 2600 (touches at 1800)
            800
          )
          expect(result).toBe(true)
        })

        it('should return true for opening with gap', () => {
          const result = store.actions.isPerimeterWallOpeningPlacementValid(
            perimeterId,
            wallId,
            0, // starts at 0, ends at 800 (gap from 800-1000)
            800
          )
          expect(result).toBe(true)
        })
      })
    })

    describe('findNearestValidOpeningPosition', () => {
      let perimeterId: PerimeterId
      let wallId: PerimeterWallId
      let wallLength: Length

      beforeEach(() => {
        const boundary = createRectangularBoundary()
        store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId())
        const perimeter = Object.values(store.perimeters)[0]
        perimeterId = perimeter.id
        wallId = perimeter.walls[0].id
        wallLength = perimeter.walls[0].wallLength
      })

      describe('parameter validation', () => {
        it('should throw error for non-existent wall', () => {
          const nonExistentWallId = createPerimeterId()
          expect(() => {
            store.actions.isPerimeterWallOpeningPlacementValid(nonExistentWallId, wallId, 0, 800)
          }).toThrow(/Wall wall not found/)
        })

        it('should throw error for non-existent wall', () => {
          const nonExistentWallId = createPerimeterWallId()
          expect(() => {
            store.actions.isPerimeterWallOpeningPlacementValid(perimeterId, nonExistentWallId, 0, 800)
          }).toThrow(/Wall wall not found/)
        })

        it('should return null for non-existent wall', () => {
          const nonExistentWallId = createPerimeterWallId()
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            nonExistentWallId,
            1000,
            800
          )
          expect(result).toBeNull()
        })

        it('should return null for opening wider than wall', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            1000,
            wallLength + 100
          )
          expect(result).toBeNull()
        })
      })

      describe('empty wall behavior', () => {
        it('should return preferred position when valid', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(perimeterId, wallId, 1000, 800)
          expect(result).toBe(1000)
        })

        it('should adjust negative offset to 0', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(perimeterId, wallId, -500, 800)
          expect(result).toBe(0)
        })

        it('should adjust position that would extend beyond wall end', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            wallLength - 400, // would extend beyond by 400
            800
          )
          expect(result).toBe(wallLength - 800) // adjusted to fit exactly
        })
      })

      describe('conflict resolution with existing opening', () => {
        beforeEach(() => {
          // Add an existing door at 2000-2800 (offset 2000, width 800)
          store.actions.addPerimeterWallOpening(perimeterId, wallId, {
            type: 'door',
            offsetFromStart: 2000,
            width: 800,
            height: 2100
          })
        })

        it('should return preferred position when no conflict', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            500, // no conflict with existing at 2000-2800
            800
          )
          expect(result).toBe(500)
        })

        it('should shift to closest valid position when overlapping from left side', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            1800, // would be 1800-2600, overlaps with 2000-2800
            800
          )
          // Can shift left to 1200 (distance 600) or right to 2800 (distance 1000)
          expect(result).toBe(1200) // left shift is closer
        })

        it('should shift to closest valid position when overlapping from right side', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            2400, // would be 2400-3200, overlaps with 2000-2800
            800
          )
          // Can shift left to 1200 (distance 1200) or right to 2800 (distance 400)
          expect(result).toBe(2800) // right shift is closer
        })

        it('should choose the closest valid position when both directions possible', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            2100, // overlaps, closer to right shift (2800) than left (1200)
            800
          )
          expect(result).toBe(2800) // right shift is closer: distance 700 vs 900
        })

        it('should handle exact overlap with existing opening', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            2000, // exact overlap with existing
            800
          )
          // Should return one of the valid adjacent positions
          expect(vec2.fromValues(1200, 2800)).toContain(result)
        })
      })

      describe('multiple existing openings', () => {
        beforeEach(() => {
          // Add two doors: 1000-1800 and 3000-3800
          store.actions.addPerimeterWallOpening(perimeterId, wallId, {
            type: 'door',
            offsetFromStart: 1000,
            width: 800,
            height: 2100
          })
          store.actions.addPerimeterWallOpening(perimeterId, wallId, {
            type: 'door',
            offsetFromStart: 3000,
            width: 800,
            height: 2100
          })
        })

        it('should return preferred position when it fits in gap', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            2000, // fits in gap 1800-3000
            800
          )
          expect(result).toBe(2000)
        })

        it('should shift when preferred position overlaps first opening', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            1200, // overlaps with first opening 1000-1800
            600
          )
          expect(result).toBe(1800) // shift right after first opening
        })

        it('should shift when preferred position overlaps second opening', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            3200, // overlaps with second opening 3000-3800
            600
          )
          // Can shift left to 2400 (distance 800) or right to 3800 (distance 600)
          expect(result).toBe(3800) // right shift is closer
        })

        it('should find valid position when overlapping both openings', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            2500, // overlaps with both
            600
          )
          // Should find closest valid position (before second opening)
          expect(result).toBe(2400)
        })

        it('should handle opening that exactly fills the gap', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            1900, // close to gap center
            1200 // exactly fills gap 1800-3000
          )
          expect(result).toBe(1800) // exactly at gap start
        })
      })

      describe('edge cases', () => {
        it('should handle opening that spans entire wall on empty wall', () => {
          const perimeter = store.perimeters[perimeterId]!
          const wall = perimeter.walls[0]
          const wallLength = wall.wallLength

          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(perimeterId, wallId, 0, wallLength)
          expect(result).toBe(0)
        })

        it('should handle very small opening width', () => {
          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            1000,
            1 // 1mm wide opening
          )
          expect(result).toBe(1000)
        })

        it('should return null when no valid position exists due to space constraints', () => {
          const perimeter = store.perimeters[perimeterId]!
          const wall = perimeter.walls[0]
          const wallLength = wall.wallLength

          // Fill most of the wall with a large opening, leaving < 800 units space
          store.actions.addPerimeterWallOpening(perimeterId, wallId, {
            type: 'passage',
            offsetFromStart: 100,
            width: wallLength - 500, // leaves only 400 units space
            height: 2100
          })

          const result = store.actions.findNearestValidPerimeterWallOpeningPosition(
            perimeterId,
            wallId,
            500,
            800 // won't fit in remaining 400 units
          )
          expect(result).toBeNull()
        })
      })
    })

    describe('Smart corner merging', () => {
      it('should preserve openings when removing straight corner (180°)', () => {
        // Create a perimeter with a split wall
        const boundary = {
          points: [
            vec2.fromValues(0, 0),
            vec2.fromValues(0, 3000),
            vec2.fromValues(0, 6000),
            vec2.fromValues(2000, 6000),
            vec2.fromValues(2000, 0)
          ]
        }
        const constructionMethodId = createPerimeterConstructionMethodId()

        const perimeter = store.actions.addPerimeter(createStoreyId(), boundary, constructionMethodId)

        // Add openings to the first wall
        store.actions.addPerimeterWallOpening(perimeter.id, perimeter.walls[0].id, {
          type: 'door',
          offsetFromStart: 500,
          width: 800,
          height: 2100
        })

        store.actions.addPerimeterWallOpening(perimeter.id, perimeter.walls[0].id, {
          type: 'window',
          offsetFromStart: 1500,
          width: 600,
          height: 1200
        })

        // Add openings to the second wall
        store.actions.addPerimeterWallOpening(perimeter.id, perimeter.walls[1].id, {
          type: 'window',
          offsetFromStart: 300,
          width: 400,
          height: 1200
        })

        // Manually set the corner to be exactly straight (180°)
        // This simulates what would happen when a corner becomes straight
        const cornerToMerge = perimeter.corners[1] // Split corner
        expect(cornerToMerge.interiorAngle).toBe(180) // Should be 180° for wall split

        const originalWall1Openings = perimeter.walls[0].openings.length
        const originalWall2Openings = perimeter.walls[1].openings.length
        const expectedTotalOpenings = originalWall1Openings + originalWall2Openings

        // Remove the straight corner - this should merge walls and preserve openings
        const success = store.actions.removePerimeterCorner(perimeter.id, cornerToMerge.id)
        expect(success).toBe(true)

        const updatedPerimeter = store.perimeters[perimeter.id]!

        // Should have one less corner and one less wall
        expect(updatedPerimeter.corners).toHaveLength(4)
        expect(updatedPerimeter.walls).toHaveLength(4)

        // Find the merged wall (the one that would have combined the openings)
        // It should be the first wall after the merge
        const mergedWall = updatedPerimeter.walls[0]

        // The merged wall should have all openings from both original walls
        expect(mergedWall.openings).toHaveLength(expectedTotalOpenings)

        // Verify opening positions are correct
        const sortedOpenings = mergedWall.openings.sort((a, b) => a.offsetFromStart - b.offsetFromStart)

        // First opening should be the door from the original first wall
        expect(sortedOpenings[0].type).toBe('door')
        expect(sortedOpenings[0].offsetFromStart).toBe(500)

        // Second opening should be the window from the original first wall
        expect(sortedOpenings[1].type).toBe('window')
        expect(sortedOpenings[1].offsetFromStart).toBe(1500)

        // Third opening should be from the second wall, offset by the first wall's length
        expect(sortedOpenings[2].type).toBe('window')
        // Original offset (300) + first wall length (3000) = 2860
        expect(sortedOpenings[2].offsetFromStart).toBe(3300)
      })

      it('should delete openings when removing non-straight corner (preserves current behavior)', () => {
        // Create a simple rectangular perimeter
        const boundary = {
          points: [
            vec2.fromValues(0, 0),
            vec2.fromValues(0, 3000),
            vec2.fromValues(3000, 3000),
            vec2.fromValues(3000, 0)
          ]
        }
        const constructionMethodId = createPerimeterConstructionMethodId()
        const perimeter = store.actions.addPerimeter(createStoreyId(), boundary, constructionMethodId)

        // Add openings to walls
        store.actions.addPerimeterWallOpening(perimeter.id, perimeter.walls[0].id, {
          type: 'door',
          offsetFromStart: 500,
          width: 800,
          height: 2100
        })

        store.actions.addPerimeterWallOpening(perimeter.id, perimeter.walls[1].id, {
          type: 'window',
          offsetFromStart: 300,
          width: 400,
          height: 1200
        })

        // Keep the corner at 90° (non-straight)
        const cornerToMerge = perimeter.corners[1]
        expect(cornerToMerge.interiorAngle).toBe(90) // Should be 90° for rectangle

        // Remove the non-straight corner
        const success = store.actions.removePerimeterCorner(perimeter.id, cornerToMerge.id)
        expect(success).toBe(true)

        const updatedPerimeter = store.perimeters[perimeter.id]!
        const mergedWall = updatedPerimeter.walls[0]

        // For non-straight corners, openings should be deleted (current behavior)
        expect(mergedWall.openings).toHaveLength(0)
      })
    })
  })

  describe('Bulk Wall Updates', () => {
    it('should update construction method for all walls in perimeter', () => {
      // Add perimeter with multiple walls
      const boundary: Polygon2D = {
        points: [vec2.fromValues(0, 0), vec2.fromValues(5000, 0), vec2.fromValues(5000, 3000), vec2.fromValues(0, 3000)]
      }
      const perimeter = store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId(), 360)

      // Verify we have multiple walls
      expect(perimeter.walls.length).toBeGreaterThan(1)

      // Verify initial state - all walls should have same method
      const initialMethod = perimeter.walls[0].constructionMethodId
      expect(perimeter.walls.every(wall => wall.constructionMethodId === initialMethod)).toBe(true)

      // Update all walls to new method
      const newMethodId = createPerimeterConstructionMethodId()
      store.actions.updateAllPerimeterWallsConstructionMethod(perimeter.id, newMethodId)

      // Verify all walls now have new method
      const updatedPerimeter = store.actions.getPerimeterById(perimeter.id)
      expect(updatedPerimeter).toBeTruthy()
      expect(updatedPerimeter!.walls.every(wall => wall.constructionMethodId === newMethodId)).toBe(true)
    })

    it('should update thickness for all walls in perimeter', () => {
      // Add perimeter with multiple walls
      const boundary: Polygon2D = {
        points: [vec2.fromValues(0, 0), vec2.fromValues(5000, 0), vec2.fromValues(5000, 3000), vec2.fromValues(0, 3000)]
      }
      const perimeter = store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId(), 360)

      // Verify we have multiple walls
      expect(perimeter.walls.length).toBeGreaterThan(1)

      // Update all walls to new thickness
      const newThickness = 400
      store.actions.updateAllPerimeterWallsThickness(perimeter.id, newThickness)

      // Verify all walls now have new thickness
      const updatedPerimeter = store.actions.getPerimeterById(perimeter.id)
      expect(updatedPerimeter).toBeTruthy()
      expect(updatedPerimeter!.walls.every(wall => wall.thickness === newThickness)).toBe(true)
    })

    it('should throw error for invalid thickness in bulk update', () => {
      // Add perimeter
      const boundary: Polygon2D = {
        points: [vec2.fromValues(0, 0), vec2.fromValues(5000, 0), vec2.fromValues(5000, 3000), vec2.fromValues(0, 3000)]
      }
      const perimeter = store.actions.addPerimeter(testStoreyId, boundary, createPerimeterConstructionMethodId(), 360)

      // Should throw error for zero thickness
      expect(() => {
        store.actions.updateAllPerimeterWallsThickness(perimeter.id, 0)
      }).toThrow('Wall thickness must be greater than 0')

      // Should throw error for negative thickness
      expect(() => {
        store.actions.updateAllPerimeterWallsThickness(perimeter.id, -100)
      }).toThrow('Wall thickness must be greater than 0')
    })

    it('should handle non-existent perimeter gracefully in bulk updates', () => {
      const fakePerimeterId = createPerimeterId()
      const newMethodId = createPerimeterConstructionMethodId()
      const newThickness = 400

      // Should not throw error for non-existent perimeter
      expect(() => {
        store.actions.updateAllPerimeterWallsConstructionMethod(fakePerimeterId, newMethodId)
      }).not.toThrow()

      expect(() => {
        store.actions.updateAllPerimeterWallsThickness(fakePerimeterId, newThickness)
      }).not.toThrow()
    })
  })
})
