import { describe, expect, it } from 'vitest'

import type { ConstructionElement, ConstructionGroup } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import { aggregateResults } from '@/construction/results'
import { newVec3 } from '@/shared/geometry'

import { type DoubleFrameModuleConfig, type SingleFrameModuleConfig, constructModule } from './modules'

const isConstructionElement = (item: any): item is ConstructionElement =>
  item && typeof item === 'object' && 'material' in item

describe('Module Construction', () => {
  describe('Single Frame Module', () => {
    const config: SingleFrameModuleConfig = {
      type: 'single',
      minWidth: 920,
      maxWidth: 920,
      frameThickness: 60,
      frameMaterial: 'wood' as any,
      strawMaterial: 'straw' as any,
      triangularBattens: {
        size: 30,
        material: 'batten' as any,
        inside: false,
        outside: false,
        minLength: 100
      }
    }

    it('should create a single frame module with frame elements', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(920, 360, 2000)
      const area = new WallConstructionArea(position, size)

      const results = Array.from(constructModule(area, config))
      const group = aggregateResults(results).elements[0] as ConstructionGroup

      // Should have multiple elements
      expect(group.children.length).toBeGreaterThan(0)

      // Check that we have four frame elements
      const frameElements = group.children.filter(isConstructionElement).filter(el => el.material === 'wood')
      expect(frameElements).toHaveLength(4)

      // Check that we have one straw element
      const strawElements = group.children.filter(isConstructionElement).filter(el => el.material === 'straw')
      expect(strawElements).toHaveLength(1)
    })

    it('should create frame elements with correct positions', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(920, 360, 2000)
      const area = new WallConstructionArea(position, size)

      const results = Array.from(constructModule(area, config))
      const group = aggregateResults(results).elements[0] as ConstructionGroup

      const frameElements = group.children.filter(isConstructionElement).filter(el => el.material === 'wood')

      // Should have frame elements at the expected positions
      const hasTopFrame = frameElements.some(el => el.transform[14] >= 1900) // Near top
      const hasBottomFrame = frameElements.some(el => el.transform[14] === 0) // At bottom
      const hasLeftFrame = frameElements.some(el => el.transform[12] === 0) // At left
      const hasRightFrame = frameElements.some(el => el.transform[12] >= 850) // Near right

      expect(hasTopFrame).toBe(true)
      expect(hasBottomFrame).toBe(true)
      expect(hasLeftFrame).toBe(true)
      expect(hasRightFrame).toBe(true)
    })
  })

  describe('Double Frame Module', () => {
    const config: DoubleFrameModuleConfig = {
      type: 'double',
      minWidth: 920,
      maxWidth: 920,
      frameThickness: 60,
      frameWidth: 120,
      frameMaterial: 'wood' as any,
      strawMaterial: 'straw' as any,
      spacerSize: 120,
      spacerCount: 3,
      spacerMaterial: 'spacer-wood' as any,
      infillMaterial: 'infill' as any,
      triangularBattens: {
        size: 30,
        material: 'batten' as any,
        inside: false,
        outside: false,
        minLength: 100
      }
    }

    it('should create a double frame module with more frame elements than single', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(920, 360, 2000)
      const area = new WallConstructionArea(position, size)

      const results = Array.from(constructModule(area, config))
      const group = aggregateResults(results).elements[0] as ConstructionGroup

      // Check that we have eight frame elements
      const frameElements = group.children.filter(isConstructionElement).filter(el => el.material === 'wood')
      expect(frameElements).toHaveLength(8)

      // Check that we have one straw element
      const strawElements = group.children.filter(isConstructionElement).filter(el => el.material === 'straw')
      expect(strawElements).toHaveLength(1)

      // Check spacers count
      const spacerElements = group.children.filter(isConstructionElement).filter(el => el.material === 'spacer-wood')
      expect(spacerElements).toHaveLength(2 * config.spacerCount)

      // Check infill segments count
      const infillElements = group.children.filter(isConstructionElement).filter(el => el.material === 'infill')
      expect(infillElements).toHaveLength(2 * config.spacerCount)
    })

    it('should position spacers aligned to vertical beams', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(920, 360, 2000)
      const area = new WallConstructionArea(position, size)

      const results = Array.from(constructModule(area, config))
      const group = aggregateResults(results).elements[0] as ConstructionGroup

      const spacers = group.children
        .filter(isConstructionElement)
        .filter(el => el.material === 'spacer-wood')
        .sort((a, b) => a.bounds.min[2] - b.bounds.min[2])

      expect(spacers[0].transform[14]).toBe(60)
      expect(spacers[spacers.length - 1].transform[14] + spacers[spacers.length - 1].bounds.max[2]).toBe(2000 - 60)
    })
  })

  describe('Module Type Selection', () => {
    it('should throw error for invalid module type', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(920, 360, 2000)
      const area = new WallConstructionArea(position, size)
      const invalidConfig = {
        type: 'invalid' as any,
        minWidth: 920,
        maxWidth: 920,
        frameThickness: 60,
        frameMaterial: 'wood' as any,
        strawMaterial: 'straw' as any,
        triangularBattens: {
          size: 30,
          material: 'batten' as any,
          inside: false,
          outside: false,
          minLength: 100
        }
      }

      expect(() => {
        Array.from(constructModule(area, invalidConfig))
      }).toThrow('Invalid module type')
    })
  })
})
