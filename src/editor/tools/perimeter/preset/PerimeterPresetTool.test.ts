import { beforeEach, describe, expect, it } from 'vitest'

import { createLength, createVec2 } from '@/shared/geometry'

import { PerimeterPresetTool } from './PerimeterPresetTool'
import { LShapedPreset, RectangularPreset } from './presets'
import type { RectangularPresetConfig } from './presets'

describe('PerimeterPresetTool', () => {
  let tool: PerimeterPresetTool

  beforeEach(() => {
    tool = new PerimeterPresetTool()
  })

  describe('initialization', () => {
    it('should have correct tool properties', () => {
      expect(tool.id).toBe('perimeter.preset')
      expect(tool.name).toBe('Perimeter Presets')
      expect(tool.cursor).toBe('crosshair')
      expect(tool.category).toBe('walls')
    })

    it('should start with no active preset', () => {
      expect(tool.state.activePreset).toBeNull()
      expect(tool.state.presetConfig).toBeNull()
    })

    it('should have available presets', () => {
      const presets = tool.getAvailablePresets()
      expect(presets).toHaveLength(2)
      expect(presets[0]).toBeInstanceOf(RectangularPreset)
      expect(presets[1]).toBeInstanceOf(LShapedPreset)
    })
  })

  describe('preset management', () => {
    const rectangularPreset = new RectangularPreset()
    const config: RectangularPresetConfig = {
      width: createLength(4000),
      length: createLength(6000),
      thickness: createLength(440),
      constructionMethodId: 'test-method' as any
    }

    it('should set active preset and enter placement mode', () => {
      tool.setActivePreset(rectangularPreset, config)

      expect(tool.state.activePreset).toBe(rectangularPreset)
      expect(tool.state.presetConfig).toBe(config)
    })

    it('should clear active preset', () => {
      tool.setActivePreset(rectangularPreset, config)
      tool.clearActivePreset()

      expect(tool.state.activePreset).toBeNull()
      expect(tool.state.presetConfig).toBeNull()
      expect(tool.state.previewPosition).toBeNull()
      expect(tool.state.previewPolygon).toBeNull()
    })

    it('should provide current config', () => {
      expect(tool.getCurrentConfig()).toBeNull()

      tool.setActivePreset(rectangularPreset, config)
      expect(tool.getCurrentConfig()).toBe(config)
    })

    it('should track placement state', () => {
      expect(tool.isPlacing()).toBe(false)

      tool.setActivePreset(rectangularPreset, config)
      expect(tool.isPlacing()).toBe(true)

      tool.clearActivePreset()
      expect(tool.isPlacing()).toBe(false)
    })
  })

  describe('preview generation', () => {
    const rectangularPreset = new RectangularPreset()
    const config: RectangularPresetConfig = {
      width: createLength(4000),
      length: createLength(6000),
      thickness: createLength(440),
      constructionMethodId: 'test-method' as any
    }

    it('should generate preview polygon when position is set', () => {
      tool.setActivePreset(rectangularPreset, config)

      // Initially no preview without position
      expect(tool.getPreviewPolygon()).toBeNull()

      // Simulate pointer move to set position
      const mockEvent = {
        stageCoordinates: createVec2(1000, 2000)
      } as any

      tool.handlePointerMove(mockEvent)

      const preview = tool.getPreviewPolygon()
      expect(preview).not.toBeNull()
      expect(preview!.points).toHaveLength(4)

      // Check that points are translated to the pointer position
      const expectedOffset = createVec2(1000, 2000)
      const originalPoints = rectangularPreset.getPolygonPoints(config)

      preview!.points.forEach((point, index) => {
        expect(point[0]).toBeCloseTo(originalPoints[index][0] + expectedOffset[0])
        expect(point[1]).toBeCloseTo(originalPoints[index][1] + expectedOffset[1])
      })
    })

    it('should update preview on pointer move', () => {
      tool.setActivePreset(rectangularPreset, config)

      const mockEvent1 = { stageCoordinates: createVec2(100, 200) } as any
      tool.handlePointerMove(mockEvent1)

      const preview1 = tool.getPreviewPolygon()
      expect(preview1!.points[0][0]).toBeCloseTo(-2000 + 100) // -halfWidth + offset

      const mockEvent2 = { stageCoordinates: createVec2(500, 800) } as any
      tool.handlePointerMove(mockEvent2)

      const preview2 = tool.getPreviewPolygon()
      expect(preview2!.points[0][0]).toBeCloseTo(-2000 + 500) // Updated position
    })
  })

  describe('lifecycle methods', () => {
    it('should reset state on activation', () => {
      const rectangularPreset = new RectangularPreset()
      const config: RectangularPresetConfig = {
        width: createLength(4000),
        length: createLength(6000),
        thickness: createLength(440),
        constructionMethodId: 'test-method' as any
      }

      tool.setActivePreset(rectangularPreset, config)
      tool.onActivate()

      expect(tool.state.previewPosition).toBeNull()
      expect(tool.state.previewPolygon).toBeNull()
      // Note: activePreset and presetConfig should remain for reuse
    })

    it('should clear all state on deactivation', () => {
      const rectangularPreset = new RectangularPreset()
      const config: RectangularPresetConfig = {
        width: createLength(4000),
        length: createLength(6000),
        thickness: createLength(440),
        constructionMethodId: 'test-method' as any
      }

      tool.setActivePreset(rectangularPreset, config)
      tool.onDeactivate()

      expect(tool.state.activePreset).toBeNull()
      expect(tool.state.presetConfig).toBeNull()
      expect(tool.state.previewPosition).toBeNull()
      expect(tool.state.previewPolygon).toBeNull()
    })
  })
})
