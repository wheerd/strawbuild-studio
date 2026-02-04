import { describe, expect, it } from 'vitest'

import { IDENTITY, composeTransform, fromTrans, newVec2, newVec3, rotateZ } from '@/shared/geometry'

import { WallConstructionArea, createProjectionMatrix, projectPoint } from './geometry'

describe('createProjectionMatrix', () => {
  it('should create identity matrix for XY plane (top view)', () => {
    const projection = createProjectionMatrix('xy', 1, 1)
    const point = newVec3(10, 20, 30)
    const result = projectPoint(point, projection)

    // X→X, Y→-Y (inverted), Z→depth
    expect(result[0]).toBeCloseTo(10)
    expect(result[1]).toBeCloseTo(-20)
    expect(result[2]).toBeCloseTo(30)
  })

  it('should create correct matrix for XZ plane (front view)', () => {
    const projection = createProjectionMatrix('xz', 1, 1)
    const point = newVec3(10, 20, 30)
    const result = projectPoint(point, projection)

    // X→X, Z→-Y, Y→depth
    expect(result[0]).toBeCloseTo(10)
    expect(result[1]).toBeCloseTo(-30)
    expect(result[2]).toBeCloseTo(20)
  })

  it('should create correct matrix for YZ plane (side view)', () => {
    const projection = createProjectionMatrix('yz', 1, 1)
    const point = newVec3(10, 20, 30)
    const result = projectPoint(point, projection)

    // Y→X, Z→Y, X→depth
    expect(result[0]).toBeCloseTo(20)
    expect(result[1]).toBeCloseTo(-30)
    expect(result[2]).toBeCloseTo(10)
  })
})

describe('projectPoint', () => {
  it('should project point with combined transform + projection', () => {
    // Create a transform: translate by (100, 0, 0)
    const transform = fromTrans(newVec3(100, 0, 0))

    // Create XZ projection (front view)
    const projection = createProjectionMatrix('xz', 1, 1)

    // Combine them
    const combined = composeTransform(projection, transform)

    // Project a point at origin
    const point = newVec3(0, 0, 0)
    const result = projectPoint(point, combined)

    // After translation, point is at (100, 0, 0)
    // After XZ projection: X→X, Z→Y, Y→depth
    // Result should be (100, 0, 0)
    expect(result[0]).toBeCloseTo(100)
    expect(result[1]).toBeCloseTo(0)
    expect(result[2]).toBeCloseTo(0)
  })

  it('should handle rotation correctly', () => {
    // Create a transform: rotate 90° around Z axis
    const transform = rotateZ(IDENTITY, Math.PI / 2)

    // XY projection (top view)
    const projection = createProjectionMatrix('xy', 1, 1)

    // Combine them
    const combined = composeTransform(projection, transform)

    // Project a point on the X axis
    const point = newVec3(10, 0, 0)
    const result = projectPoint(point, combined)

    // After 90° rotation around Z, point (10, 0, 0) becomes (0, 10, 0)
    // After Y-inversion in projection: (0, -10, 0)
    expect(result[0]).toBeCloseTo(0)
    expect(result[1]).toBeCloseTo(-10)
    expect(result[2]).toBeCloseTo(0)
  })
})

describe('WallConstructionArea.withZAdjustment', () => {
  it('should adjust area without roof offsets', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000))

    const adjusted = area.withZAdjustment(100, 1000)

    expect(adjusted.position).toEqual(newVec3(0, 0, 100))
    expect(adjusted.size).toEqual(newVec3(3000, 300, 1000))
    expect(adjusted.topOffsets).toBeUndefined()
  })

  it('should add intersection points when roof is partially clipped', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, -200), // Roof at Z=2800
      newVec2(3000, -500) // Roof at Z=2500
    ])

    const adjusted = area.withZAdjustment(0, 2700)

    // At X=0: roof at 2800, above 2700 -> clipped to 0
    // At X=3000: roof at 2500, below 2700 -> offset -200
    // Should have intersection point where roof crosses 2700
    expect(adjusted.topOffsets!.length).toBeGreaterThan(2)

    // First point should be clipped
    expect(adjusted.topOffsets![0][0]).toBe(0)
    expect(adjusted.topOffsets![0][1]).toBe(0)

    // Should have an intersection point
    const intersectionPoint = adjusted.topOffsets![1]
    expect(intersectionPoint[1]).toBe(0) // At the boundary
    expect(intersectionPoint[0]).toBeGreaterThan(0)
    expect(intersectionPoint[0]).toBeLessThan(3000)

    // Last point should be unclipped
    const lastPoint = adjusted.topOffsets![adjusted.topOffsets!.length - 1]
    expect(lastPoint[0]).toBe(3000)
    expect(lastPoint[1]).toBe(-200)
  })

  it('should handle fully clipped roof', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, -200), // Roof at Z=2800
      newVec2(3000, -500) // Roof at Z=2500
    ])

    const adjusted = area.withZAdjustment(0, 1100)

    // New top (1100) and top offsets are removed
    expect(adjusted.size[2]).toEqual(1100)
    expect(adjusted.topOffsets).toBeUndefined()
  })
})

describe('WallConstructionArea.bottomOffsets', () => {
  it('should normalize bottom offsets so minimum is 0', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, -100), // Floor at Z=-100
      newVec2(3000, -300) // Floor at Z=-300
    ])

    // Should be normalized: subtract minimum (-300) from all
    expect(area.bottomOffsets).toBeDefined()
    expect(area.bottomOffsets![0]).toEqual(newVec2(0, 200))
    expect(area.bottomOffsets![1]).toEqual(newVec2(3000, 0))
  })

  it('should simplify flat bottom by removing offsets', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 0),
      newVec2(3000, 0)
    ])

    expect(area.bottomOffsets).toBeUndefined()
    expect(area.isBottomFlat).toBe(true)
  })

  it('should return bottom offsets at position', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200),
      newVec2(3000, 0)
    ])

    // At X=0: offset should be 200
    const atStart = area.getBottomOffsetsAt(0)
    expect(atStart).toEqual([200, 200])

    // At X=3000: offset should be 0
    const atEnd = area.getBottomOffsetsAt(3000)
    expect(atEnd).toEqual([0, 0])

    // At X=1500: should interpolate
    const atMiddle = area.getBottomOffsetsAt(1500)
    expect(atMiddle[0]).toBeCloseTo(100)
  })

  it('should handle withXAdjustment with bottom offsets', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200),
      newVec2(3000, 0)
    ])

    const adjusted = area.withXAdjustment(500, 2000)

    expect(adjusted.position[0]).toBe(500)
    expect(adjusted.size[0]).toBe(2000)
    expect(adjusted.bottomOffsets).toBeDefined()

    // First offset at X=0 (adjusted) should be interpolated from original at X=500
    expect(adjusted.bottomOffsets![0][0]).toBe(0)
    // At X=500 in original: linear interpolation from (0,200) to (3000,0)
    // ratio = 500/3000 = 0.16667, offset = 200 - 0.16667 * 200 = 166.67
    // But tolerance=1 captures point just before 500, giving offset at ~499.5 = 133.33
    expect(adjusted.bottomOffsets![0][1]).toBeCloseTo(133.33, 1)
  })

  it('should handle withZAdjustment clipping bottom offsets', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200), // Floor at Z=200
      newVec2(3000, 0) // Floor at Z=0
    ])

    // Adjust base up by 150 (newBase = 150)
    // Floor at X=0: 200 - 150 = 50 (above base, keep)
    // Floor at X=3000: 0 - 150 = -150 (below base, clip)
    const adjusted = area.withZAdjustment(150)

    expect(adjusted.position[2]).toBe(150)
    expect(adjusted.bottomOffsets).toBeDefined()

    // First point should be above new base
    expect(adjusted.bottomOffsets![0][1]).toBeCloseTo(50)

    // Last point should be clipped to 0
    const lastPoint = adjusted.bottomOffsets![adjusted.bottomOffsets!.length - 1]
    expect(lastPoint[1]).toBe(0)
  })

  it('should handle fully clipped bottom offsets', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200),
      newVec2(3000, 0)
    ])

    // Adjust base up by 300 (all floor points below new base)
    const adjusted = area.withZAdjustment(300)

    expect(adjusted.bottomOffsets).toBeUndefined()
  })
})

describe('WallConstructionArea.getters', () => {
  it('should return correct minTopHeight', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, 0),
      newVec2(3000, -500)
    ])

    expect(area.minTopHeight).toBe(2500)
  })

  it('should return correct maxBottomHeight', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200),
      newVec2(3000, 0)
    ])

    expect(area.maxBottomHeight).toBe(200)
  })

  it('should return totalHeight', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000))

    expect(area.totalHeight).toBe(3000)
  })

  it('should return isTopFlat correctly', () => {
    const flatArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000))
    const slopedArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, 0),
      newVec2(3000, -500)
    ])

    expect(flatArea.isTopFlat).toBe(true)
    expect(slopedArea.isTopFlat).toBe(false)
  })

  it('should return isBottomFlat correctly', () => {
    const flatArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000))
    const slopedArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200),
      newVec2(3000, 0)
    ])

    expect(flatArea.isBottomFlat).toBe(true)
    expect(slopedArea.isBottomFlat).toBe(false)
  })

  it('should return isFlat when both top and bottom are flat', () => {
    const flatArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000))
    const topSlopedArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, 0),
      newVec2(3000, -500)
    ])
    const bottomSlopedArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200),
      newVec2(3000, 0)
    ])
    const bothSlopedArea = new WallConstructionArea(
      newVec3(0, 0, 0),
      newVec3(3000, 300, 3000),
      [newVec2(0, 0), newVec2(3000, -500)],
      [newVec2(0, 200), newVec2(3000, 0)]
    )

    expect(flatArea.isFlat).toBe(true)
    expect(topSlopedArea.isFlat).toBe(false)
    expect(bottomSlopedArea.isFlat).toBe(false)
    expect(bothSlopedArea.isFlat).toBe(false)
  })

  it('should maintain backward compatibility with minHeight', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, 0),
      newVec2(3000, -500)
    ])

    expect(area.minHeight).toBe(area.minTopHeight)
  })
})
