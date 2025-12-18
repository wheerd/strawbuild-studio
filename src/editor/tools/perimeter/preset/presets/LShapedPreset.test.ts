import { beforeEach, describe, expect, it } from 'vitest'

import { createWallAssemblyId } from '@/building/model/ids'
import { LShape0Icon } from '@/editor/tools/perimeter/preset/presets/Icons'
import { LShapedPresetDialog } from '@/editor/tools/perimeter/preset/presets/LShapedPresetDialog'
import { newVec2 } from '@/shared/geometry'

import { LShapedPreset } from './LShapedPreset'
import type { LShapedPresetConfig } from './types'

describe('LShapedPreset', () => {
  let preset: LShapedPreset

  beforeEach(() => {
    preset = new LShapedPreset()
  })

  const createValidConfig = (overrides: Partial<LShapedPresetConfig> = {}): LShapedPresetConfig => ({
    width1: 8000,
    length1: 6000,
    width2: 4000,
    length2: 3000,
    rotation: 0,
    thickness: 420,
    wallAssemblyId: createWallAssemblyId(),
    referenceSide: 'inside',
    ...overrides
  })

  describe('basic properties', () => {
    it('should have correct type and name', () => {
      expect(preset.type).toBe('l-shaped')
      expect(preset.name).toBe('L-Shaped')
      expect(preset.icon).toBe(LShape0Icon)
      expect(preset.dialog).toBe(LShapedPresetDialog)
    })
  })

  describe('validateConfig', () => {
    it('should validate a correct configuration', () => {
      const config = createValidConfig()
      expect(preset.validateConfig(config)).toBe(true)
    })

    it('should reject negative dimensions', () => {
      expect(preset.validateConfig(createValidConfig({ width1: -1000 }))).toBe(false)
      expect(preset.validateConfig(createValidConfig({ length1: -1000 }))).toBe(false)
      expect(preset.validateConfig(createValidConfig({ width2: -1000 }))).toBe(false)
      expect(preset.validateConfig(createValidConfig({ length2: -1000 }))).toBe(false)
    })

    it('should reject zero dimensions', () => {
      expect(preset.validateConfig(createValidConfig({ width1: 0 }))).toBe(false)
      expect(preset.validateConfig(createValidConfig({ length1: 0 }))).toBe(false)
      expect(preset.validateConfig(createValidConfig({ width2: 0 }))).toBe(false)
      expect(preset.validateConfig(createValidConfig({ length2: 0 }))).toBe(false)
    })

    it('should reject extension larger than main rectangle', () => {
      expect(
        preset.validateConfig(
          createValidConfig({
            width1: 4000,
            width2: 5000
          })
        )
      ).toBe(false)

      expect(
        preset.validateConfig(
          createValidConfig({
            length1: 3000,
            length2: 4000
          })
        )
      ).toBe(false)
    })

    it('should reject invalid rotation values', () => {
      expect(preset.validateConfig(createValidConfig({ rotation: 45 as any }))).toBe(false)
      expect(preset.validateConfig(createValidConfig({ rotation: -90 as any }))).toBe(false)
      expect(preset.validateConfig(createValidConfig({ rotation: 360 as any }))).toBe(false)
    })

    it('should accept valid rotation values', () => {
      expect(preset.validateConfig(createValidConfig({ rotation: 0 }))).toBe(true)
      expect(preset.validateConfig(createValidConfig({ rotation: 90 }))).toBe(true)
      expect(preset.validateConfig(createValidConfig({ rotation: 180 }))).toBe(true)
      expect(preset.validateConfig(createValidConfig({ rotation: 270 }))).toBe(true)
    })

    it('should reject negative thickness', () => {
      expect(preset.validateConfig(createValidConfig({ thickness: -100 }))).toBe(false)
    })

    it('should reject empty assembly', () => {
      expect(preset.validateConfig(createValidConfig({ wallAssemblyId: '' as any }))).toBe(false)
    })

    it('should reject outside reference when thickness exceeds dimensions', () => {
      expect(
        preset.validateConfig(
          createValidConfig({ referenceSide: 'outside', width1: 500, length1: 500, thickness: 400 })
        )
      ).toBe(false)
    })
  })

  describe('getPolygonPoints', () => {
    it('should generate 6 points for L-shape at 0° rotation', () => {
      const config = createValidConfig()
      const points = preset.getPolygonPoints(config)

      expect(points).toHaveLength(6)

      // Check that points form a valid L-shape (no duplicate points)
      const uniquePoints = new Set(points.map(p => `${p[0]},${p[1]}`))
      expect(uniquePoints.size).toBe(6)
    })

    it('should generate correct points for 0° rotation', () => {
      const config = createValidConfig({
        width1: 8000,
        length1: 6000,
        width2: 4000,
        length2: 3000,
        rotation: 0
      })

      const points = preset.getPolygonPoints(config)

      // Expected points for L-shape centered at origin
      const expected = [
        newVec2(-4000, -3000), // Bottom-left of main rectangle
        newVec2(4000, -3000), // Bottom-right of main rectangle
        newVec2(4000, 0), // Inner corner (right side)
        newVec2(0, 0), // Inner corner (top side)
        newVec2(0, 3000), // Top-right of extension
        newVec2(-4000, 3000) // Top-left of main rectangle
      ]

      points.forEach((point, index) => {
        expect(point[0]).toBeCloseTo(expected[index][0], 0)
        expect(point[1]).toBeCloseTo(expected[index][1], 0)
      })
    })

    it('should apply rotation correctly', () => {
      const config = createValidConfig({ rotation: 90 })
      const points0 = preset.getPolygonPoints(createValidConfig({ rotation: 0 }))
      const points90 = preset.getPolygonPoints(config)

      // After 90° rotation, x becomes -y and y becomes x
      points0.forEach((point0, index) => {
        const point90 = points90[index]
        expect(point90[0]).toBeCloseTo(-point0[1], 0)
        expect(point90[1]).toBeCloseTo(point0[0], 0)
      })
    })

    it('should handle all rotation angles', () => {
      const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270]

      rotations.forEach(rotation => {
        const config = createValidConfig({ rotation })
        const points = preset.getPolygonPoints(config)

        expect(points).toHaveLength(6)
        // All points should be finite numbers
        points.forEach(point => {
          expect(Number.isFinite(point[0])).toBe(true)
          expect(Number.isFinite(point[1])).toBe(true)
        })
      })
    })

    it('should throw error when extension is larger than main rectangle', () => {
      const config = createValidConfig({
        width1: 4000,
        width2: 5000 // Larger than width1
      })

      expect(() => preset.getPolygonPoints(config)).toThrow(
        'Extension dimensions must be smaller than main rectangle dimensions'
      )
    })
  })

  describe('getBounds', () => {
    it('should return main rectangle dimensions as bounds', () => {
      const config = createValidConfig({
        width1: 8000,
        length1: 6000,
        width2: 4000,
        length2: 3000
      })

      const bounds = preset.getBounds(config)

      expect(bounds.width).toBe(8000)
      expect(bounds.height).toBe(6000)
    })

    it('should return bounds regardless of rotation', () => {
      const config = createValidConfig()
      const bounds0 = preset.getBounds({ ...config, rotation: 0 })
      const bounds90 = preset.getBounds({ ...config, rotation: 90 })
      const bounds180 = preset.getBounds({ ...config, rotation: 180 })
      const bounds270 = preset.getBounds({ ...config, rotation: 270 })

      // Bounds should be the same regardless of rotation
      expect(bounds0).toEqual(bounds90)
      expect(bounds0).toEqual(bounds180)
      expect(bounds0).toEqual(bounds270)
    })
  })

  describe('getSideLengths', () => {
    it('should return 6 side lengths', () => {
      const config = createValidConfig()
      const sideLengths = preset.getSideLengths(config)

      expect(sideLengths).toHaveLength(6)
    })

    it('should return correct side lengths for L-shape', () => {
      const config = createValidConfig({
        width1: 8000,
        length1: 6000,
        width2: 4000,
        length2: 3000
      })

      const sideLengths = preset.getSideLengths(config)

      // Expected side lengths in clockwise order
      const expected = [
        8000, // Bottom side (full width)
        3000, // Right side (extension height)
        4000, // Inner horizontal side (width1 - width2)
        3000, // Inner vertical side (length1 - length2)
        4000, // Top side (extension width)
        6000 // Left side (full height)
      ]

      expect(sideLengths).toEqual(expected)
    })

    it('should handle edge case where extension equals main rectangle', () => {
      const config = createValidConfig({
        width1: 4000,
        length1: 3000,
        width2: 4000,
        length2: 3000
      })

      const sideLengths = preset.getSideLengths(config)

      // When extension equals main rectangle, some sides have zero length
      const expected = [
        4000, // Bottom side
        3000, // Right side
        0, // Inner horizontal side (width1 - width2 = 0)
        0, // Inner vertical side (length1 - length2 = 0)
        4000, // Top side
        3000 // Left side
      ]

      expect(sideLengths).toEqual(expected)
    })
  })
})
