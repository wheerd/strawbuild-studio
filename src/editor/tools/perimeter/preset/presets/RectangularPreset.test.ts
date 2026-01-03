import { describe, expect, it } from 'vitest'

import { RectIcon } from '@/editor/tools/perimeter/preset/presets/Icons'
import { RectangularPresetDialog } from '@/editor/tools/perimeter/preset/presets/RectangularPresetDialog'

import { RectangularPreset } from './RectangularPreset'
import type { RectangularPresetConfig } from './types'

describe('RectangularPreset', () => {
  const preset = new RectangularPreset()

  const validConfig: RectangularPresetConfig = {
    width: 4000,
    length: 6000,
    thickness: 420,
    wallAssemblyId: 'test-assembly' as any,
    referenceSide: 'inside'
  }

  describe('getPolygonPoints', () => {
    it('should generate correct rectangle points centered at origin using inside dimensions', () => {
      const points = preset.getPolygonPoints(validConfig)

      expect(points).toHaveLength(4)

      // Check that points form a rectangle centered at origin using inside dimensions
      const halfWidth = validConfig.width / 2 // Inside width
      const halfLength = validConfig.length / 2 // Inside length

      expect(points[0][0]).toBe(-halfWidth)
      expect(points[0][1]).toBe(-halfLength)
      expect(points[1][0]).toBe(halfWidth)
      expect(points[1][1]).toBe(-halfLength)
      expect(points[2][0]).toBe(halfWidth)
      expect(points[2][1]).toBe(halfLength)
      expect(points[3][0]).toBe(-halfWidth)
      expect(points[3][1]).toBe(halfLength)
    })

    it('should handle different inside dimensions correctly', () => {
      const config: RectangularPresetConfig = {
        ...validConfig,
        width: 2000, // 2m inside width
        length: 3000 // 3m inside length
      }

      const points = preset.getPolygonPoints(config)

      // Points should represent the inside dimensions
      expect(points[0][0]).toBe(-1000) // -half inside width
      expect(points[0][1]).toBe(-1500) // -half inside length
      expect(points[1][0]).toBe(1000) // +half inside width
      expect(points[1][1]).toBe(-1500) // -half inside length
      expect(points[2][0]).toBe(1000) // +half inside width
      expect(points[2][1]).toBe(1500) // +half inside length
      expect(points[3][0]).toBe(-1000) // -half inside width
      expect(points[3][1]).toBe(1500) // +half inside length
    })

    it('should generate outside dimensions when reference side is outside', () => {
      const outsideConfig: RectangularPresetConfig = {
        ...validConfig,
        referenceSide: 'outside',
        width: 8000,
        length: 6000
      }

      const points = preset.getPolygonPoints(outsideConfig)

      expect(points[0][0]).toBe(-4000)
      expect(points[0][1]).toBe(-3000)
      expect(points[2][0]).toBe(4000)
      expect(points[2][1]).toBe(3000)
    })
  })

  describe('getBounds', () => {
    it('should return correct bounds based on inside dimensions', () => {
      const bounds = preset.getBounds(validConfig)

      // Bounds should reflect the inside dimensions
      expect(bounds.width).toBe(validConfig.width) // Inside width
      expect(bounds.height).toBe(validConfig.length) // Inside length
    })
  })

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      expect(preset.validateConfig(validConfig)).toBe(true)
    })

    it('should reject zero or negative width', () => {
      const invalidConfig = { ...validConfig, width: 0 }
      expect(preset.validateConfig(invalidConfig)).toBe(false)

      const negativeConfig = { ...validConfig, width: -100 }
      expect(preset.validateConfig(negativeConfig)).toBe(false)
    })

    it('should reject zero or negative length', () => {
      const invalidConfig = { ...validConfig, length: 0 }
      expect(preset.validateConfig(invalidConfig)).toBe(false)

      const negativeConfig = { ...validConfig, length: -100 }
      expect(preset.validateConfig(negativeConfig)).toBe(false)
    })

    it('should reject zero or negative thickness', () => {
      const invalidConfig = { ...validConfig, thickness: 0 }
      expect(preset.validateConfig(invalidConfig)).toBe(false)

      const negativeConfig = { ...validConfig, thickness: -10 }
      expect(preset.validateConfig(negativeConfig)).toBe(false)
    })

    it('should reject empty assembly ID', () => {
      const invalidConfig = { ...validConfig, wallAssemblyId: '' as any }
      expect(preset.validateConfig(invalidConfig)).toBe(false)
    })

    it('should reject outside reference when thickness exceeds dimensions', () => {
      const invalidConfig: RectangularPresetConfig = {
        ...validConfig,
        referenceSide: 'outside',
        width: 500,
        length: 500,
        thickness: 400
      }
      expect(preset.validateConfig(invalidConfig)).toBe(false)
    })
  })

  describe('properties', () => {
    it('should have correct type, icon, and dialog', () => {
      expect(preset.type).toBe('rectangular')
      expect(preset.icon).toBe(RectIcon)
      expect(preset.dialog).toBe(RectangularPresetDialog)
    })
  })
})
