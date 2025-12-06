import { vec2 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import { Bounds2D, type Polygon2D, calculatePolygonArea } from '@/shared/geometry'

import { partitionByAlignedEdges } from './helpers'

function svgVisualisation(shape: Polygon2D, results: Polygon2D[]) {
  function polygonToSvgPath(polygon: Polygon2D) {
    return `M${polygon.points.map(([px, py]) => `${px},${py}`).join(' L')} Z`
  }

  const bounds = Bounds2D.fromPoints(shape.points).pad(10)
  const colors = ['red', 'green', 'blue', 'yellow', 'orange', 'violet']

  const srcPath = `<path d="${polygonToSvgPath(shape)}" stroke="black" fill="none" />`
  const resultPaths = results.map((r, i) => `<path d="${polygonToSvgPath(r)}" stroke="none" fill="${colors[i]}" />`)
  const svg = `<svg
    xmlns="http://www.w3.org/2000/svg" height="500" viewBox="${bounds.min[0]} ${bounds.min[1]} ${bounds.size[0]} ${bounds.size[1]}"
    style="background: white;">
    ${srcPath}
    ${resultPaths.join('\n')}
  </svg>`
  return svg
}

// Helper function to check if a point is inside a polygon (simple ray casting)
// Returns true only if the point is strictly inside (not on the boundary)
function isPointStrictlyInPolygon(point: vec2, polygon: Polygon2D, epsilon = 1e-6): boolean {
  const points = polygon.points
  const n = points.length

  // First check if point is on any edge
  for (let i = 0; i < n; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % n]

    // Check if point is on the line segment
    const d1 = vec2.distance(point, p1)
    const d2 = vec2.distance(point, p2)
    const edgeLength = vec2.distance(p1, p2)

    if (Math.abs(d1 + d2 - edgeLength) < epsilon) {
      return false // Point is on the edge, not strictly inside
    }
  }

  // Now do ray casting to check if inside
  let inside = false

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = points[i][0]
    const yi = points[i][1]
    const xj = points[j][0]
    const yj = points[j][1]

    const intersect = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }

  return inside
}

// Helper function to check if two polygons have overlapping area (not just shared edges)
function polygonsOverlap(poly1: Polygon2D, poly2: Polygon2D): boolean {
  // Check if any vertex of poly1 is strictly inside poly2
  for (const point of poly1.points) {
    if (isPointStrictlyInPolygon(point, poly2)) {
      return true
    }
  }

  // Check if any vertex of poly2 is strictly inside poly1
  for (const point of poly2.points) {
    if (isPointStrictlyInPolygon(point, poly1)) {
      return true
    }
  }

  return false
}

// Helper function to verify partitioning results
function verifyPartitioning(original: Polygon2D, partitions: Polygon2D[], expectedCount: number, description: string) {
  // Check count
  expect(partitions, `${description}: Expected ${expectedCount} partitions`).toHaveLength(expectedCount)

  // Check area sum
  const originalArea = calculatePolygonArea(original)
  const partitionsArea = partitions.reduce((sum, p) => sum + calculatePolygonArea(p), 0)
  expect(Math.abs(originalArea - partitionsArea), `${description}: Area should be preserved`).toBeLessThan(1e-6)

  // Check no overlaps
  for (let i = 0; i < partitions.length; i++) {
    for (let j = i + 1; j < partitions.length; j++) {
      expect(
        polygonsOverlap(partitions[i], partitions[j]),
        `${description}: Partitions ${i} and ${j} should not overlap`
      ).toBe(false)
    }
  }

  // Each partition should have at least 3 points
  partitions.forEach((p, i) => {
    expect(p.points.length, `${description}: Partition ${i} should have at least 3 points`).toBeGreaterThanOrEqual(3)
  })
}

describe('partitionByAlignedEdges', () => {
  describe('optimization: small polygons', () => {
    it('should return triangle unchanged (< 4 points)', () => {
      const triangle: Polygon2D = {
        points: [vec2.fromValues(0, 0), vec2.fromValues(100, 0), vec2.fromValues(50, 100)]
      }

      const result = Array.from(partitionByAlignedEdges(triangle, vec2.fromValues(1, 0)))

      verifyPartitioning(triangle, result, 1, 'Triangle')
      expect(result[0]).toEqual(triangle)
    })
  })

  describe('rectangle (no splits)', () => {
    it('should return rectangle unchanged when no aligned edges', () => {
      const rectangle: Polygon2D = {
        points: [vec2.fromValues(0, 0), vec2.fromValues(100, 0), vec2.fromValues(100, 50), vec2.fromValues(0, 50)]
      }

      const result = Array.from(partitionByAlignedEdges(rectangle, vec2.fromValues(1, 0)))

      verifyPartitioning(rectangle, result, 1, 'Rectangle (no splits)')
    })
  })

  describe('L-shape', () => {
    // L-shaped polygon
    //  ┌─────┐
    //  │     │
    //  │  ┌──┘
    //  │  │
    //  └──┘
    const lShape: Polygon2D = {
      points: [
        vec2.fromValues(0, 0),
        vec2.fromValues(50, 0),
        vec2.fromValues(50, 50),
        vec2.fromValues(100, 50),
        vec2.fromValues(100, 100),
        vec2.fromValues(0, 100)
      ]
    }

    it('should split L-shape horizontally into 2 polygons', async () => {
      const result = Array.from(partitionByAlignedEdges(lShape, vec2.fromValues(1, 0)))

      await expect(svgVisualisation(lShape, result)).toMatchFileSnapshot('./__snapshots__/lShape.horizontal.svg')
      verifyPartitioning(lShape, result, 2, 'L-shape (horizontal)')
    })

    it('should split L-shape vertically into 2 polygons', async () => {
      const result = Array.from(partitionByAlignedEdges(lShape, vec2.fromValues(0, 1)))

      await expect(svgVisualisation(lShape, result)).toMatchFileSnapshot('./__snapshots__/lShape.vertical.svg')
      verifyPartitioning(lShape, result, 2, 'L-shape (vertical)')
    })
  })

  describe('U-shape', () => {
    // U-shaped polygon (clockwise winding)
    //  ┌──┐  ┌──┐
    //  │  │  │  │
    //  │  └──┘  │
    //  │        │
    //  └────────┘
    const uShape: Polygon2D = {
      points: [
        vec2.fromValues(0, 100),
        vec2.fromValues(100, 100),
        vec2.fromValues(100, 0),
        vec2.fromValues(60, 0),
        vec2.fromValues(60, 50),
        vec2.fromValues(40, 50),
        vec2.fromValues(40, 0),
        vec2.fromValues(0, 0)
      ]
    }
    it('should partition U-shape horizontally', async () => {
      const result = Array.from(partitionByAlignedEdges(uShape, vec2.fromValues(1, 0)))

      await expect(svgVisualisation(uShape, result)).toMatchFileSnapshot('./__snapshots__/uShape.horizontal.svg')
      verifyPartitioning(uShape, result, 3, 'U-shape (horizontal)')
    })

    it('should partition U-shape vertically', async () => {
      const result = Array.from(partitionByAlignedEdges(uShape, vec2.fromValues(0, 1)))

      await expect(svgVisualisation(uShape, result)).toMatchFileSnapshot('./__snapshots__/uShape.vertical.svg')
      verifyPartitioning(uShape, result, 3, 'U-shape (vertical)')
    })
  })

  describe('T-shape', () => {
    // T-shaped polygon (clockwise winding)
    //  ┌────────┐
    //  │        │
    //  └──┐  ┌──┘
    //     │  │
    //     └──┘
    const tShape: Polygon2D = {
      points: [
        vec2.fromValues(40, 0),
        vec2.fromValues(60, 0),
        vec2.fromValues(60, 50),
        vec2.fromValues(100, 50),
        vec2.fromValues(100, 100),
        vec2.fromValues(0, 100),
        vec2.fromValues(0, 50),
        vec2.fromValues(40, 50)
      ]
    }

    it('should split T-shape horizontally into multiple polygons', async () => {
      const result = Array.from(partitionByAlignedEdges(tShape, vec2.fromValues(1, 0)))

      await expect(svgVisualisation(tShape, result)).toMatchFileSnapshot('./__snapshots__/tShape.horizontal.svg')
      verifyPartitioning(tShape, result, 2, 'T-shape (horizontal)')
    })

    it('should split T-shape vertically into multiple polygons', async () => {
      const result = Array.from(partitionByAlignedEdges(tShape, vec2.fromValues(0, 1)))

      await expect(svgVisualisation(tShape, result)).toMatchFileSnapshot('./__snapshots__/tShape.vertical.svg')
      verifyPartitioning(tShape, result, 3, 'T-shape (vertical)')
    })
  })

  describe('E-shape', () => {
    // E-shaped polygon (clockwise winding)
    //  ┌──────────┐
    //  │          │
    //  │   ┌──────┘
    //  │   │
    //  │   └─────┐
    //  │         │
    //  │      ┌──┘
    //  │      │
    //  │      └───┐
    //  │          │
    //  └──────────┘
    const eShape: Polygon2D = {
      points: [
        vec2.fromValues(0, 0),
        vec2.fromValues(100, 0),
        vec2.fromValues(100, 10),
        vec2.fromValues(30, 10),
        vec2.fromValues(30, 25),
        vec2.fromValues(90, 25),
        vec2.fromValues(90, 50),
        vec2.fromValues(60, 50),
        vec2.fromValues(60, 80),
        vec2.fromValues(100, 80),
        vec2.fromValues(100, 100),
        vec2.fromValues(0, 100)
      ]
    }

    it('should split E-shape horizontally into multiple polygons', async () => {
      //  ┌────────┐
      //  │        │
      //  │──┌─────┘
      //  │  │
      //  │──└─────┐
      //  │        │
      //  │────┌───┘
      //  │    │
      //  │────└───┐
      //  │        │
      //  └────────┘
      const result = Array.from(partitionByAlignedEdges(eShape, vec2.fromValues(1, 0)))

      await expect(svgVisualisation(eShape, result)).toMatchFileSnapshot('./__snapshots__/eShape.horizontal.svg')
      verifyPartitioning(eShape, result, 5, 'E-shape (horizontal)')
    })

    it('should split E-shape vertically into multiple polygons', async () => {
      //  ┌───┬──────┐
      //  │   │      │
      //  │   ├──────┘
      //  │   │
      //  │   ├──┬──┐
      //  │   │  │  │
      //  │   │  ├──┘
      //  │   │  │
      //  │   │  ├───┐
      //  │   │  │   │
      //  └───┴──┴───┘
      const result = Array.from(partitionByAlignedEdges(eShape, vec2.fromValues(0, 1)))

      await expect(svgVisualisation(eShape, result)).toMatchFileSnapshot('./__snapshots__/eShape.vertical.svg')
      verifyPartitioning(eShape, result, 5, 'E-shape (vertical)')
    })
  })
})
