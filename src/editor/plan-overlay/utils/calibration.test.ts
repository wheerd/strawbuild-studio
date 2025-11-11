import { describe, expect, it } from 'vitest'

import { calculateMmPerPixel, calculatePixelDistance } from './calibration'

describe('calibration utils', () => {
  it('calculates pixel distance correctly', () => {
    const distance = calculatePixelDistance({ x: 0, y: 0 }, { x: 3, y: 4 })
    expect(distance).toBeCloseTo(5)
  })

  it('calculates mm per pixel scale', () => {
    const pixelDistance = Math.hypot(400, 0)
    const scale = calculateMmPerPixel(2000, pixelDistance)
    expect(scale).toBeCloseTo(5)
  })

  it('throws for zero real-world distance', () => {
    expect(() => calculateMmPerPixel(0, 100)).toThrow('Real-world distance must be greater than zero.')
  })

  it('throws for zero pixel distance', () => {
    expect(() => calculateMmPerPixel(1000, 0)).toThrow('Calibration points must be apart to calculate scale.')
  })
})
