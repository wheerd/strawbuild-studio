import { describe, it, expect } from 'vitest'
import { calculateCornerMiterPolygon } from './cornerVisualization'
import { createVec2, createLength } from '@/types/geometry'
import type { Corner, Wall } from '@/types/model'
import type { PointId, WallId, FloorId } from '@/types/ids'

// Helper to create test data
const createTestWall = (id: string, startPointId: string, endPointId: string, thickness: number = 200): Wall => ({
  id: id as WallId,
  floorId: 'floor_1' as FloorId,
  startPointId: startPointId as PointId,
  endPointId: endPointId as PointId,
  thickness: createLength(thickness),
  type: 'partition'
})

const createTestCorner = (pointId: string, wall1Id: string, wall2Id: string, otherWallIds?: string[]): Corner => ({
  pointId: pointId as PointId,
  floorId: 'floor_1' as FloorId,
  wall1Id: wall1Id as WallId,
  wall2Id: wall2Id as WallId,
  otherWallIds: otherWallIds?.map(id => id as WallId)
})

describe('Corner Miter Joint Calculation', () => {
  describe('calculateCornerMiterPolygon', () => {
    it('should return null for corners with missing walls', () => {
      const corner = createTestCorner('point_1', 'wall_1', 'wall_2')
      const walls = new Map()
      const points = new Map()
      points.set('point_1', { position: createVec2(100, 100) })

      const result = calculateCornerMiterPolygon(corner, walls, points)

      // Should return null when walls are missing
      expect(result).toBeNull()
    })

    it('should return null when corner point is missing', () => {
      const corner = createTestCorner('point_1', 'wall_1', 'wall_2')
      const walls = new Map()
      walls.set('wall_1', createTestWall('wall_1', 'point_1', 'point_2'))
      walls.set('wall_2', createTestWall('wall_2', 'point_1', 'point_3'))
      const points = new Map()

      const result = calculateCornerMiterPolygon(corner, walls, points)
      expect(result).toBeNull()
    })

    it('should create proper miter for 90-degree L-corner', () => {
      const corner = createTestCorner('point_1', 'wall_1', 'wall_2')

      // Create L-shaped walls: horizontal and vertical meeting at (100, 100)
      const walls = new Map()
      walls.set('wall_1', createTestWall('wall_1', 'point_1', 'point_2', 200)) // Horizontal wall
      walls.set('wall_2', createTestWall('wall_2', 'point_1', 'point_3', 200)) // Vertical wall

      const points = new Map()
      points.set('point_1', { position: createVec2(100, 100) }) // Corner point
      points.set('point_2', { position: createVec2(200, 100) }) // End of horizontal wall
      points.set('point_3', { position: createVec2(100, 200) }) // End of vertical wall

      const result = calculateCornerMiterPolygon(corner, walls, points)

      expect(result).not.toBeNull()
      expect(result!.points.length).toBeGreaterThan(0)

      // For a 90-degree corner, we expect a roughly rectangular miter joint
      const polygon = result!.points
      expect(polygon.length).toBeGreaterThanOrEqual(3)
    })

    it('should create proper miter for T-junction', () => {
      const corner = createTestCorner('point_1', 'wall_1', 'wall_2', ['wall_3'])

      // Create T-junction: two horizontal walls and one vertical
      const walls = new Map()
      walls.set('wall_1', createTestWall('wall_1', 'point_2', 'point_1', 200)) // Left horizontal
      walls.set('wall_2', createTestWall('wall_2', 'point_1', 'point_4', 200)) // Right horizontal
      walls.set('wall_3', createTestWall('wall_3', 'point_1', 'point_3', 200)) // Vertical

      const points = new Map()
      points.set('point_1', { position: createVec2(100, 100) }) // Center point
      points.set('point_2', { position: createVec2(0, 100) }) // Left end
      points.set('point_3', { position: createVec2(100, 200) }) // Top end
      points.set('point_4', { position: createVec2(200, 100) }) // Right end

      const result = calculateCornerMiterPolygon(corner, walls, points)

      expect(result).not.toBeNull()
      expect(result!.points.length).toBeGreaterThan(0)

      // T-junction should have more complex polygon
      const polygon = result!.points
      expect(polygon.length).toBeGreaterThanOrEqual(3)
    })

    it('should handle walls with different thicknesses', () => {
      const corner = createTestCorner('point_1', 'wall_1', 'wall_2')

      const walls = new Map()
      walls.set('wall_1', createTestWall('wall_1', 'point_1', 'point_2', 200)) // Thin wall
      walls.set('wall_2', createTestWall('wall_2', 'point_1', 'point_3', 400)) // Thick wall

      const points = new Map()
      points.set('point_1', { position: createVec2(100, 100) })
      points.set('point_2', { position: createVec2(200, 100) })
      points.set('point_3', { position: createVec2(100, 200) })

      const result = calculateCornerMiterPolygon(corner, walls, points)

      expect(result).not.toBeNull()
      expect(result!.points.length).toBeGreaterThan(0)
    })

    it('should handle degenerate wall configurations gracefully', () => {
      // Create degenerate case that might cause calculation to fail
      const corner = createTestCorner('point_1', 'wall_1', 'wall_2')

      const walls = new Map()
      walls.set('wall_1', createTestWall('wall_1', 'point_1', 'point_1', 200)) // Degenerate wall (same start/end)
      walls.set('wall_2', createTestWall('wall_2', 'point_1', 'point_2', 200))

      const points = new Map()
      points.set('point_1', { position: createVec2(100, 100) })
      points.set('point_2', { position: createVec2(200, 100) })

      // Should not throw, but may return null for invalid configurations
      expect(() => calculateCornerMiterPolygon(corner, walls, points)).not.toThrow()
    })
  })

  describe('calculateCornerMiterPolygon', () => {
    it('should use proper miter calculation when possible', () => {
      const corner = createTestCorner('point_1', 'wall_1', 'wall_2')

      const walls = new Map()
      walls.set('wall_1', createTestWall('wall_1', 'point_1', 'point_2'))
      walls.set('wall_2', createTestWall('wall_2', 'point_1', 'point_3'))

      const points = new Map()
      points.set('point_1', { position: createVec2(100, 100) })
      points.set('point_2', { position: createVec2(200, 100) })
      points.set('point_3', { position: createVec2(100, 200) })

      const result = calculateCornerMiterPolygon(corner, walls, points)

      expect(result).not.toBeNull()
      expect(result!.points.length).toBeGreaterThan(0)
    })

    it('should handle invalid wall configurations', () => {
      const corner = createTestCorner('point_1', 'wall_1', 'wall_2')

      // Create invalid wall configuration that will cause miter calculation to fail
      const walls = new Map()
      walls.set('wall_1', createTestWall('wall_1', 'point_1', 'point_1', 0)) // Invalid wall
      walls.set('wall_2', createTestWall('wall_2', 'point_1', 'point_2', 0)) // Invalid wall

      const points = new Map()
      points.set('point_1', { position: createVec2(100, 100) })
      points.set('point_2', { position: createVec2(100, 100) }) // Same position

      const result = calculateCornerMiterPolygon(corner, walls, points)

      // Should return null for invalid configurations or use fallback shape
      expect(result === null || result.points.length >= 3).toBe(true)
    })
  })
})
