import { describe, it, expect } from 'vitest'
import type { Length, Vec3 } from '@/types/geometry'
import type { MaterialId } from './material'
import { constructStraw, type StrawConfig } from './straw'

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

      const result = constructStraw(position, size, defaultConfig)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)

      const bale = result.it[0]
      expect(bale.type).toBe('full-strawbale')
      expect(bale.shape.position).toEqual([0, 0, 0])
      expect(bale.shape.size).toEqual([800, 360, 500])
      expect(bale.material).toBe(mockMaterialId)
    })

    it('should create multiple bales in a horizontal row', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1600, 360, 500] // 2 bales wide

      const result = constructStraw(position, size, defaultConfig)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(2)

      expect(result.it[0].shape.position).toEqual([0, 0, 0])
      expect(result.it[0].shape.size).toEqual([800, 360, 500])
      expect(result.it[0].type).toBe('full-strawbale')

      expect(result.it[1].shape.position).toEqual([800, 0, 0])
      expect(result.it[1].shape.size).toEqual([800, 360, 500])
      expect(result.it[1].type).toBe('full-strawbale')
    })

    it('should create multiple bales in a vertical stack', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 360, 1000] // 2 bales high

      const result = constructStraw(position, size, defaultConfig)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(2)

      expect(result.it[0].shape.position).toEqual([0, 0, 0])
      expect(result.it[0].shape.size).toEqual([800, 360, 500])
      expect(result.it[0].type).toBe('full-strawbale')

      expect(result.it[1].shape.position).toEqual([0, 0, 500])
      expect(result.it[1].shape.size).toEqual([800, 360, 500])
      expect(result.it[1].type).toBe('full-strawbale')
    })

    it('should create a 2x2 grid of bales', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1600, 360, 1000] // 2x2 bales

      const result = constructStraw(position, size, defaultConfig)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(4)

      // Bottom row
      expect(result.it[0].shape.position).toEqual([0, 0, 0])
      expect(result.it[1].shape.position).toEqual([800, 0, 0])
      // Top row
      expect(result.it[2].shape.position).toEqual([0, 0, 500])
      expect(result.it[3].shape.position).toEqual([800, 0, 500])

      result.it.forEach(bale => {
        expect(bale.type).toBe('full-strawbale')
        expect(bale.shape.size).toEqual([800, 360, 500])
      })
    })
  })

  describe('partial bales', () => {
    it('should create partial bale when width is less than full bale', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [400, 360, 500] // Half width

      const result = constructStraw(position, size, defaultConfig)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)

      const bale = result.it[0]
      expect(bale.type).toBe('partial-strawbale')
      expect(bale.shape.position).toEqual([0, 0, 0])
      expect(bale.shape.size).toEqual([400, 360, 500])
    })

    it('should create partial bale when height is less than full bale', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 360, 250] // Half height

      const result = constructStraw(position, size, defaultConfig)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)

      const bale = result.it[0]
      expect(bale.type).toBe('partial-strawbale')
      expect(bale.shape.position).toEqual([0, 0, 0])
      expect(bale.shape.size).toEqual([800, 360, 250])
    })

    it('should mix full and partial bales when dimensions do not align', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1200, 360, 500] // 1.5 bales wide

      const result = constructStraw(position, size, defaultConfig)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(2)

      // First bale should be full
      expect(result.it[0].type).toBe('full-strawbale')
      expect(result.it[0].shape.position).toEqual([0, 0, 0])
      expect(result.it[0].shape.size).toEqual([800, 360, 500])

      // Second bale should be partial
      expect(result.it[1].type).toBe('partial-strawbale')
      expect(result.it[1].shape.position).toEqual([800, 0, 0])
      expect(result.it[1].shape.size).toEqual([400, 360, 500])
    })

    it('should handle complex mixed arrangement', () => {
      const position: Vec3 = [100, 0, 50] // Non-zero start position
      const size: Vec3 = [1200, 360, 750] // 1.5 bales wide, 1.5 bales high

      const result = constructStraw(position, size, defaultConfig)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(4)

      // Bottom row
      expect(result.it[0].shape.position).toEqual([100, 0, 50])
      expect(result.it[0].shape.size).toEqual([800, 360, 500])
      expect(result.it[0].type).toBe('full-strawbale')

      expect(result.it[1].shape.position).toEqual([900, 0, 50])
      expect(result.it[1].shape.size).toEqual([400, 360, 500])
      expect(result.it[1].type).toBe('partial-strawbale')

      // Top row
      expect(result.it[2].shape.position).toEqual([100, 0, 550])
      expect(result.it[2].shape.size).toEqual([800, 360, 250])
      expect(result.it[2].type).toBe('partial-strawbale')

      expect(result.it[3].shape.position).toEqual([900, 0, 550])
      expect(result.it[3].shape.size).toEqual([400, 360, 250])
      expect(result.it[3].type).toBe('partial-strawbale')
    })
  })

  describe('error conditions', () => {
    it('should generate error when wall is too thick for single strawbale', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 400, 500] // Thicker than bale width

      const result = constructStraw(position, size, defaultConfig)

      expect(result.errors).toHaveLength(1)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)

      expect(result.errors[0].description).toBe('Wall is too thick for a single strawbale')
      expect(result.it[0].type).toBe('straw')
      expect(result.it[0].shape.position).toEqual(position)
      expect(result.it[0].shape.size).toEqual(size)
    })

    it('should generate warning when wall is too thin for single strawbale', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 300, 500] // Thinner than bale width

      const result = constructStraw(position, size, defaultConfig)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(1)
      expect(result.it).toHaveLength(1)

      expect(result.warnings[0].description).toBe('Wall is too thin for a single strawbale')
      expect(result.it[0].type).toBe('straw')
      expect(result.it[0].shape.position).toEqual(position)
      expect(result.it[0].shape.size).toEqual(size)
    })
  })

  describe('edge cases', () => {
    it('should handle zero dimensions', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [0, 360, 500]

      const result = constructStraw(position, size, defaultConfig)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(0) // No bales should be created
    })

    it('should handle very small dimensions', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [10, 360, 10]

      const result = constructStraw(position, size, defaultConfig)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)

      const bale = result.it[0]
      expect(bale.type).toBe('partial-strawbale')
      expect(bale.shape.size).toEqual([10, 360, 10])
    })

    it('should handle negative positions', () => {
      const position: Vec3 = [-100, 0, -200]
      const size: Vec3 = [800, 360, 500]

      const result = constructStraw(position, size, defaultConfig)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)

      const bale = result.it[0]
      expect(bale.shape.position).toEqual([-100, 0, -200])
      expect(bale.shape.size).toEqual([800, 360, 500])
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

      const result = constructStraw(position, size, customConfig)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)

      const bale = result.it[0]
      expect(bale.type).toBe('full-strawbale')
      expect(bale.shape.size).toEqual([1000, 300, 400])
    })

    it('should use provided material ID', () => {
      const customMaterial = 'custom-straw-material' as MaterialId
      const customConfig: StrawConfig = {
        ...defaultConfig,
        material: customMaterial
      }

      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 360, 500]

      const result = constructStraw(position, size, customConfig)

      expect(result.it[0].material).toBe(customMaterial)
    })
  })

  describe('construction element properties', () => {
    it('should generate unique IDs for each bale', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1600, 360, 500] // 2 bales

      const result = constructStraw(position, size, defaultConfig)

      expect(result.it).toHaveLength(2)
      expect(result.it[0].id).not.toBe(result.it[1].id)
      expect(result.it[0].id).toBeTruthy()
      expect(result.it[1].id).toBeTruthy()
    })
  })
})
