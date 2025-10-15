import { vec3 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import type { ConstructionElement } from '@/construction/elements'
import { aggregateResults } from '@/construction/results'

import { type DoubleFrameModuleConfig, type SingleFrameModuleConfig, constructModule } from './modules'

const isConstructionElement = (item: any): item is ConstructionElement =>
  item && typeof item === 'object' && 'material' in item

describe('Module Construction', () => {
  describe('Single Frame Module', () => {
    const config: SingleFrameModuleConfig = {
      type: 'single',
      width: 920,
      frameThickness: 60,
      frameMaterial: 'wood' as any,
      strawMaterial: 'straw' as any
    }

    it('should create a single frame module with frame elements', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(920, 360, 2000)

      const results = Array.from(constructModule(position, size, config))
      const aggregated = aggregateResults(results)

      // Should have multiple elements
      expect(aggregated.elements.length).toBeGreaterThan(0)

      // Check that we have four frame elements
      const frameElements = aggregated.elements.filter(isConstructionElement).filter(el => el.material === 'wood')
      expect(frameElements).toHaveLength(4)

      // Check that we have one straw element
      const strawElements = aggregated.elements.filter(isConstructionElement).filter(el => el.material === 'straw')
      expect(strawElements).toHaveLength(1)
    })

    it('should create frame elements with correct positions', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(920, 360, 2000)

      const results = Array.from(constructModule(position, size, config))
      const aggregated = aggregateResults(results)

      const frameElements = aggregated.elements.filter(isConstructionElement).filter(el => el.material === 'wood')

      // Should have frame elements at the expected positions
      const hasTopFrame = frameElements.some(el => el.bounds.min[2] >= 1900) // Near top
      const hasBottomFrame = frameElements.some(el => el.bounds.min[2] === 0) // At bottom
      const hasLeftFrame = frameElements.some(el => el.bounds.min[0] === 0) // At left
      const hasRightFrame = frameElements.some(el => el.bounds.min[0] >= 850) // Near right

      expect(hasTopFrame).toBe(true)
      expect(hasBottomFrame).toBe(true)
      expect(hasLeftFrame).toBe(true)
      expect(hasRightFrame).toBe(true)
    })
  })

  describe('Double Frame Module', () => {
    const config: DoubleFrameModuleConfig = {
      type: 'double',
      width: 920,
      frameThickness: 60,
      frameWidth: 120,
      frameMaterial: 'wood' as any,
      strawMaterial: 'straw' as any
    }

    it('should create a double frame module with more frame elements than single', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(920, 360, 2000)

      const results = Array.from(constructModule(position, size, config))
      const aggregated = aggregateResults(results)

      // Check that we have eight frame elements
      const frameElements = aggregated.elements.filter(isConstructionElement).filter(el => el.material === 'wood')
      expect(frameElements).toHaveLength(8)

      // Check that we have one straw element
      const strawElements = aggregated.elements.filter(isConstructionElement).filter(el => el.material === 'straw')
      expect(strawElements).toHaveLength(1)
    })
  })

  describe('Module Type Selection', () => {
    it('should throw error for invalid module type', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(920, 360, 2000)
      const invalidConfig = {
        type: 'invalid' as any,
        width: 920,
        frameThickness: 60,
        frameMaterial: 'wood' as any,
        strawMaterial: 'straw' as any
      }

      expect(() => {
        Array.from(constructModule(position, size, invalidConfig))
      }).toThrow('Invalid module type')
    })
  })
})
