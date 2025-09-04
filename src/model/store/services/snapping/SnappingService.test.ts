import { describe, it, expect, beforeEach } from 'vitest'
import { SnappingService } from './SnappingService'
import { createVec2, createLength } from '@/types/geometry'
import type { LineSegment2D } from '@/types/geometry'
import type { SnappingContext, SnapConfig } from './types'

describe('SnappingService', () => {
  let service: SnappingService

  beforeEach(() => {
    service = new SnappingService()
  })

  describe('Constructor and Configuration', () => {
    it('should create service with default config', () => {
      const defaultService = new SnappingService()
      expect(defaultService).toBeInstanceOf(SnappingService)
    })

    it('should create service with custom config', () => {
      const customConfig: Partial<SnapConfig> = {
        pointSnapDistance: createLength(300),
        lineSnapDistance: createLength(150),
        minDistance: createLength(75)
      }
      const customService = new SnappingService(customConfig)
      expect(customService).toBeInstanceOf(SnappingService)
    })
  })

  describe('Point Snapping', () => {
    it('should snap to nearby point within snap distance', () => {
      const point1 = createVec2(100, 100)
      const point2 = createVec2(300, 300)
      const context: SnappingContext = {
        snapPoints: [point1, point2]
      }

      // Target point close to point1 (within default 200mm snap distance)
      const target = createVec2(150, 120)
      const result = service.findSnapResult(target, context)

      expect(result).not.toBeNull()
      expect(result?.position).toEqual(point1)
    })

    it('should not snap to point outside snap distance', () => {
      const point1 = createVec2(100, 100)
      const context: SnappingContext = {
        snapPoints: [point1]
      }

      // Target point far from point1 (outside 200mm snap distance)
      const target = createVec2(500, 500)
      const result = service.findSnapResult(target, context)

      expect(result).toBeNull()
    })

    it('should snap to closest point when multiple points are nearby', () => {
      const point1 = createVec2(100, 100)
      const point2 = createVec2(150, 150)
      const context: SnappingContext = {
        snapPoints: [point1, point2]
      }

      // Target closer to point1
      const target = createVec2(120, 110)
      const result = service.findSnapResult(target, context)

      expect(result).not.toBeNull()
      expect(result?.position).toBe(point1)
    })
  })

  describe('Line Snapping', () => {
    it('should snap to horizontal line through point', () => {
      const point1 = createVec2(100, 100)
      const context: SnappingContext = {
        snapPoints: [point1]
      }

      // Target point near horizontal line through point1, but far enough from point to avoid point snapping
      const target = createVec2(400, 110) // 10mm away from horizontal line, 300+ from point
      const result = service.findSnapResult(target, context)

      expect(result).not.toBeNull()
      expect(result?.position[1]).toBe(100) // Should snap to y=100 (horizontal line)
      expect(result?.position[0]).toBe(400) // X should remain the same
      expect(result?.lines).toHaveLength(1)
    })

    it('should snap to vertical line through point', () => {
      const point1 = createVec2(100, 100)
      const context: SnappingContext = {
        snapPoints: [point1]
      }

      // Target point near vertical line through point1, but far enough from point to avoid point snapping
      const target = createVec2(110, 400) // 10mm away from vertical line, 300+ from point
      const result = service.findSnapResult(target, context)

      expect(result).not.toBeNull()
      expect(result?.position[0]).toBe(100) // Should snap to x=100 (vertical line)
      expect(result?.position[1]).toBe(400) // Y should remain the same
      expect(result?.lines).toHaveLength(1)
    })

    it('should not snap to line outside line snap distance', () => {
      const point1 = createVec2(100, 100)
      const context: SnappingContext = {
        snapPoints: [point1]
      }

      // Target point far from any line (outside 100mm line snap distance)
      const target = createVec2(250, 250)
      const result = service.findSnapResult(target, context)

      expect(result).toBeNull()
    })

    it('should snap to reference point lines when provided', () => {
      const context: SnappingContext = {
        snapPoints: [],
        referencePoint: createVec2(100, 100)
      }

      // Target near horizontal line through reference point
      const target = createVec2(200, 110)
      const result = service.findSnapResult(target, context)

      expect(result).not.toBeNull()
      expect(result?.position[1]).toBe(100)
      expect(result?.position[0]).toBe(200)
    })

    it('should respect minimum distance from reference point', () => {
      const context: SnappingContext = {
        snapPoints: [], // No points to avoid point snapping
        referencePoint: createVec2(100, 100)
      }

      // Target that would snap to horizontal line through reference point
      // but is too close (within 50mm default minDistance)
      const target = createVec2(130, 105) // 5mm from horizontal line, 31mm from reference point
      const result = service.findSnapResult(target, context)

      // Should not snap because projected position would be too close to reference point
      expect(result).toBeNull()
    })
  })

  describe('Line Segment Snapping', () => {
    it('should snap to extension line of wall segment', () => {
      const segment: LineSegment2D = {
        start: createVec2(100, 100),
        end: createVec2(200, 100)
      }
      const context: SnappingContext = {
        snapPoints: [],
        referenceLineSegments: [segment]
      }

      // Target on extension of horizontal wall
      const target = createVec2(300, 110)
      const result = service.findSnapResult(target, context)

      expect(result).not.toBeNull()
      expect(result?.position[1]).toBe(100) // Should snap to extension line
      expect(result?.position[0]).toBe(300) // X should remain
    })

    it('should snap to perpendicular line of wall segment', () => {
      const segment: LineSegment2D = {
        start: createVec2(100, 100),
        end: createVec2(200, 100)
      }
      const context: SnappingContext = {
        snapPoints: [],
        referenceLineSegments: [segment]
      }

      // Target near perpendicular line from wall start
      const target = createVec2(110, 200)
      const result = service.findSnapResult(target, context)

      expect(result).not.toBeNull()
      expect(result?.position[0]).toBe(100) // Should snap to perpendicular at start point
      expect(result?.position[1]).toBe(200)
    })
  })

  describe('Intersection Snapping', () => {
    it('should snap to intersection of two lines', () => {
      const point1 = createVec2(1000, 1000) // Creates horizontal and vertical lines
      const point2 = createVec2(2000, 2000) // Creates horizontal and vertical lines
      const context: SnappingContext = {
        snapPoints: [point1, point2]
      }

      // Target near intersection of vertical line through point1 and horizontal line through point2
      // Make sure it's closer to the intersection than to either individual point
      const target = createVec2(1005, 1995) // Close to intersection (1000, 2000)
      const result = service.findSnapResult(target, context)

      expect(result).not.toBeNull()
      expect(result?.lines?.length).toBe(2) // Should indicate intersection of two lines
      expect(result?.position[0]).toBe(1000) // Intersection x from point1's vertical line
      expect(result?.position[1]).toBe(2000) // Intersection y from point2's horizontal line
    })

    it('should prefer intersection over single line snap when both are available', () => {
      const point1 = createVec2(1000, 1000)
      const point2 = createVec2(2000, 2000)
      const context: SnappingContext = {
        snapPoints: [point1, point2]
      }

      // Target equidistant from single line and intersection
      const target = createVec2(1000, 1995)
      const result = service.findSnapResult(target, context)

      expect(result).not.toBeNull()
      expect(result?.lines?.length).toBe(2) // Should indicate intersection of two lines
      expect(result?.position[0]).toBe(1000)
      expect(result?.position[1]).toBe(2000)
    })
  })

  describe('Custom Configuration', () => {
    it('should use custom point snap distance', () => {
      const customService = new SnappingService({
        pointSnapDistance: createLength(10), // Very small snap distance
        lineSnapDistance: createLength(5) // Also very small line snap distance
      })

      const point1 = createVec2(100, 100)
      const context: SnappingContext = {
        snapPoints: [point1]
      }

      // Target outside both point and line snap distances
      const target = createVec2(200, 200) // Far from point and any lines
      const result = customService.findSnapResult(target, context)

      expect(result).toBeNull()
    })

    it('should use custom line snap distance', () => {
      const customService = new SnappingService({
        pointSnapDistance: createLength(10), // Very small point snap distance
        lineSnapDistance: createLength(5) // Very small line snap distance
      })

      const point1 = createVec2(100, 100)
      const context: SnappingContext = {
        snapPoints: [point1]
      }

      // Target far enough from point but within default line distance, outside custom line distance
      const target = createVec2(400, 130) // Far from point, 30mm from horizontal line
      const result = customService.findSnapResult(target, context)

      expect(result).toBeNull()
    })

    it('should use custom minimum distance', () => {
      const customService = new SnappingService({
        pointSnapDistance: createLength(10), // Very small point snap to avoid point snapping
        lineSnapDistance: createLength(50), // Enable line snapping
        minDistance: createLength(80) // Large minimum distance
      })

      const context: SnappingContext = {
        snapPoints: [], // No points - use reference point to create lines
        referencePoint: createVec2(100, 100)
      }

      // Target that would snap to horizontal line through reference point at (100, 100)
      // Projected position would be (150, 100), which is 50mm from reference point
      // Since minDistance is 80mm, this should be rejected
      const target = createVec2(150, 110) // 10mm from horizontal line, projected to (150, 100)
      const result = customService.findSnapResult(target, context)

      expect(result).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty points array', () => {
      const context: SnappingContext = {
        snapPoints: []
      }

      const target = createVec2(100, 100)
      const result = service.findSnapResult(target, context)

      expect(result).toBeNull()
    })

    it('should handle single point', () => {
      const point1 = createVec2(100, 100)
      const context: SnappingContext = {
        snapPoints: [point1]
      }

      const target = createVec2(120, 110)
      const result = service.findSnapResult(target, context)

      expect(result).not.toBeNull()
      expect(result?.position).toBe(point1)
    })

    it('should handle undefined reference point gracefully', () => {
      const point1 = createVec2(100, 100)
      const context: SnappingContext = {
        snapPoints: [point1],
        referencePoint: undefined
      }

      const target = createVec2(120, 110)
      const result = service.findSnapResult(target, context)

      expect(result).not.toBeNull()
    })

    it('should handle undefined reference line segments gracefully', () => {
      const point1 = createVec2(100, 100)
      const context: SnappingContext = {
        snapPoints: [point1],
        referenceLineSegments: undefined
      }

      const target = createVec2(120, 110)
      const result = service.findSnapResult(target, context)

      expect(result).not.toBeNull()
    })

    it('should handle empty reference line segments array', () => {
      const point1 = createVec2(100, 100)
      const context: SnappingContext = {
        snapPoints: [point1],
        referenceLineSegments: []
      }

      const target = createVec2(120, 110)
      const result = service.findSnapResult(target, context)

      expect(result).not.toBeNull()
    })
  })
})
