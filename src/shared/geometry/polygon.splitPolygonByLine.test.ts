import clipperWasmUrl from 'clipper2-wasm/dist/es/clipper2z.wasm?url'
import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, vi } from 'vitest'

import { ZERO_VEC2, newVec2, normVec2 } from '@/shared/geometry/2d'
import { ensureClipperModule } from '@/shared/geometry/clipperInstance'
import { type Polygon2D, calculatePolygonArea, splitPolygonByLine } from '@/shared/geometry/polygon'

vi.unmock('@/shared/geometry/clipperInstance')

describe('splitPolygonByLine', () => {
  beforeAll(async () => {
    const clipperPath = resolveBundledAssetPath(clipperWasmUrl)
    const clipperBinary = await fs.readFile(clipperPath)
    await ensureClipperModule({ wasmBinary: clipperBinary })
  })

  it('splits a rectangle vertically into two equal halves', () => {
    const rect: Polygon2D = {
      points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 50), newVec2(0, 50)]
    }

    const line = {
      point: newVec2(50, 0),
      direction: newVec2(0, 1)
    }

    const result = splitPolygonByLine(rect, line)

    expect(result).toHaveLength(2)

    // Find left and right sides
    const leftSide = result.find(s => s.side === 'left')
    const rightSide = result.find(s => s.side === 'right')

    expect(leftSide).toBeDefined()
    expect(rightSide).toBeDefined()

    // Both should have roughly equal area (half of original)
    const leftArea = calculatePolygonArea(leftSide!.polygon)
    const rightArea = calculatePolygonArea(rightSide!.polygon)
    const totalArea = calculatePolygonArea(rect)

    expect(leftArea + rightArea).toBeCloseTo(totalArea, 0)
    expect(leftArea).toBeCloseTo(rightArea, 0)
  })

  it('splits a rectangle horizontally', () => {
    const rect: Polygon2D = {
      points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 50), newVec2(0, 50)]
    }

    const line = {
      point: newVec2(0, 25),
      direction: newVec2(1, 0)
    }

    const result = splitPolygonByLine(rect, line)

    expect(result).toHaveLength(2)

    const leftSide = result.find(s => s.side === 'left')
    const rightSide = result.find(s => s.side === 'right')

    expect(leftSide).toBeDefined()
    expect(rightSide).toBeDefined()

    // Both should have roughly equal area
    const leftArea = calculatePolygonArea(leftSide!.polygon)
    const rightArea = calculatePolygonArea(rightSide!.polygon)

    expect(leftArea).toBeCloseTo(rightArea, 0)
  })

  it('splits a rectangle diagonally', () => {
    const rect: Polygon2D = {
      points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100), newVec2(0, 100)]
    }

    const line = {
      point: ZERO_VEC2,
      direction: normVec2(newVec2(1, 1))
    }

    const result = splitPolygonByLine(rect, line)

    expect(result).toHaveLength(2)

    // Both triangular sides should have equal area
    const leftSide = result.find(s => s.side === 'left')
    const rightSide = result.find(s => s.side === 'right')

    expect(leftSide).toBeDefined()
    expect(rightSide).toBeDefined()

    const leftArea = calculatePolygonArea(leftSide!.polygon)
    const rightArea = calculatePolygonArea(rightSide!.polygon)

    expect(leftArea).toBeCloseTo(rightArea, 0)
  })

  it('returns single polygon when line misses the polygon', () => {
    const rect: Polygon2D = {
      points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 50), newVec2(0, 50)]
    }

    const line = {
      point: newVec2(200, 0),
      direction: newVec2(0, 1)
    }

    const result = splitPolygonByLine(rect, line)

    // Polygon is entirely on one side
    expect(result).toHaveLength(1)
    expect(result[0].polygon.points).toHaveLength(4)

    const area = calculatePolygonArea(result[0].polygon)
    const originalArea = calculatePolygonArea(rect)
    expect(area).toBeCloseTo(originalArea, 0)
  })

  it('handles line touching polygon vertex', () => {
    const rect: Polygon2D = {
      points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 50), newVec2(0, 50)]
    }

    const line = {
      point: ZERO_VEC2,
      direction: newVec2(0, 1)
    }

    const result = splitPolygonByLine(rect, line)

    // Should return the original polygon on one side
    expect(result.length).toBeGreaterThanOrEqual(1)

    const totalResultArea = result.reduce((sum, s) => sum + calculatePolygonArea(s.polygon), 0)
    const originalArea = calculatePolygonArea(rect)
    expect(totalResultArea).toBeCloseTo(originalArea, 0)
  })

  it('splits an L-shaped polygon into multiple pieces', () => {
    // L-shaped polygon
    const lShape: Polygon2D = {
      points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 50), newVec2(50, 50), newVec2(50, 100), newVec2(0, 100)]
    }

    const line = {
      point: newVec2(50, -10),
      direction: newVec2(0, 1)
    }

    const result = splitPolygonByLine(lShape, line)

    // Should split into 2 sides
    expect(result.length).toBeGreaterThanOrEqual(1)

    // Total area should be preserved
    const totalResultArea = result.reduce((sum, s) => sum + calculatePolygonArea(s.polygon), 0)
    const originalArea = calculatePolygonArea(lShape)
    expect(totalResultArea).toBeCloseTo(originalArea, 0)
  })

  it('correctly tags left and right sides based on line direction', () => {
    const rect: Polygon2D = {
      points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 50), newVec2(0, 50)]
    }

    // Vertical line going upward (from y=0 to y=50)
    const line = {
      point: newVec2(50, 0),
      direction: newVec2(0, 1)
    }

    const result = splitPolygonByLine(rect, line)

    expect(result).toHaveLength(2)

    const leftSide = result.find(s => s.side === 'left')
    const rightSide = result.find(s => s.side === 'right')

    expect(leftSide).toBeDefined()
    expect(rightSide).toBeDefined()

    // For a vertical line going up, left should be on the left (negative X)
    // and right should be on the right (positive X)
    const leftCenterX = leftSide!.polygon.points.reduce((sum, p) => sum + p[0], 0) / leftSide!.polygon.points.length
    const rightCenterX = rightSide!.polygon.points.reduce((sum, p) => sum + p[0], 0) / rightSide!.polygon.points.length

    expect(leftCenterX).toBeLessThan(rightCenterX)
  })
})

function resolveBundledAssetPath(assetUrl: string): string {
  const normalized = assetUrl.startsWith('/') ? assetUrl.slice(1) : assetUrl
  return path.resolve(process.cwd(), normalized)
}
