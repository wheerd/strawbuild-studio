import { describe, it, expect, beforeEach } from 'vitest'
import { createOuterWallsSlice, type OuterWallsSlice } from './outerWallsSlice'
import { createFloorId, createOuterWallId } from '@/types/ids'
import { createLength, createPoint2D, type Polygon2D } from '@/types/geometry'
import type { Opening } from '@/types/model'

describe('OuterWallsSlice', () => {
  let store: OuterWallsSlice
  let testFloorId: ReturnType<typeof createFloorId>
  let testBoundary: Polygon2D

  beforeEach(() => {
    const set = (updater: any) => {
      if (typeof updater === 'function') {
        Object.assign(store, updater(store))
      } else {
        Object.assign(store, updater)
      }
    }
    const get = () => store

    store = createOuterWallsSlice(set, get, {
      setState: set,
      getState: get,
      subscribe: () => () => {},
      destroy: () => {}
    } as any)

    testFloorId = createFloorId()
    testBoundary = {
      points: [createPoint2D(0, 0), createPoint2D(1000, 0), createPoint2D(1000, 1000), createPoint2D(0, 1000)]
    }
  })

  describe('addOuterWall', () => {
    it('should create an outer wall with default thickness', () => {
      store.addOuterWall(testFloorId, testBoundary, 'cells-under-tension')

      const walls = store.getOuterWallsByFloor(testFloorId)
      expect(walls).toHaveLength(1)

      const wall = walls[0]
      expect(wall.floorId).toBe(testFloorId)
      expect(wall.boundary).toEqual(testBoundary.points)
      expect(wall.segments).toHaveLength(4) // One segment per side
      expect(wall.segments[0].constructionType).toBe('cells-under-tension')
      expect(wall.segments[0].thickness).toBe(440) // Default thickness
      expect(wall.segments[0].openings).toHaveLength(0)
    })

    it('should create an outer wall with custom thickness', () => {
      const customThickness = createLength(600)

      store.addOuterWall(testFloorId, testBoundary, 'infill', customThickness)

      const walls = store.getOuterWallsByFloor(testFloorId)
      const wall = walls[0]
      expect(wall.segments[0].thickness).toBe(600)
      expect(wall.segments[0].constructionType).toBe('infill')
    })

    it('should throw error for invalid boundary', () => {
      const invalidBoundary: Polygon2D = {
        points: [createPoint2D(0, 0), createPoint2D(1000, 0)] // Only 2 points
      }

      expect(() => store.addOuterWall(testFloorId, invalidBoundary, 'cells-under-tension')).toThrow(
        'Outer wall boundary must have at least 3 points'
      )
    })

    it('should throw error for zero or negative thickness', () => {
      expect(() => store.addOuterWall(testFloorId, testBoundary, 'cells-under-tension', createLength(0))).toThrow(
        'Wall thickness must be greater than 0'
      )

      expect(() => store.addOuterWall(testFloorId, testBoundary, 'cells-under-tension', createLength(-100))).toThrow(
        'Wall thickness must be greater than 0'
      )
    })
  })

  describe('removeOuterWall', () => {
    it('should remove an outer wall', () => {
      store.addOuterWall(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      store.removeOuterWall(wallId)

      expect(store.getOuterWallById(wallId)).toBeNull()
      expect(store.getOuterWallsByFloor(testFloorId)).toHaveLength(0)
    })
  })

  describe('updateOuterWallConstructionType', () => {
    it('should update construction type for a specific segment', () => {
      store.addOuterWall(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      store.updateOuterWallConstructionType(wallId, 0, 'infill')

      const segment = store.getOuterWallSegment(wallId, 0)
      expect(segment?.constructionType).toBe('infill')

      // Other segments should remain unchanged
      const segment1 = store.getOuterWallSegment(wallId, 1)
      expect(segment1?.constructionType).toBe('cells-under-tension')
    })
  })

  describe('updateOuterWallThickness', () => {
    it('should update thickness for a specific segment', () => {
      store.addOuterWall(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id
      const newThickness = createLength(500)

      store.updateOuterWallThickness(wallId, 0, newThickness)

      const segment = store.getOuterWallSegment(wallId, 0)
      expect(segment?.thickness).toBe(500)
    })

    it('should throw error for zero or negative thickness', () => {
      store.addOuterWall(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      expect(() => store.updateOuterWallThickness(wallId, 0, createLength(0))).toThrow(
        'Wall thickness must be greater than 0'
      )
    })
  })

  describe('opening operations', () => {
    it('should add opening to wall segment', () => {
      store.addOuterWall(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      const opening: Opening = {
        type: 'door',
        offsetFromStart: createLength(500),
        width: createLength(800),
        height: createLength(2100)
      }

      store.addOpeningToOuterWall(wallId, 0, opening)

      const segment = store.getOuterWallSegment(wallId, 0)
      expect(segment?.openings).toHaveLength(1)
      expect(segment?.openings[0]).toEqual(opening)
    })

    it('should remove opening from wall segment', () => {
      store.addOuterWall(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      const opening: Opening = {
        type: 'window',
        offsetFromStart: createLength(1000),
        width: createLength(1200),
        height: createLength(1000),
        sillHeight: createLength(900)
      }

      store.addOpeningToOuterWall(wallId, 0, opening)
      store.removeOpeningFromOuterWall(wallId, 0, 0)

      const segment = store.getOuterWallSegment(wallId, 0)
      expect(segment?.openings).toHaveLength(0)
    })

    it('should validate opening parameters', () => {
      store.addOuterWall(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      // Test negative offset
      const invalidOpening1: Opening = {
        type: 'door',
        offsetFromStart: createLength(-100),
        width: createLength(800),
        height: createLength(2100)
      }
      expect(() => store.addOpeningToOuterWall(wallId, 0, invalidOpening1)).toThrow(
        'Opening offset from start must be non-negative'
      )

      // Test zero width
      const invalidOpening2: Opening = {
        type: 'door',
        offsetFromStart: createLength(500),
        width: createLength(0),
        height: createLength(2100)
      }
      expect(() => store.addOpeningToOuterWall(wallId, 0, invalidOpening2)).toThrow(
        'Opening width must be greater than 0'
      )
    })
  })

  describe('getters', () => {
    it('should return null for non-existent wall', () => {
      const fakeId = createOuterWallId()
      expect(store.getOuterWallById(fakeId)).toBeNull()
    })

    it('should return null for invalid segment index', () => {
      store.addOuterWall(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      expect(store.getOuterWallSegment(wallId, -1)).toBeNull()
      expect(store.getOuterWallSegment(wallId, 10)).toBeNull()
    })

    it('should filter walls by floor', () => {
      const floor1Id = createFloorId()
      const floor2Id = createFloorId()

      store.addOuterWall(floor1Id, testBoundary, 'cells-under-tension')
      store.addOuterWall(floor2Id, testBoundary, 'infill')

      expect(store.getOuterWallsByFloor(floor1Id)).toHaveLength(1)
      expect(store.getOuterWallsByFloor(floor2Id)).toHaveLength(1)
      expect(store.getOuterWallsByFloor(createFloorId())).toHaveLength(0)
    })
  })
})
