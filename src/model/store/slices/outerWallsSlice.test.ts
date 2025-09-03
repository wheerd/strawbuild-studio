import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createOuterWallsSlice, type OuterWallsSlice } from './outerWallsSlice'
import {
  createOuterWallId,
  createWallSegmentId,
  createOuterCornerId,
  createOpeningId,
  createFloorId
} from '@/types/ids'
import { createLength, createVec2, type Polygon2D } from '@/types/geometry'
import type { OuterWallConstructionType } from '@/types/model'

// Mock Zustand following the official testing guide
vi.mock('zustand')

describe('OuterWallsSlice', () => {
  let store: OuterWallsSlice
  let mockSet: any
  let mockGet: any
  let testFloorId: any

  beforeEach(() => {
    // Create the slice directly without using create()
    mockSet = vi.fn()
    mockGet = vi.fn()
    const mockStore = {} as any
    testFloorId = createFloorId()

    store = createOuterWallsSlice(mockSet, mockGet, mockStore)

    // Mock the get function to return current state
    mockGet.mockImplementation(() => store)

    // Mock the set function to actually update the store
    mockSet.mockImplementation((updater: any) => {
      if (typeof updater === 'function') {
        const newState = updater(store)
        Object.assign(store, newState)
      } else {
        Object.assign(store, updater)
      }
    })
  })

  // Helper function to create a simple rectangular polygon
  const createRectangularBoundary = (): Polygon2D => ({
    points: [createVec2(0, 0), createVec2(10, 0), createVec2(10, 5), createVec2(0, 5)]
  })

  // Helper function to create a triangular polygon
  const createTriangularBoundary = (): Polygon2D => ({
    points: [createVec2(0, 0), createVec2(5, 0), createVec2(2.5, 4)]
  })

  // Helper function to create a shape with reflex angles (like a "C" or "L" shape)
  const createReflexAngleBoundary = (): Polygon2D => ({
    points: [
      createVec2(0, 0), // Start
      createVec2(10, 0), // Move right
      createVec2(10, 5), // Move up
      createVec2(5, 5), // Move left (creates reflex angle)
      createVec2(5, 10), // Move up (creates reflex angle)
      createVec2(0, 10) // Move left
      // Back to start
    ]
  })

  describe('addOuterWallPolygon', () => {
    it('should add outer wall polygon with default thickness', () => {
      const boundary = createRectangularBoundary()
      const constructionType: OuterWallConstructionType = 'cells-under-tension'

      store.addOuterWallPolygon(testFloorId, boundary, constructionType)

      expect(store.outerWalls.size).toBe(1)
      const wall = Array.from(store.outerWalls.values())[0]

      expect(wall.floorId).toBe(testFloorId)
      expect(wall.boundary).toEqual(boundary.points)
      expect(wall.segments).toHaveLength(4) // Rectangle has 4 sides
      expect(wall.corners).toHaveLength(4) // Rectangle has 4 corners

      // Check segments have correct properties
      wall.segments.forEach(segment => {
        expect(segment.constructionType).toBe(constructionType)
        expect(segment.thickness).toBe(createLength(440)) // Default outer wall thickness
        expect(segment.openings).toEqual([])
        expect(segment.id).toBeTruthy()
      })

      // Check corners have correct properties
      wall.corners.forEach(corner => {
        expect(corner.id).toBeTruthy()
        expect(corner.belongsTo).toBe('next') // Default
        expect(corner.outsidePoint).toBeTruthy()
      })
    })

    it('should add outer wall polygon with custom thickness', () => {
      const boundary = createRectangularBoundary()
      const constructionType: OuterWallConstructionType = 'infill'
      const customThickness = createLength(200)

      store.addOuterWallPolygon(testFloorId, boundary, constructionType, customThickness)

      const wall = Array.from(store.outerWalls.values())[0]
      wall.segments.forEach(segment => {
        expect(segment.thickness).toBe(customThickness)
        expect(segment.constructionType).toBe(constructionType)
      })
    })

    it('should add triangular outer wall polygon', () => {
      const boundary = createTriangularBoundary()
      const constructionType: OuterWallConstructionType = 'strawhenge'

      store.addOuterWallPolygon(testFloorId, boundary, constructionType)

      const wall = Array.from(store.outerWalls.values())[0]
      expect(wall.segments).toHaveLength(3) // Triangle has 3 sides
      expect(wall.corners).toHaveLength(3) // Triangle has 3 corners
    })

    it('should add multiple outer wall polygons', () => {
      const boundary1 = createRectangularBoundary()
      const boundary2 = createTriangularBoundary()

      store.addOuterWallPolygon(testFloorId, boundary1, 'cells-under-tension')
      store.addOuterWallPolygon(testFloorId, boundary2, 'infill')

      expect(store.outerWalls.size).toBe(2)
      const walls = Array.from(store.outerWalls.values())
      expect(walls[0].segments).toHaveLength(4)
      expect(walls[1].segments).toHaveLength(3)
    })

    it('should throw error for insufficient boundary points', () => {
      const invalidBoundary: Polygon2D = {
        points: [createVec2(0, 0), createVec2(1, 0)] // Only 2 points
      }

      expect(() => store.addOuterWallPolygon(testFloorId, invalidBoundary, 'cells-under-tension')).toThrow(
        'Outer wall boundary must have at least 3 points'
      )
    })

    it('should throw error for zero thickness', () => {
      const boundary = createRectangularBoundary()

      expect(() => store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension', createLength(0))).toThrow(
        'Wall thickness must be greater than 0'
      )
    })

    it('should throw error for negative thickness', () => {
      const boundary = createRectangularBoundary()

      expect(() => store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension', createLength(-100))).toThrow(
        'Wall thickness must be greater than 0'
      )
    })

    it('should compute segment geometry correctly', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]
      const segment = wall.segments[0] // First segment from (0,0) to (10,0)

      expect(segment.insideLine.start).toEqual(createVec2(0, 0))
      expect(segment.insideLine.end).toEqual(createVec2(10, 0))
      expect(segment.insideLength).toBe(10)

      // Check that outside line is offset correctly
      expect(segment.outsideLine.start[0]).toBe(0)
      expect(segment.outsideLine.start[1]).toBe(createLength(440)) // Offset outward
      expect(segment.outsideLine.end[0]).toBe(10)
      expect(segment.outsideLine.end[1]).toBe(createLength(440))
    })

    it('should calculate different length values correctly', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]
      const segment = wall.segments[0] // First segment from (0,0) to (10,0)

      // For a rectangular boundary:
      // - insideLength should be the boundary segment length
      // - segmentLength should equal insideLength (no truncation for right angles)
      // - outsideLength varies based on corner intersection geometry
      expect(segment.insideLength).toBe(10) // Original boundary segment
      expect(segment.segmentLength).toBe(10) // Actual wall segment (same as inside for rectangles)

      // outsideLength depends on corner intersection points, verify it's reasonable
      expect(segment.outsideLength).toBeGreaterThan(0)
      expect(segment.outsideLength).toBeLessThan(2000) // Reasonable upper bound

      // All lengths should be positive and finite
      expect(segment.insideLength).toBeGreaterThan(0)
      expect(segment.segmentLength).toBeGreaterThan(0)
      expect(Number.isFinite(segment.outsideLength)).toBe(true)
    })

    it('should handle reflex angles correctly without pointy corners', () => {
      const boundary = createReflexAngleBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]

      // Verify wall was created successfully
      expect(wall.segments).toHaveLength(6)
      expect(wall.corners).toHaveLength(6)

      // Check that segments have proper geometry without overlapping
      wall.segments.forEach(segment => {
        expect(segment.insideLength).toBeGreaterThan(0)
        expect(segment.segmentLength).toBeGreaterThan(0)
        expect(segment.outsideLength).toBeGreaterThan(0)

        // Verify that lines have valid start and end points
        expect(segment.insideLine.start).toBeDefined()
        expect(segment.insideLine.end).toBeDefined()
        expect(segment.outsideLine.start).toBeDefined()
        expect(segment.outsideLine.end).toBeDefined()

        // For reflex angles, segmentLength may be different from insideLength due to truncation
        // but should be reasonable (not negative, not excessively large)
        expect(segment.segmentLength).toBeLessThanOrEqual(segment.insideLength * 1.5) // Allow some extension
      })

      // Verify corner points are properly positioned
      wall.corners.forEach(corner => {
        expect(corner.outsidePoint).toBeDefined()
        expect(typeof corner.outsidePoint[0]).toBe('number')
        expect(typeof corner.outsidePoint[1]).toBe('number')
        expect(corner.belongsTo).toMatch(/^(previous|next)$/)
      })
    })
  })

  describe('removeOuterWall', () => {
    it('should remove existing outer wall', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wallId = Array.from(store.outerWalls.keys())[0]
      expect(store.outerWalls.size).toBe(1)

      store.removeOuterWall(wallId)

      expect(store.outerWalls.size).toBe(0)
      expect(store.outerWalls.has(wallId)).toBe(false)
    })

    it('should handle removing non-existent wall gracefully', () => {
      const initialSize = store.outerWalls.size
      const fakeWallId = createOuterWallId()

      store.removeOuterWall(fakeWallId)

      expect(store.outerWalls.size).toBe(initialSize)
    })

    it('should not affect other walls when removing one', () => {
      const boundary1 = createRectangularBoundary()
      const boundary2 = createTriangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary1, 'cells-under-tension')
      store.addOuterWallPolygon(testFloorId, boundary2, 'infill')

      const wallIds = Array.from(store.outerWalls.keys())
      expect(store.outerWalls.size).toBe(2)

      store.removeOuterWall(wallIds[0])

      expect(store.outerWalls.size).toBe(1)
      expect(store.outerWalls.has(wallIds[1])).toBe(true)
    })
  })

  describe('updateOuterWallConstructionType', () => {
    it('should update segment construction type', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]
      const segmentId = wall.segments[0].id

      store.updateOuterWallConstructionType(wall.id, segmentId, 'infill')

      const updatedWall = store.outerWalls.get(wall.id)!
      const updatedSegment = updatedWall.segments.find(s => s.id === segmentId)!
      expect(updatedSegment.constructionType).toBe('infill')

      // Other properties should remain unchanged
      expect(updatedSegment.thickness).toBe(createLength(440))
      expect(updatedSegment.openings).toEqual([])
    })

    it('should do nothing if wall does not exist', () => {
      const fakeWallId = createOuterWallId()
      const fakeSegmentId = createWallSegmentId()
      const initialState = new Map(store.outerWalls)

      store.updateOuterWallConstructionType(fakeWallId, fakeSegmentId, 'infill')

      expect(store.outerWalls).toEqual(initialState)
    })

    it('should do nothing if segment does not exist', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]
      const fakeSegmentId = createWallSegmentId()
      const originalWall = { ...wall }

      store.updateOuterWallConstructionType(wall.id, fakeSegmentId, 'infill')

      const unchangedWall = store.outerWalls.get(wall.id)!
      expect(unchangedWall.segments).toEqual(originalWall.segments)
    })
  })

  describe('updateOuterWallThickness', () => {
    it('should update segment thickness and recalculate geometry', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]
      const segmentId = wall.segments[0].id
      const newThickness = createLength(300)

      store.updateOuterWallThickness(wall.id, segmentId, newThickness)

      const updatedWall = store.outerWalls.get(wall.id)!
      const updatedSegment = updatedWall.segments.find(s => s.id === segmentId)!

      expect(updatedSegment.thickness).toBe(newThickness)

      // Geometry should be recalculated with new thickness
      expect(updatedSegment.outsideLine.start[1]).toBe(newThickness) // New offset
    })

    it('should recalculate corners when thickness changes', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]
      const originalCornerPoints = wall.corners.map(c => c.outsidePoint)
      const originalCornerIds = wall.corners.map(c => c.id)
      const segmentId = wall.segments[0].id

      store.updateOuterWallThickness(wall.id, segmentId, createLength(300))

      const updatedWall = store.outerWalls.get(wall.id)!
      const newCornerPoints = updatedWall.corners.map(c => c.outsidePoint)
      const newCornerIds = updatedWall.corners.map(c => c.id)

      // At least some corner points should have changed
      expect(newCornerPoints).not.toEqual(originalCornerPoints)
      // But corner IDs should be preserved
      expect(newCornerIds).toEqual(originalCornerIds)
    })

    it('should preserve corner belongsTo values', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]
      const cornerId = wall.corners[0].id

      // Change belongsTo value
      store.updateCornerBelongsTo(wall.id, cornerId, 'previous')

      // Update thickness
      const segmentId = wall.segments[0].id
      store.updateOuterWallThickness(wall.id, segmentId, createLength(300))

      const updatedWall = store.outerWalls.get(wall.id)!
      // Corner IDs should be preserved when thickness changes
      const updatedCorner = updatedWall.corners.find(c => c.id === cornerId)!
      expect(updatedCorner.belongsTo).toBe('previous') // Should be preserved
      expect(updatedCorner.id).toBe(cornerId) // ID should be preserved
    })

    it('should throw error for invalid thickness', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]
      const segmentId = wall.segments[0].id

      expect(() => store.updateOuterWallThickness(wall.id, segmentId, createLength(0))).toThrow(
        'Wall thickness must be greater than 0'
      )

      expect(() => store.updateOuterWallThickness(wall.id, segmentId, createLength(-100))).toThrow(
        'Wall thickness must be greater than 0'
      )
    })

    it('should do nothing if wall does not exist', () => {
      const fakeWallId = createOuterWallId()
      const fakeSegmentId = createWallSegmentId()
      const initialState = new Map(store.outerWalls)

      store.updateOuterWallThickness(fakeWallId, fakeSegmentId, createLength(300))

      expect(store.outerWalls).toEqual(initialState)
    })

    it('should do nothing if segment does not exist', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]
      const fakeSegmentId = createWallSegmentId()
      const originalWall = { ...wall }

      store.updateOuterWallThickness(wall.id, fakeSegmentId, createLength(300))

      const unchangedWall = store.outerWalls.get(wall.id)!
      expect(unchangedWall.segments).toEqual(originalWall.segments)
    })
  })

  describe('updateCornerBelongsTo', () => {
    it('should update corner belongsTo value', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]
      const cornerId = wall.corners[0].id

      store.updateCornerBelongsTo(wall.id, cornerId, 'previous')

      const updatedWall = store.outerWalls.get(wall.id)!
      const updatedCorner = updatedWall.corners.find(c => c.id === cornerId)!
      expect(updatedCorner.belongsTo).toBe('previous')
    })

    it('should preserve other corner properties', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]
      const corner = wall.corners[0]
      const originalOutsidePoint = corner.outsidePoint

      store.updateCornerBelongsTo(wall.id, corner.id, 'previous')

      const updatedWall = store.outerWalls.get(wall.id)!
      const updatedCorner = updatedWall.corners.find(c => c.id === corner.id)!
      expect(updatedCorner.outsidePoint).toEqual(originalOutsidePoint)
      expect(updatedCorner.id).toBe(corner.id)
    })

    it('should do nothing if wall does not exist', () => {
      const fakeWallId = createOuterWallId()
      const fakeCornerId = createOuterCornerId()
      const initialState = new Map(store.outerWalls)

      store.updateCornerBelongsTo(fakeWallId, fakeCornerId, 'previous')

      expect(store.outerWalls).toEqual(initialState)
    })

    it('should do nothing if corner does not exist', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]
      const fakeCornerId = createOuterCornerId()
      const originalWall = { ...wall }

      store.updateCornerBelongsTo(wall.id, fakeCornerId, 'previous')

      const unchangedWall = store.outerWalls.get(wall.id)!
      expect(unchangedWall.corners).toEqual(originalWall.corners)
    })
  })

  describe('opening operations', () => {
    describe('addOpeningToOuterWall', () => {
      it('should add door opening to wall segment', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id

        const openingId = store.addOpeningToOuterWall(wall.id, segmentId, {
          type: 'door',
          offsetFromStart: createLength(1000),
          width: createLength(800),
          height: createLength(2100)
        })

        expect(openingId).toBeTruthy()
        expect(typeof openingId).toBe('string')

        const updatedWall = store.outerWalls.get(wall.id)!
        const updatedSegment = updatedWall.segments.find(s => s.id === segmentId)!
        expect(updatedSegment.openings).toHaveLength(1)

        const opening = updatedSegment.openings[0]
        expect(opening.id).toBe(openingId)
        expect(opening.type).toBe('door')
        expect(opening.offsetFromStart).toBe(createLength(1000))
        expect(opening.width).toBe(createLength(800))
        expect(opening.height).toBe(createLength(2100))
        expect(opening.sillHeight).toBeUndefined()
      })

      it('should add window opening to wall segment', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id

        store.addOpeningToOuterWall(wall.id, segmentId, {
          type: 'window',
          offsetFromStart: createLength(2000),
          width: createLength(1200),
          height: createLength(1000),
          sillHeight: createLength(900)
        })

        const updatedWall = store.outerWalls.get(wall.id)!
        const updatedSegment = updatedWall.segments.find(s => s.id === segmentId)!
        const opening = updatedSegment.openings[0]

        expect(opening.type).toBe('window')
        expect(opening.sillHeight).toBe(createLength(900))
      })

      it('should add multiple openings to same segment', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id

        store.addOpeningToOuterWall(wall.id, segmentId, {
          type: 'door',
          offsetFromStart: createLength(1000),
          width: createLength(800),
          height: createLength(2100)
        })

        store.addOpeningToOuterWall(wall.id, segmentId, {
          type: 'window',
          offsetFromStart: createLength(5000),
          width: createLength(1200),
          height: createLength(1000),
          sillHeight: createLength(900)
        })

        const updatedWall = store.outerWalls.get(wall.id)!
        const updatedSegment = updatedWall.segments.find(s => s.id === segmentId)!
        expect(updatedSegment.openings).toHaveLength(2)

        expect(updatedSegment.openings[0].type).toBe('door')
        expect(updatedSegment.openings[1].type).toBe('window')
      })

      it('should throw error for negative offset', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id

        expect(() =>
          store.addOpeningToOuterWall(wall.id, segmentId, {
            type: 'door',
            offsetFromStart: createLength(-100),
            width: createLength(800),
            height: createLength(2100)
          })
        ).toThrow('Opening offset from start must be non-negative')
      })

      it('should throw error for invalid width', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id

        expect(() =>
          store.addOpeningToOuterWall(wall.id, segmentId, {
            type: 'door',
            offsetFromStart: createLength(1000),
            width: createLength(0),
            height: createLength(2100)
          })
        ).toThrow('Opening width must be greater than 0')
      })

      it('should throw error for invalid height', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id

        expect(() =>
          store.addOpeningToOuterWall(wall.id, segmentId, {
            type: 'door',
            offsetFromStart: createLength(1000),
            width: createLength(800),
            height: createLength(0)
          })
        ).toThrow('Opening height must be greater than 0')
      })

      it('should throw error for negative sill height', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id

        expect(() =>
          store.addOpeningToOuterWall(wall.id, segmentId, {
            type: 'window',
            offsetFromStart: createLength(1000),
            width: createLength(1200),
            height: createLength(1000),
            sillHeight: createLength(-100)
          })
        ).toThrow('Window sill height must be non-negative')
      })

      it('should do nothing if wall does not exist', () => {
        const fakeWallId = createOuterWallId()
        const fakeSegmentId = createWallSegmentId()
        const initialState = new Map(store.outerWalls)

        const openingId = store.addOpeningToOuterWall(fakeWallId, fakeSegmentId, {
          type: 'door',
          offsetFromStart: createLength(1000),
          width: createLength(800),
          height: createLength(2100)
        })

        expect(openingId).toBeTruthy() // ID is still generated
        expect(store.outerWalls).toEqual(initialState)
      })

      it('should do nothing if segment does not exist', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const fakeSegmentId = createWallSegmentId()
        const originalWall = { ...wall }

        store.addOpeningToOuterWall(wall.id, fakeSegmentId, {
          type: 'door',
          offsetFromStart: createLength(1000),
          width: createLength(800),
          height: createLength(2100)
        })

        const unchangedWall = store.outerWalls.get(wall.id)!
        expect(unchangedWall.segments).toEqual(originalWall.segments)
      })

      it('should handle thickness updates for reflex angles without creating overlaps', () => {
        const boundary = createReflexAngleBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[2].id // Pick a segment that creates reflex angle
        const newThickness = createLength(600) // Thicker than default

        store.updateOuterWallThickness(wall.id, segmentId, newThickness)

        const updatedWall = store.outerWalls.get(wall.id)!
        const updatedSegment = updatedWall.segments.find(s => s.id === segmentId)!

        expect(updatedSegment.thickness).toBe(newThickness)

        // Verify all segments still have valid geometry
        updatedWall.segments.forEach(segment => {
          expect(segment.insideLength).toBeGreaterThan(0)
          expect(segment.segmentLength).toBeGreaterThan(0)
          expect(segment.outsideLength).toBeGreaterThan(0)

          // Verify lines have different start/end points (not degenerate)
          const insideDist = Math.sqrt(
            Math.pow(segment.insideLine.end[0] - segment.insideLine.start[0], 2) +
              Math.pow(segment.insideLine.end[1] - segment.insideLine.start[1], 2)
          )
          const outsideDist = Math.sqrt(
            Math.pow(segment.outsideLine.end[0] - segment.outsideLine.start[0], 2) +
              Math.pow(segment.outsideLine.end[1] - segment.outsideLine.start[1], 2)
          )

          expect(insideDist).toBeGreaterThan(0.01) // Not degenerate
          expect(outsideDist).toBeGreaterThan(0.01) // Not degenerate
        })

        // Verify corner points are reasonable
        updatedWall.corners.forEach(corner => {
          expect(Number.isFinite(corner.outsidePoint[0])).toBe(true)
          expect(Number.isFinite(corner.outsidePoint[1])).toBe(true)
          expect(Math.abs(corner.outsidePoint[0])).toBeLessThan(1000) // Reasonable bounds
          expect(Math.abs(corner.outsidePoint[1])).toBeLessThan(1000) // Reasonable bounds
        })
      })
    })

    describe('removeOpeningFromOuterWall', () => {
      it('should remove opening from wall segment', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id

        const openingId = store.addOpeningToOuterWall(wall.id, segmentId, {
          type: 'door',
          offsetFromStart: createLength(1000),
          width: createLength(800),
          height: createLength(2100)
        })

        expect(store.outerWalls.get(wall.id)!.segments[0].openings).toHaveLength(1)

        store.removeOpeningFromOuterWall(wall.id, segmentId, openingId)

        const updatedWall = store.outerWalls.get(wall.id)!
        const updatedSegment = updatedWall.segments.find(s => s.id === segmentId)!
        expect(updatedSegment.openings).toHaveLength(0)
      })

      it('should remove correct opening when multiple exist', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id

        const doorId = store.addOpeningToOuterWall(wall.id, segmentId, {
          type: 'door',
          offsetFromStart: createLength(1000),
          width: createLength(800),
          height: createLength(2100)
        })

        const windowId = store.addOpeningToOuterWall(wall.id, segmentId, {
          type: 'window',
          offsetFromStart: createLength(5000),
          width: createLength(1200),
          height: createLength(1000),
          sillHeight: createLength(900)
        })

        store.removeOpeningFromOuterWall(wall.id, segmentId, doorId)

        const updatedWall = store.outerWalls.get(wall.id)!
        const updatedSegment = updatedWall.segments.find(s => s.id === segmentId)!
        expect(updatedSegment.openings).toHaveLength(1)
        expect(updatedSegment.openings[0].id).toBe(windowId)
        expect(updatedSegment.openings[0].type).toBe('window')
      })

      it('should do nothing if wall does not exist', () => {
        const fakeWallId = createOuterWallId()
        const fakeSegmentId = createWallSegmentId()
        const fakeOpeningId = createOpeningId()
        const initialState = new Map(store.outerWalls)

        store.removeOpeningFromOuterWall(fakeWallId, fakeSegmentId, fakeOpeningId)

        expect(store.outerWalls).toEqual(initialState)
      })

      it('should do nothing if segment does not exist', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const fakeSegmentId = createWallSegmentId()
        const fakeOpeningId = createOpeningId()
        const originalWall = { ...wall }

        store.removeOpeningFromOuterWall(wall.id, fakeSegmentId, fakeOpeningId)

        const unchangedWall = store.outerWalls.get(wall.id)!
        expect(unchangedWall.segments).toEqual(originalWall.segments)
      })

      it('should do nothing if opening does not exist', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id
        const fakeOpeningId = createOpeningId()

        store.addOpeningToOuterWall(wall.id, segmentId, {
          type: 'door',
          offsetFromStart: createLength(1000),
          width: createLength(800),
          height: createLength(2100)
        })

        const originalSegment = store.outerWalls.get(wall.id)!.segments[0]

        store.removeOpeningFromOuterWall(wall.id, segmentId, fakeOpeningId)

        const unchangedSegment = store.outerWalls.get(wall.id)!.segments[0]
        expect(unchangedSegment.openings).toEqual(originalSegment.openings)
      })
    })

    describe('updateOpening', () => {
      it('should update opening properties', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id

        const openingId = store.addOpeningToOuterWall(wall.id, segmentId, {
          type: 'door',
          offsetFromStart: createLength(1000),
          width: createLength(800),
          height: createLength(2100)
        })

        store.updateOpening(wall.id, segmentId, openingId, {
          width: createLength(900),
          height: createLength(2200)
        })

        const updatedWall = store.outerWalls.get(wall.id)!
        const updatedSegment = updatedWall.segments.find(s => s.id === segmentId)!
        const updatedOpening = updatedSegment.openings[0]

        expect(updatedOpening.width).toBe(createLength(900))
        expect(updatedOpening.height).toBe(createLength(2200))
        expect(updatedOpening.type).toBe('door') // Unchanged
        expect(updatedOpening.offsetFromStart).toBe(createLength(1000)) // Unchanged
      })

      it('should update window sill height', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id

        const openingId = store.addOpeningToOuterWall(wall.id, segmentId, {
          type: 'window',
          offsetFromStart: createLength(1000),
          width: createLength(1200),
          height: createLength(1000),
          sillHeight: createLength(900)
        })

        store.updateOpening(wall.id, segmentId, openingId, {
          sillHeight: createLength(1000)
        })

        const updatedWall = store.outerWalls.get(wall.id)!
        const updatedSegment = updatedWall.segments.find(s => s.id === segmentId)!
        const updatedOpening = updatedSegment.openings[0]

        expect(updatedOpening.sillHeight).toBe(createLength(1000))
      })

      it('should do nothing if wall does not exist', () => {
        const fakeWallId = createOuterWallId()
        const fakeSegmentId = createWallSegmentId()
        const fakeOpeningId = createOpeningId()
        const initialState = new Map(store.outerWalls)

        store.updateOpening(fakeWallId, fakeSegmentId, fakeOpeningId, { width: createLength(1000) })

        expect(store.outerWalls).toEqual(initialState)
      })

      it('should do nothing if segment does not exist', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const fakeSegmentId = createWallSegmentId()
        const fakeOpeningId = createOpeningId()
        const originalWall = { ...wall }

        store.updateOpening(wall.id, fakeSegmentId, fakeOpeningId, { width: createLength(1000) })

        const unchangedWall = store.outerWalls.get(wall.id)!
        expect(unchangedWall.segments).toEqual(originalWall.segments)
      })

      it('should do nothing if opening does not exist', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id
        const fakeOpeningId = createOpeningId()

        store.addOpeningToOuterWall(wall.id, segmentId, {
          type: 'door',
          offsetFromStart: createLength(1000),
          width: createLength(800),
          height: createLength(2100)
        })

        const originalSegment = store.outerWalls.get(wall.id)!.segments[0]

        store.updateOpening(wall.id, segmentId, fakeOpeningId, { width: createLength(1000) })

        const unchangedSegment = store.outerWalls.get(wall.id)!.segments[0]
        expect(unchangedSegment.openings).toEqual(originalSegment.openings)
      })
    })
  })

  describe('getter operations', () => {
    describe('getOuterWallById', () => {
      it('should return existing outer wall', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const addedWall = Array.from(store.outerWalls.values())[0]
        const result = store.getOuterWallById(addedWall.id)

        expect(result).toBeDefined()
        expect(result?.id).toBe(addedWall.id)
        expect(result).toEqual(addedWall)
      })

      it('should return null for non-existent wall', () => {
        const fakeWallId = createOuterWallId()
        const result = store.getOuterWallById(fakeWallId)
        expect(result).toBeNull()
      })
    })

    describe('getSegmentById', () => {
      it('should return existing segment', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segment = wall.segments[0]
        const result = store.getSegmentById(wall.id, segment.id)

        expect(result).toBeDefined()
        expect(result?.id).toBe(segment.id)
        expect(result).toEqual(segment)
      })

      it('should return null for non-existent wall', () => {
        const fakeWallId = createOuterWallId()
        const fakeSegmentId = createWallSegmentId()
        const result = store.getSegmentById(fakeWallId, fakeSegmentId)
        expect(result).toBeNull()
      })

      it('should return null for non-existent segment', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const fakeSegmentId = createWallSegmentId()
        const result = store.getSegmentById(wall.id, fakeSegmentId)
        expect(result).toBeNull()
      })
    })

    describe('getCornerById', () => {
      it('should return existing corner', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const corner = wall.corners[0]
        const result = store.getCornerById(wall.id, corner.id)

        expect(result).toBeDefined()
        expect(result?.id).toBe(corner.id)
        expect(result).toEqual(corner)
      })

      it('should return null for non-existent wall', () => {
        const fakeWallId = createOuterWallId()
        const fakeCornerId = createOuterCornerId()
        const result = store.getCornerById(fakeWallId, fakeCornerId)
        expect(result).toBeNull()
      })

      it('should return null for non-existent corner', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const fakeCornerId = createOuterCornerId()
        const result = store.getCornerById(wall.id, fakeCornerId)
        expect(result).toBeNull()
      })
    })

    describe('getOpeningById', () => {
      it('should return existing opening', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id

        const openingId = store.addOpeningToOuterWall(wall.id, segmentId, {
          type: 'door',
          offsetFromStart: createLength(1000),
          width: createLength(800),
          height: createLength(2100)
        })

        const result = store.getOpeningById(wall.id, segmentId, openingId)

        expect(result).toBeDefined()
        expect(result?.id).toBe(openingId)
        expect(result?.type).toBe('door')
      })

      it('should return null for non-existent wall', () => {
        const fakeWallId = createOuterWallId()
        const fakeSegmentId = createWallSegmentId()
        const fakeOpeningId = createOpeningId()
        const result = store.getOpeningById(fakeWallId, fakeSegmentId, fakeOpeningId)
        expect(result).toBeNull()
      })

      it('should return null for non-existent segment', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const fakeSegmentId = createWallSegmentId()
        const fakeOpeningId = createOpeningId()
        const result = store.getOpeningById(wall.id, fakeSegmentId, fakeOpeningId)
        expect(result).toBeNull()
      })

      it('should return null for non-existent opening', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const wall = Array.from(store.outerWalls.values())[0]
        const segmentId = wall.segments[0].id
        const fakeOpeningId = createOpeningId()
        const result = store.getOpeningById(wall.id, segmentId, fakeOpeningId)
        expect(result).toBeNull()
      })
    })

    describe('getOuterWallsByFloor', () => {
      it('should return empty array when no walls exist', () => {
        const walls = store.getOuterWallsByFloor(testFloorId)
        expect(walls).toEqual([])
      })

      it('should return walls for specific floor', () => {
        const floor1Id = createFloorId()
        const floor2Id = createFloorId()
        const boundary1 = createRectangularBoundary()
        const boundary2 = createTriangularBoundary()

        store.addOuterWallPolygon(floor1Id, boundary1, 'cells-under-tension')
        store.addOuterWallPolygon(floor1Id, boundary2, 'infill')
        store.addOuterWallPolygon(floor2Id, boundary1, 'strawhenge')

        const floor1Walls = store.getOuterWallsByFloor(floor1Id)
        const floor2Walls = store.getOuterWallsByFloor(floor2Id)

        expect(floor1Walls).toHaveLength(2)
        expect(floor2Walls).toHaveLength(1)

        expect(floor1Walls.every(w => w.floorId === floor1Id)).toBe(true)
        expect(floor2Walls.every(w => w.floorId === floor2Id)).toBe(true)
      })

      it('should return empty array for non-existent floor', () => {
        const boundary = createRectangularBoundary()
        store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

        const nonExistentFloorId = createFloorId()
        const walls = store.getOuterWallsByFloor(nonExistentFloorId)

        expect(walls).toEqual([])
      })
    })
  })

  describe('complex scenarios', () => {
    it('should handle complex outer wall management correctly', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension')

      const wall = Array.from(store.outerWalls.values())[0]
      const segmentId = wall.segments[0].id
      const cornerId = wall.corners[0].id

      // Add openings
      const doorId = store.addOpeningToOuterWall(wall.id, segmentId, {
        type: 'door',
        offsetFromStart: createLength(1000),
        width: createLength(800),
        height: createLength(2100)
      })

      const windowId = store.addOpeningToOuterWall(wall.id, segmentId, {
        type: 'window',
        offsetFromStart: createLength(5000),
        width: createLength(1200),
        height: createLength(1000),
        sillHeight: createLength(900)
      })

      // Update properties
      store.updateOuterWallConstructionType(wall.id, segmentId, 'infill')
      store.updateCornerBelongsTo(wall.id, cornerId, 'previous')

      // Verify complex state
      const updatedWall = store.outerWalls.get(wall.id)!
      const updatedSegment = updatedWall.segments.find(s => s.id === segmentId)!
      const updatedCorner = updatedWall.corners.find(c => c.id === cornerId)!

      expect(updatedSegment.openings).toHaveLength(2)
      expect(updatedSegment.constructionType).toBe('infill')
      expect(updatedCorner.belongsTo).toBe('previous')

      // Update opening
      store.updateOpening(wall.id, segmentId, doorId, {
        width: createLength(900)
      })

      const finalSegment = store.outerWalls.get(wall.id)!.segments.find(s => s.id === segmentId)!
      const updatedDoor = finalSegment.openings.find(o => o.id === doorId)!
      expect(updatedDoor.width).toBe(createLength(900))

      // Remove opening
      store.removeOpeningFromOuterWall(wall.id, segmentId, windowId)
      const finalSegmentAfterRemoval = store.outerWalls.get(wall.id)!.segments.find(s => s.id === segmentId)!
      expect(finalSegmentAfterRemoval.openings).toHaveLength(1)
      expect(finalSegmentAfterRemoval.openings[0].id).toBe(doorId)
    })

    it('should maintain data consistency after multiple operations', () => {
      const boundary = createRectangularBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension', createLength(500))

      const wall = Array.from(store.outerWalls.values())[0]
      const segmentId = wall.segments[0].id
      const originalCornerCount = wall.corners.length

      // Add opening
      store.addOpeningToOuterWall(wall.id, segmentId, {
        type: 'door',
        offsetFromStart: createLength(1000),
        width: createLength(800),
        height: createLength(2100)
      })

      // Update thickness - this should recalculate geometry
      const newThickness = createLength(300)
      store.updateOuterWallThickness(wall.id, segmentId, newThickness)

      const finalWall = store.outerWalls.get(wall.id)!
      const finalSegment = finalWall.segments.find(s => s.id === segmentId)!

      expect(finalSegment.thickness).toBe(newThickness)
      expect(finalSegment.openings).toHaveLength(1)
      expect(finalWall.corners).toHaveLength(originalCornerCount) // Same number of corners
      expect(finalWall.segments).toHaveLength(4) // Rectangle still has 4 segments
      expect(finalWall.floorId).toBe(testFloorId)
      expect(finalWall.boundary).toEqual(boundary.points)
    })
  })

  describe('reflex angle handling', () => {
    it('should properly handle acute angles without creating invalid geometry', () => {
      // Create a shape with acute angles (< 90 degrees)
      const acuteAngleBoundary: Polygon2D = {
        points: [
          createVec2(0, 0),
          createVec2(10, 0),
          createVec2(5, 2) // Creates acute angle
        ]
      }

      store.addOuterWallPolygon(testFloorId, acuteAngleBoundary, 'cells-under-tension', createLength(100))

      const wall = Array.from(store.outerWalls.values())[0]

      // Verify all segments have valid, positive lengths
      wall.segments.forEach(segment => {
        expect(segment.insideLength).toBeGreaterThan(0)
        expect(segment.segmentLength).toBeGreaterThan(0)
        expect(segment.outsideLength).toBeGreaterThan(0)

        // Verify segment lines aren't degenerate
        const insideLineLength = Math.sqrt(
          Math.pow(segment.insideLine.end[0] - segment.insideLine.start[0], 2) +
            Math.pow(segment.insideLine.end[1] - segment.insideLine.start[1], 2)
        )
        expect(insideLineLength).toBeGreaterThan(0.01)
      })

      // Verify corners have valid positions
      wall.corners.forEach(corner => {
        expect(Number.isFinite(corner.outsidePoint[0])).toBe(true)
        expect(Number.isFinite(corner.outsidePoint[1])).toBe(true)
      })
    })

    it('should handle L-shaped boundaries with reflex angles correctly', () => {
      const lShapeBoundary = createReflexAngleBoundary()
      store.addOuterWallPolygon(testFloorId, lShapeBoundary, 'cells-under-tension', createLength(200))

      const wall = Array.from(store.outerWalls.values())[0]

      expect(wall.segments).toHaveLength(6)
      expect(wall.corners).toHaveLength(6)

      // Test specific reflex angle segments (segments 2 and 4 in our L-shape)
      const reflexSegment1 = wall.segments[2] // At (10,5) -> (5,5)
      const reflexSegment2 = wall.segments[3] // At (5,5) -> (5,10)

      // These segments should have proper truncation for reflex angles
      expect(reflexSegment1.insideLength).toBe(5) // Original boundary length
      expect(reflexSegment1.segmentLength).toBeLessThanOrEqual(reflexSegment1.insideLength) // May be truncated
      expect(reflexSegment1.segmentLength).toBeGreaterThan(0)

      expect(reflexSegment2.insideLength).toBe(5) // Original boundary length
      expect(reflexSegment2.segmentLength).toBeLessThanOrEqual(reflexSegment2.insideLength) // May be truncated
      expect(reflexSegment2.segmentLength).toBeGreaterThan(0)
    })

    it('should handle mixed thickness values with reflex angles', () => {
      const boundary = createReflexAngleBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension', createLength(200))

      const wall = Array.from(store.outerWalls.values())[0]

      // Update different segments to different thicknesses
      const segmentIds = wall.segments.map(s => s.id)
      store.updateOuterWallThickness(wall.id, segmentIds[1], createLength(400))
      store.updateOuterWallThickness(wall.id, segmentIds[3], createLength(600))

      const updatedWall = store.outerWalls.get(wall.id)!

      // Verify mixed thicknesses are applied correctly
      expect(updatedWall.segments[0].thickness).toBe(200) // Original
      expect(updatedWall.segments[1].thickness).toBe(400) // Updated
      expect(updatedWall.segments[2].thickness).toBe(200) // Original
      expect(updatedWall.segments[3].thickness).toBe(600) // Updated
      expect(updatedWall.segments[4].thickness).toBe(200) // Original
      expect(updatedWall.segments[5].thickness).toBe(200) // Original

      // All segments should still have valid geometry
      updatedWall.segments.forEach(segment => {
        expect(segment.insideLength).toBeGreaterThan(0)
        expect(segment.segmentLength).toBeGreaterThan(0)
        expect(segment.outsideLength).toBeGreaterThan(0)
        expect(Number.isFinite(segment.insideLength)).toBe(true)
        expect(Number.isFinite(segment.segmentLength)).toBe(true)
        expect(Number.isFinite(segment.outsideLength)).toBe(true)
      })

      // Corner points should be reasonable
      updatedWall.corners.forEach(corner => {
        expect(Number.isFinite(corner.outsidePoint[0])).toBe(true)
        expect(Number.isFinite(corner.outsidePoint[1])).toBe(true)
        expect(Math.abs(corner.outsidePoint[0])).toBeLessThan(1000)
        expect(Math.abs(corner.outsidePoint[1])).toBeLessThan(1000)
      })
    })

    it('should preserve segment and corner relationships after thickness updates', () => {
      const boundary = createReflexAngleBoundary()
      store.addOuterWallPolygon(testFloorId, boundary, 'cells-under-tension', createLength(300))

      const originalWall = Array.from(store.outerWalls.values())[0]
      const originalSegmentIds = originalWall.segments.map(s => s.id)
      const originalCornerIds = originalWall.corners.map(c => c.id)
      const originalBelongsTo = originalWall.corners.map(c => c.belongsTo)

      // Update thickness of a segment that creates reflex angle
      const targetSegmentId = originalSegmentIds[2]
      store.updateOuterWallThickness(originalWall.id, targetSegmentId, createLength(800))

      const updatedWall = store.outerWalls.get(originalWall.id)!

      // Verify IDs are preserved
      expect(updatedWall.segments.map(s => s.id)).toEqual(originalSegmentIds)
      expect(updatedWall.corners.map(c => c.id)).toEqual(originalCornerIds)
      expect(updatedWall.corners.map(c => c.belongsTo)).toEqual(originalBelongsTo)

      // Verify the specific segment was updated
      const updatedSegment = updatedWall.segments.find(s => s.id === targetSegmentId)!
      expect(updatedSegment.thickness).toBe(800)
    })
  })
})
