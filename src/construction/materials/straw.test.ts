import { vec3 } from 'gl-matrix'
import { describe, expect, it, vi } from 'vitest'

import { type ConfigActions, getConfigActions } from '@/construction/config'
import type { ConstructionElement } from '@/construction/elements'
import { aggregateResults } from '@/construction/results'
import type { Cuboid } from '@/construction/shapes'

import type { MaterialId } from './material'
import { type StrawConfig, constructStraw } from './straw'

vi.mock('@/construction/config', () => ({
  getConfigActions: vi.fn()
}))

const mockGetStrawConfig = vi.fn()
vi.mocked(getConfigActions).mockReturnValue({
  getStrawConfig: mockGetStrawConfig
} as any as ConfigActions)

const mockMaterialId = 'test-material' as MaterialId

const defaultConfig: StrawConfig = {
  baleMinLength: 800,
  baleMaxLength: 900,
  baleHeight: 500,
  baleWidth: 360,
  material: mockMaterialId
}

describe('constructStraw', () => {
  beforeEach(() => {
    mockGetStrawConfig.mockClear()
    mockGetStrawConfig.mockReturnValue(defaultConfig)
  })

  describe('perfect fit scenarios', () => {
    it('should create a single full strawbale when dimensions match exactly', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(800, 360, 500)

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0]
      expect('material' in bale).toBe(true) // Should be ConstructionElement
      const baleElement = bale as ConstructionElement
      expect(baleElement.material).toBe(mockMaterialId)
      expect(baleElement.shape.type).toBe('cuboid')
      expect(baleElement.transform.position).toEqual(vec3.fromValues(0, 0, 0))
      expect((baleElement.shape as Cuboid).size).toEqual(vec3.fromValues(800, 360, 500))
    })

    it('should create multiple bales in a horizontal row', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1600, 360, 500) // 2 bales wide

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(2)

      expect(((elements[0] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(0, 0, 0))
      expect(((elements[0] as ConstructionElement).shape as Cuboid).size).toEqual(vec3.fromValues(800, 360, 500))

      expect(((elements[1] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(800, 0, 0))
      expect(((elements[1] as ConstructionElement).shape as Cuboid).size).toEqual(vec3.fromValues(800, 360, 500))
    })

    it('should create multiple bales in a vertical stack', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(800, 360, 1000) // 2 bales high

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(2)

      expect(((elements[0] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(0, 0, 0))
      expect(((elements[0] as ConstructionElement).shape as Cuboid).size).toEqual(vec3.fromValues(800, 360, 500))

      expect(((elements[1] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(0, 0, 500))
      expect(((elements[1] as ConstructionElement).shape as Cuboid).size).toEqual(vec3.fromValues(800, 360, 500))
    })

    it('should create a 2x2 grid of bales', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1600, 360, 1000) // 2x2 bales

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(4)

      // Bottom row
      expect(((elements[0] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(0, 0, 0))
      expect(((elements[1] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(800, 0, 0))
      // Top row
      expect(((elements[2] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(0, 0, 500))
      expect(((elements[3] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(800, 0, 500))

      elements.forEach(bale => {
        expect(((bale as ConstructionElement).shape as Cuboid).size).toEqual(vec3.fromValues(800, 360, 500))
      })
    })
  })

  describe('partial bales', () => {
    it('should create partial bale when width is less than full bale', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(400, 360, 500) // Half width

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0] as ConstructionElement
      expect((bale.shape as Cuboid).offset).toEqual(vec3.fromValues(0, 0, 0))
      expect((bale.shape as Cuboid).size).toEqual(vec3.fromValues(400, 360, 500))
    })

    it('should create partial bale when height is less than full bale', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(800, 360, 250) // Half height

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0] as ConstructionElement
      expect((bale.shape as Cuboid).offset).toEqual(vec3.fromValues(0, 0, 0))
      expect((bale.shape as Cuboid).size).toEqual(vec3.fromValues(800, 360, 250))
    })

    it('should mix full and partial bales when dimensions do not align', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1200, 360, 500) // 1.5 bales wide

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(2)

      // First bale should be full
      expect(((elements[0] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(0, 0, 0))
      expect(((elements[0] as ConstructionElement).shape as Cuboid).size).toEqual(vec3.fromValues(800, 360, 500))

      // Second bale should be partial
      expect(((elements[1] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(800, 0, 0))
      expect(((elements[1] as ConstructionElement).shape as Cuboid).size).toEqual(vec3.fromValues(400, 360, 500))
    })

    it('should handle complex mixed arrangement', () => {
      const position = vec3.fromValues(100, 0, 50) // Non-zero start position
      const size = vec3.fromValues(1200, 360, 750) // 1.5 bales wide, 1.5 bales high

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(4)

      // Bottom row
      expect(((elements[0] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(100, 0, 50))
      expect(((elements[0] as ConstructionElement).shape as Cuboid).size).toEqual(vec3.fromValues(800, 360, 500))

      expect(((elements[1] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(900, 0, 50))
      expect(((elements[1] as ConstructionElement).shape as Cuboid).size).toEqual(vec3.fromValues(400, 360, 500))

      // Top row
      expect(((elements[2] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(100, 0, 550))
      expect(((elements[2] as ConstructionElement).shape as Cuboid).size).toEqual(vec3.fromValues(800, 360, 250))

      expect(((elements[3] as ConstructionElement).shape as Cuboid).offset).toEqual(vec3.fromValues(900, 0, 550))
      expect(((elements[3] as ConstructionElement).shape as Cuboid).size).toEqual(vec3.fromValues(400, 360, 250))
    })
  })

  describe('error conditions', () => {
    it('should generate error when wall is too thick for single strawbale', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(800, 400, 500) // Thicker than bale width

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      expect(errors[0].description).toBe('Wall is too thick for a single strawbale')
      expect(((elements[0] as ConstructionElement).shape as Cuboid).offset).toEqual(position)
      expect(((elements[0] as ConstructionElement).shape as Cuboid).size).toEqual(size)
    })

    it('should generate warning when wall is too thin for single strawbale', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(800, 300, 500) // Thinner than bale width

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(1)
      expect(elements).toHaveLength(1)

      expect(warnings[0].description).toBe('Wall is too thin for a single strawbale')
      expect(((elements[0] as ConstructionElement).shape as Cuboid).offset).toEqual(position)
      expect(((elements[0] as ConstructionElement).shape as Cuboid).size).toEqual(size)
    })
  })

  describe('edge cases', () => {
    it('should handle zero dimensions', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(0, 360, 500)

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(0) // No bales should be created
    })

    it('should handle very small dimensions', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(10, 360, 10)

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0] as ConstructionElement
      expect((bale.shape as Cuboid).size).toEqual(vec3.fromValues(10, 360, 10))
    })

    it('should handle negative positions', () => {
      const position = vec3.fromValues(-100, 0, -200)
      const size = vec3.fromValues(800, 360, 500)

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0] as ConstructionElement
      expect((bale.shape as Cuboid).offset).toEqual(vec3.fromValues(-100, 0, -200))
      expect((bale.shape as Cuboid).size).toEqual(vec3.fromValues(800, 360, 500))
    })
  })

  describe('different configurations', () => {
    it('should work with custom bale dimensions', () => {
      const customConfig: StrawConfig = {
        baleMinLength: 1000,
        baleMaxLength: 1000,
        baleHeight: 400,
        baleWidth: 300,
        material: mockMaterialId
      }
      mockGetStrawConfig.mockReturnValue(customConfig)

      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1000, 300, 400)

      const results = [...constructStraw(position, size)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0] as ConstructionElement
      expect((bale.shape as Cuboid).size).toEqual(vec3.fromValues(1000, 300, 400))
    })

    it('should use provided material ID', () => {
      const customMaterial = 'custom-straw-material' as MaterialId
      const customConfig: StrawConfig = {
        ...defaultConfig,
        material: customMaterial
      }
      mockGetStrawConfig.mockReturnValue(customConfig)

      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(800, 360, 500)

      const results = [...constructStraw(position, size)]
      const { elements } = aggregateResults(results)

      expect((elements[0] as ConstructionElement).material).toBe(customMaterial)
    })
  })

  describe('construction element properties', () => {
    it('should generate unique IDs for each bale', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1600, 360, 500) // 2 bales

      const results = [...constructStraw(position, size)]
      const { elements } = aggregateResults(results)

      expect(elements).toHaveLength(2)
      expect(elements[0].id).not.toBe(elements[1].id)
      expect(elements[0].id).toBeTruthy()
      expect(elements[1].id).toBeTruthy()
    })
  })
})
