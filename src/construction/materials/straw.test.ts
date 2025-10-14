import { describe, expect, it } from 'vitest'

import type { ConstructionElement } from '@/construction/elements'
import { aggregateResults } from '@/construction/results'
import type { Cuboid } from '@/construction/shapes'
import type { Length, Vec3 } from '@/shared/geometry'

import type { MaterialId } from './material'
import { type StrawConfig, constructStraw } from './straw'

const mockMaterialId = 'test-material' as MaterialId

const defaultConfig: StrawConfig = {
  baleLength: 800 as Length,
  baleHeight: 500 as Length,
  baleWidth: 360 as Length,
  material: mockMaterialId
}

describe('constructStraw', () => {
  describe('perfect fit scenarios', () => {
    it('should create a single full strawbale when dimensions match exactly', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 360, 500]

      const results = [...constructStraw(position, size, defaultConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0]
      expect('material' in bale).toBe(true) // Should be ConstructionElement
      const baleElement = bale as ConstructionElement
      expect(baleElement.material).toBe(mockMaterialId)
      expect(baleElement.shape.type).toBe('cuboid')
      expect(baleElement.transform.position).toEqual([0, 0, 0])
      expect((baleElement.shape as Cuboid).size).toEqual([800, 360, 500])
    })

    it('should create multiple bales in a horizontal row', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1600, 360, 500] // 2 bales wide

      const results = [...constructStraw(position, size, defaultConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(2)

      expect(((elements[0] as ConstructionElement).shape as Cuboid).offset).toEqual([0, 0, 0])
      expect(((elements[0] as ConstructionElement).shape as Cuboid).size).toEqual([800, 360, 500])

      expect(((elements[1] as ConstructionElement).shape as Cuboid).offset).toEqual([800, 0, 0])
      expect(((elements[1] as ConstructionElement).shape as Cuboid).size).toEqual([800, 360, 500])
    })

    it('should create multiple bales in a vertical stack', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 360, 1000] // 2 bales high

      const results = [...constructStraw(position, size, defaultConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(2)

      expect(((elements[0] as ConstructionElement).shape as Cuboid).offset).toEqual([0, 0, 0])
      expect(((elements[0] as ConstructionElement).shape as Cuboid).size).toEqual([800, 360, 500])

      expect(((elements[1] as ConstructionElement).shape as Cuboid).offset).toEqual([0, 0, 500])
      expect(((elements[1] as ConstructionElement).shape as Cuboid).size).toEqual([800, 360, 500])
    })

    it('should create a 2x2 grid of bales', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1600, 360, 1000] // 2x2 bales

      const results = [...constructStraw(position, size, defaultConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(4)

      // Bottom row
      expect(((elements[0] as ConstructionElement).shape as Cuboid).offset).toEqual([0, 0, 0])
      expect(((elements[1] as ConstructionElement).shape as Cuboid).offset).toEqual([800, 0, 0])
      // Top row
      expect(((elements[2] as ConstructionElement).shape as Cuboid).offset).toEqual([0, 0, 500])
      expect(((elements[3] as ConstructionElement).shape as Cuboid).offset).toEqual([800, 0, 500])

      elements.forEach(bale => {
        expect(((bale as ConstructionElement).shape as Cuboid).size).toEqual([800, 360, 500])
      })
    })
  })

  describe('partial bales', () => {
    it('should create partial bale when width is less than full bale', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [400, 360, 500] // Half width

      const results = [...constructStraw(position, size, defaultConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0] as ConstructionElement
      expect((bale.shape as Cuboid).offset).toEqual([0, 0, 0])
      expect((bale.shape as Cuboid).size).toEqual([400, 360, 500])
    })

    it('should create partial bale when height is less than full bale', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 360, 250] // Half height

      const results = [...constructStraw(position, size, defaultConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0] as ConstructionElement
      expect((bale.shape as Cuboid).offset).toEqual([0, 0, 0])
      expect((bale.shape as Cuboid).size).toEqual([800, 360, 250])
    })

    it('should mix full and partial bales when dimensions do not align', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1200, 360, 500] // 1.5 bales wide

      const results = [...constructStraw(position, size, defaultConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(2)

      // First bale should be full
      expect(((elements[0] as ConstructionElement).shape as Cuboid).offset).toEqual([0, 0, 0])
      expect(((elements[0] as ConstructionElement).shape as Cuboid).size).toEqual([800, 360, 500])

      // Second bale should be partial
      expect(((elements[1] as ConstructionElement).shape as Cuboid).offset).toEqual([800, 0, 0])
      expect(((elements[1] as ConstructionElement).shape as Cuboid).size).toEqual([400, 360, 500])
    })

    it('should handle complex mixed arrangement', () => {
      const position: Vec3 = [100, 0, 50] // Non-zero start position
      const size: Vec3 = [1200, 360, 750] // 1.5 bales wide, 1.5 bales high

      const results = [...constructStraw(position, size, defaultConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(4)

      // Bottom row
      expect(((elements[0] as ConstructionElement).shape as Cuboid).offset).toEqual([100, 0, 50])
      expect(((elements[0] as ConstructionElement).shape as Cuboid).size).toEqual([800, 360, 500])

      expect(((elements[1] as ConstructionElement).shape as Cuboid).offset).toEqual([900, 0, 50])
      expect(((elements[1] as ConstructionElement).shape as Cuboid).size).toEqual([400, 360, 500])

      // Top row
      expect(((elements[2] as ConstructionElement).shape as Cuboid).offset).toEqual([100, 0, 550])
      expect(((elements[2] as ConstructionElement).shape as Cuboid).size).toEqual([800, 360, 250])

      expect(((elements[3] as ConstructionElement).shape as Cuboid).offset).toEqual([900, 0, 550])
      expect(((elements[3] as ConstructionElement).shape as Cuboid).size).toEqual([400, 360, 250])
    })
  })

  describe('error conditions', () => {
    it('should generate error when wall is too thick for single strawbale', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 400, 500] // Thicker than bale width

      const results = [...constructStraw(position, size, defaultConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      expect(errors[0].description).toBe('Wall is too thick for a single strawbale')
      expect(((elements[0] as ConstructionElement).shape as Cuboid).offset).toEqual(position)
      expect(((elements[0] as ConstructionElement).shape as Cuboid).size).toEqual(size)
    })

    it('should generate warning when wall is too thin for single strawbale', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 300, 500] // Thinner than bale width

      const results = [...constructStraw(position, size, defaultConfig)]
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
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [0, 360, 500]

      const results = [...constructStraw(position, size, defaultConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(0) // No bales should be created
    })

    it('should handle very small dimensions', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [10, 360, 10]

      const results = [...constructStraw(position, size, defaultConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0] as ConstructionElement
      expect((bale.shape as Cuboid).size).toEqual([10, 360, 10])
    })

    it('should handle negative positions', () => {
      const position: Vec3 = [-100, 0, -200]
      const size: Vec3 = [800, 360, 500]

      const results = [...constructStraw(position, size, defaultConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0] as ConstructionElement
      expect((bale.shape as Cuboid).offset).toEqual([-100, 0, -200])
      expect((bale.shape as Cuboid).size).toEqual([800, 360, 500])
    })
  })

  describe('different configurations', () => {
    it('should work with custom bale dimensions', () => {
      const customConfig: StrawConfig = {
        baleLength: 1000 as Length,
        baleHeight: 400 as Length,
        baleWidth: 300 as Length,
        material: mockMaterialId
      }

      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1000, 300, 400]

      const results = [...constructStraw(position, size, customConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0] as ConstructionElement
      expect((bale.shape as Cuboid).size).toEqual([1000, 300, 400])
    })

    it('should use provided material ID', () => {
      const customMaterial = 'custom-straw-material' as MaterialId
      const customConfig: StrawConfig = {
        ...defaultConfig,
        material: customMaterial
      }

      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 360, 500]

      const results = [...constructStraw(position, size, customConfig)]
      const { elements } = aggregateResults(results)

      expect((elements[0] as ConstructionElement).material).toBe(customMaterial)
    })
  })

  describe('construction element properties', () => {
    it('should generate unique IDs for each bale', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1600, 360, 500] // 2 bales

      const results = [...constructStraw(position, size, defaultConfig)]
      const { elements } = aggregateResults(results)

      expect(elements).toHaveLength(2)
      expect(elements[0].id).not.toBe(elements[1].id)
      expect(elements[0].id).toBeTruthy()
      expect(elements[1].id).toBeTruthy()
    })
  })
})
