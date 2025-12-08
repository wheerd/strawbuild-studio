import { mat4, vec2, vec3 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import { WallConstructionArea, createProjectionMatrix, projectPoint } from './geometry'

describe('createProjectionMatrix', () => {
  it('should create identity matrix for XY plane (top view)', () => {
    const projection = createProjectionMatrix('xy')
    const point = vec3.fromValues(10, 20, 30)
    const result = projectPoint(point, projection)

    // X→X, Y→Y, Z→depth
    expect(result[0]).toBeCloseTo(10)
    expect(result[1]).toBeCloseTo(20)
    expect(result[2]).toBeCloseTo(30)
  })

  it('should create correct matrix for XZ plane (front view)', () => {
    const projection = createProjectionMatrix('xz')
    const point = vec3.fromValues(10, 20, 30)
    const result = projectPoint(point, projection)

    // X→X, Z→Y, Y→depth
    expect(result[0]).toBeCloseTo(10)
    expect(result[1]).toBeCloseTo(30)
    expect(result[2]).toBeCloseTo(20)
  })

  it('should create correct matrix for YZ plane (side view)', () => {
    const projection = createProjectionMatrix('yz')
    const point = vec3.fromValues(10, 20, 30)
    const result = projectPoint(point, projection)

    // Y→X, Z→Y, X→depth
    expect(result[0]).toBeCloseTo(20)
    expect(result[1]).toBeCloseTo(30)
    expect(result[2]).toBeCloseTo(10)
  })
})

describe('projectPoint', () => {
  it('should project point with combined transform + projection', () => {
    // Create a transform: translate by (100, 0, 0)
    const transform = mat4.fromTranslation(mat4.create(), vec3.fromValues(100, 0, 0))

    // Create XZ projection (front view)
    const projection = createProjectionMatrix('xz')

    // Combine them
    const combined = mat4.multiply(mat4.create(), projection, transform)

    // Project a point at origin
    const point = vec3.fromValues(0, 0, 0)
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
    const transform = mat4.fromZRotation(mat4.create(), Math.PI / 2)

    // XY projection (top view)
    const projection = createProjectionMatrix('xy')

    // Combine them
    const combined = mat4.multiply(mat4.create(), projection, transform)

    // Project a point on the X axis
    const point = vec3.fromValues(10, 0, 0)
    const result = projectPoint(point, combined)

    // After 90° rotation around Z, point (10, 0, 0) becomes (0, 10, 0)
    expect(result[0]).toBeCloseTo(0)
    expect(result[1]).toBeCloseTo(10)
    expect(result[2]).toBeCloseTo(0)
  })
})

describe('WallConstructionArea.withZAdjustment', () => {
  it('should adjust area without roof offsets', () => {
    const area = new WallConstructionArea(vec3.fromValues(0, 0, 0), vec3.fromValues(3000, 300, 3000))

    const adjusted = area.withZAdjustment(100, 1000)

    expect(adjusted.position).toEqual(vec3.fromValues(0, 0, 100))
    expect(adjusted.size).toEqual(vec3.fromValues(3000, 300, 1000))
    expect(adjusted.topOffsets).toBeUndefined()
  })

  it('should add intersection points when roof is partially clipped', () => {
    const area = new WallConstructionArea(vec3.fromValues(0, 0, 0), vec3.fromValues(3000, 300, 3000), [
      vec2.fromValues(0, -200), // Roof at Z=2800
      vec2.fromValues(3000, -500) // Roof at Z=2500
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
    const area = new WallConstructionArea(vec3.fromValues(0, 0, 0), vec3.fromValues(3000, 300, 3000), [
      vec2.fromValues(0, -200), // Roof at Z=2800
      vec2.fromValues(3000, -500) // Roof at Z=2500
    ])

    const adjusted = area.withZAdjustment(0, 1100)

    // New top (1100) and top offsets are removed
    expect(adjusted.size[2]).toEqual(1100)
    expect(adjusted.topOffsets).toBeUndefined()
  })
})
