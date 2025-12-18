import { describe, expect, it } from 'vitest'

import { newVec2 } from '@/shared/geometry'
import { type Polygon2D, calculatePolygonArea } from '@/shared/geometry'

import { splitPolygonAtIndices } from './helpers'

describe('splitPolygonAtIndices', () => {
  describe('simple rectangle splits', () => {
    it('should split a rectangle vertically into two equal parts', () => {
      // Rectangle from (0,0) to (100,100)
      const rectangle: Polygon2D = {
        points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100), newVec2(0, 100)]
      }

      // Split vertically at x=50
      // Cut from top edge (index 2) to bottom edge (index 0)
      const cutStart = newVec2(50, 100) // On edge from (100,100) to (0,100)
      const cutEnd = newVec2(50, 0) // On edge from (0,0) to (100,0)

      const [poly1, poly2] = splitPolygonAtIndices(rectangle, 2, 0, cutStart, cutEnd)

      // Check both polygons have 4 points (rectangles)
      expect(poly1.points.length).toBe(4)
      expect(poly2.points.length).toBe(4)

      // Check areas - should each be 50*100 = 5000
      const area1 = calculatePolygonArea(poly1)
      const area2 = calculatePolygonArea(poly2)
      const originalArea = calculatePolygonArea(rectangle)

      expect(area1).toBeCloseTo(5000, 0)
      expect(area2).toBeCloseTo(5000, 0)
      expect(area1 + area2).toBeCloseTo(originalArea, 0)
    })

    it('should split a rectangle horizontally into two equal parts', () => {
      // Rectangle from (0,0) to (100,100)
      const rectangle: Polygon2D = {
        points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100), newVec2(0, 100)]
      }

      // Split horizontally at y=50
      // Cut from right edge (index 1) to left edge (index 3)
      const cutStart = newVec2(100, 50) // On edge from (100,0) to (100,100)
      const cutEnd = newVec2(0, 50) // On edge from (0,100) to (0,0)

      const [poly1, poly2] = splitPolygonAtIndices(rectangle, 1, 3, cutStart, cutEnd)

      // Check both polygons have 4 points
      expect(poly1.points.length).toBe(4)
      expect(poly2.points.length).toBe(4)

      // Check areas - should each be 100*50 = 5000
      const area1 = calculatePolygonArea(poly1)
      const area2 = calculatePolygonArea(poly2)
      const originalArea = calculatePolygonArea(rectangle)

      expect(area1).toBeCloseTo(5000, 0)
      expect(area2).toBeCloseTo(5000, 0)
      expect(area1 + area2).toBeCloseTo(originalArea, 0)
    })
  })

  describe('L-shape split', () => {
    it('should split L-shape into two rectangles', () => {
      // L-shaped polygon (clockwise)
      //  ┌─────┐
      //  │     │
      //  │  ┌──┘
      //  │  │
      //  └──┘
      const lShape: Polygon2D = {
        points: [newVec2(0, 0), newVec2(50, 0), newVec2(50, 50), newVec2(100, 50), newVec2(100, 100), newVec2(0, 100)]
      }

      // Split along vertical line at x=50, from (50,50) to (50,100)
      // This separates the left rectangle from the top-right rectangle
      // cutStart is on edge from points[2]=(50,50) to points[3]=(100,50) - but at the vertex
      // cutEnd is on edge from points[4]=(100,100) to points[5]=(0,100)
      const cutStart = newVec2(50, 50) // On edge index 2, at the starting vertex
      const cutEnd = newVec2(50, 100) // On edge from points[4] to points[5]

      const [poly1, poly2] = splitPolygonAtIndices(lShape, 2, 4, cutStart, cutEnd)

      const area1 = calculatePolygonArea(poly1)
      const area2 = calculatePolygonArea(poly2)
      const originalArea = calculatePolygonArea(lShape)

      // Original area should be 50*100 + 50*50 = 5000 + 2500 = 7500
      expect(originalArea).toBeCloseTo(7500, 0)

      // Both parts should sum to original
      expect(area1 + area2).toBeCloseTo(originalArea, 0)

      // Each polygon should have at least 3 points
      expect(poly1.points.length).toBeGreaterThanOrEqual(3)
      expect(poly2.points.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('edge cases', () => {
    it('should handle cut points that coincide with vertices', () => {
      // Rectangle
      const rectangle: Polygon2D = {
        points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100), newVec2(0, 100)]
      }

      // Cut where both points are exactly at vertices
      const cutStart = newVec2(100, 100) // Exactly at point index 2
      const cutEnd = newVec2(0, 0) // Exactly at point index 0

      const [poly1, poly2] = splitPolygonAtIndices(rectangle, 2, 0, cutStart, cutEnd)

      const area1 = calculatePolygonArea(poly1)
      const area2 = calculatePolygonArea(poly2)
      const originalArea = calculatePolygonArea(rectangle)

      // Should still preserve area
      expect(area1 + area2).toBeCloseTo(originalArea, 0)

      // Should create valid triangles
      expect(poly1.points.length).toBe(3)
      expect(poly2.points.length).toBe(3)
    })
  })
})
