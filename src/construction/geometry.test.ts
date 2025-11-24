import { vec3 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import { IDENTITY, type Projection, type RotationProjection, createSvgTransform } from './geometry'

describe('createSvgTransform', () => {
  it('should create correct SVG transform string', () => {
    const transform = {
      position: vec3.fromValues(100, 200, 0),
      rotation: vec3.fromValues(0, 0, Math.PI / 4) // 45 degrees in radians
    }

    const mockProjection: Projection = pos => vec3.fromValues(pos[0], pos[1], pos[2])
    const mockRotationProjection: RotationProjection = rot => (rot[2] / Math.PI) * 180 // Convert Z rotation to degrees

    const result = createSvgTransform(transform, mockProjection, mockRotationProjection)

    expect(result).toMatch(/^translate\(100 200\) rotate\(45(\.\d+)?\)$/)
  })

  it('should handle IDENTITY transform', () => {
    const mockProjection: Projection = pos => vec3.fromValues(pos[0], pos[1], pos[2])
    const mockRotationProjection: RotationProjection = _rot => 0

    const result = createSvgTransform(IDENTITY, mockProjection, mockRotationProjection)

    expect(result).toBe(undefined)
  })

  it('should handle negative coordinates and rotation', () => {
    const transform = {
      position: vec3.fromValues(-50, -75, 10),
      rotation: vec3.fromValues(0, 0, -Math.PI / 2) // -90 degrees
    }

    const mockProjection: Projection = pos => vec3.fromValues(pos[0], pos[1], pos[2])
    const mockRotationProjection: RotationProjection = rot => (rot[2] / Math.PI) * 180

    const result = createSvgTransform(transform, mockProjection, mockRotationProjection)

    expect(result).toMatch(/^translate\(-50 -75\) rotate\(-90(\.\d+)?\)$/)
  })
})
