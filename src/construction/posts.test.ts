import { describe, it, expect } from 'vitest'
import type { Length } from '@/types/geometry'
import type { MaterialId, Material } from './material'
import { DEFAULT_MATERIALS } from './material'
import { constructPost, type FullPostConfig, type DoublePostConfig } from './posts'

const mockWoodMaterial = 'wood-material' as MaterialId
const mockStrawMaterial = 'straw-material' as MaterialId

// Get a real dimensional material for testing warnings
const wood120x60 = Object.values(DEFAULT_MATERIALS).find(
  m => m.type === 'dimensional' && m.width === 120 && m.thickness === 60
)!
const dimensionalMaterialId = wood120x60.id

// Mock resolve material function for tests
const mockResolveMaterial = (materialId: MaterialId): Material | undefined => {
  if (materialId === dimensionalMaterialId) {
    return wood120x60
  }
  // Return undefined for mock materials (no warnings)
  return undefined
}

describe('constructPost', () => {
  describe('full post construction', () => {
    const fullPostConfig: FullPostConfig = {
      type: 'full',
      width: 60 as Length,
      material: mockWoodMaterial
    }

    it('should create a single full post element without errors', () => {
      const offset = 100 as Length
      const wallThickness = 360 as Length
      const wallHeight = 2500 as Length

      const result = constructPost(offset, wallThickness, wallHeight, fullPostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)

      const post = result.it[0]
      expect(post.type).toBe('post')
      expect(post.material).toBe(mockWoodMaterial)
      expect(post.position).toEqual([100, 0, 0])
      expect(post.size).toEqual([60, 360, 2500])
      expect(post.id).toBeTruthy()
    })

    it('should handle zero offset', () => {
      const offset = 0 as Length
      const wallThickness = 360 as Length
      const wallHeight = 2500 as Length

      const result = constructPost(offset, wallThickness, wallHeight, fullPostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)
      expect(result.it[0].position).toEqual([0, 0, 0])
    })

    it('should handle different wall dimensions', () => {
      const offset = 50 as Length
      const wallThickness = 240 as Length
      const wallHeight = 3000 as Length

      const result = constructPost(offset, wallThickness, wallHeight, fullPostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)
      expect(result.it[0].position).toEqual([50, 0, 0])
      expect(result.it[0].size).toEqual([60, 240, 3000])
    })

    it('should use correct material from config', () => {
      const customMaterial = 'custom-wood-material' as MaterialId
      const customConfig: FullPostConfig = {
        ...fullPostConfig,
        material: customMaterial
      }

      const result = constructPost(100 as Length, 360 as Length, 2500 as Length, customConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it[0].material).toBe(customMaterial)
    })

    it('should use custom width from config', () => {
      const customConfig: FullPostConfig = {
        ...fullPostConfig,
        width: 80 as Length
      }

      const result = constructPost(100 as Length, 360 as Length, 2500 as Length, customConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it[0].size).toEqual([80, 360, 2500])
    })

    it('should generate unique IDs for multiple posts', () => {
      const result1 = constructPost(0 as Length, 360 as Length, 2500 as Length, fullPostConfig, mockResolveMaterial)
      const result2 = constructPost(100 as Length, 360 as Length, 2500 as Length, fullPostConfig, mockResolveMaterial)

      expect(result1.it[0].id).not.toBe(result2.it[0].id)
    })

    it('should generate warning for dimensional material size mismatch', () => {
      const dimensionalConfig: FullPostConfig = {
        type: 'full',
        width: 80 as Length, // Different from material width (120)
        material: dimensionalMaterialId
      }

      const result = constructPost(100 as Length, 200 as Length, 2500 as Length, dimensionalConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].description).toContain('dimensions')
      expect(result.warnings[0].description).toContain("don't match")
      expect(result.warnings[0].elements).toContain(result.it[0].id)
      expect(result.it).toHaveLength(1)
    })

    it('should not generate warning for dimensional material exact match', () => {
      const exactConfig: FullPostConfig = {
        type: 'full',
        width: 120 as Length, // Matches material width
        material: dimensionalMaterialId
      }

      const result = constructPost(100 as Length, 60 as Length, 2500 as Length, exactConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)
    })
  })

  describe('double post construction', () => {
    const doublePostConfig: DoublePostConfig = {
      type: 'double',
      width: 60 as Length,
      thickness: 120 as Length,
      material: mockWoodMaterial,
      infillMaterial: mockStrawMaterial
    }

    it('should create two posts and one infill element without errors', () => {
      const offset = 100 as Length
      const wallThickness = 360 as Length
      const wallHeight = 2500 as Length

      const result = constructPost(offset, wallThickness, wallHeight, doublePostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(3)

      // First post (inside)
      expect(result.it[0].type).toBe('post')
      expect(result.it[0].material).toBe(mockWoodMaterial)
      expect(result.it[0].position).toEqual([100, 0, 0])
      expect(result.it[0].size).toEqual([60, 120, 2500])

      // Second post (outside)
      expect(result.it[1].type).toBe('post')
      expect(result.it[1].material).toBe(mockWoodMaterial)
      expect(result.it[1].position).toEqual([100, 240, 0]) // wallThickness(360) - thickness(120) = 240
      expect(result.it[1].size).toEqual([60, 120, 2500])

      // Infill between posts
      expect(result.it[2].type).toBe('infill')
      expect(result.it[2].material).toBe(mockStrawMaterial)
      expect(result.it[2].position).toEqual([100, 120, 0])
      expect(result.it[2].size).toEqual([60, 120, 2500]) // wallThickness(360) - 2*thickness(240) = 120
    })

    it('should handle zero offset', () => {
      const offset = 0 as Length
      const wallThickness = 360 as Length
      const wallHeight = 2500 as Length

      const result = constructPost(offset, wallThickness, wallHeight, doublePostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(3)
      expect(result.it[0].position).toEqual([0, 0, 0])
      expect(result.it[1].position).toEqual([0, 240, 0])
      expect(result.it[2].position).toEqual([0, 120, 0])
    })

    it('should handle different wall dimensions', () => {
      const offset = 200 as Length
      const wallThickness = 400 as Length
      const wallHeight = 3000 as Length

      const result = constructPost(offset, wallThickness, wallHeight, doublePostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(3)

      // Posts should maintain their thickness
      expect(result.it[0].size).toEqual([60, 120, 3000])
      expect(result.it[1].size).toEqual([60, 120, 3000])

      // Infill should adjust to available space
      expect(result.it[2].size).toEqual([60, 160, 3000]) // 400 - 2*120 = 160

      // Positions should be correct
      expect(result.it[0].position).toEqual([200, 0, 0])
      expect(result.it[1].position).toEqual([200, 280, 0]) // 400 - 120 = 280
      expect(result.it[2].position).toEqual([200, 120, 0])
    })

    it('should use custom post dimensions', () => {
      const customConfig: DoublePostConfig = {
        ...doublePostConfig,
        width: 80 as Length,
        thickness: 100 as Length
      }

      const result = constructPost(100 as Length, 360 as Length, 2500 as Length, customConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(3)

      // Posts with custom dimensions
      expect(result.it[0].size).toEqual([80, 100, 2500])
      expect(result.it[1].size).toEqual([80, 100, 2500])

      // Infill adjusted for custom thickness
      expect(result.it[2].size).toEqual([80, 160, 2500]) // 360 - 2*100 = 160

      // Positions adjusted for custom thickness
      expect(result.it[1].position).toEqual([100, 260, 0]) // 360 - 100 = 260
      expect(result.it[2].position).toEqual([100, 100, 0])
    })

    it('should use correct materials from config', () => {
      const customWoodMaterial = 'custom-wood' as MaterialId
      const customStrawMaterial = 'custom-straw' as MaterialId

      const customConfig: DoublePostConfig = {
        ...doublePostConfig,
        material: customWoodMaterial,
        infillMaterial: customStrawMaterial
      }

      const result = constructPost(100 as Length, 360 as Length, 2500 as Length, customConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it[0].material).toBe(customWoodMaterial)
      expect(result.it[1].material).toBe(customWoodMaterial)
      expect(result.it[2].material).toBe(customStrawMaterial)
    })

    it('should generate unique IDs for all elements', () => {
      const result = constructPost(100 as Length, 360 as Length, 2500 as Length, doublePostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(3)
      expect(result.it[0].id).not.toBe(result.it[1].id)
      expect(result.it[0].id).not.toBe(result.it[2].id)
      expect(result.it[1].id).not.toBe(result.it[2].id)

      // All IDs should be truthy
      expect(result.it[0].id).toBeTruthy()
      expect(result.it[1].id).toBeTruthy()
      expect(result.it[2].id).toBeTruthy()
    })

    it('should not create infill when wall thickness equals exactly 2 * post thickness', () => {
      const wallThickness = 240 as Length // Exactly 2 * thickness (120)

      const result = constructPost(100 as Length, wallThickness, 2500 as Length, doublePostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(2) // Only two posts, no infill

      // Posts should fit exactly
      expect(result.it[0].position).toEqual([100, 0, 0])
      expect(result.it[1].position).toEqual([100, 120, 0]) // 240 - 120 = 120

      // No infill element should be created
      expect(result.it.every(element => element.type === 'post')).toBe(true)
    })

    it('should generate error when wall is too narrow for double posts', () => {
      const narrowWallThickness = 200 as Length // Less than 2 * thickness (240)

      const result = constructPost(
        100 as Length,
        narrowWallThickness,
        2500 as Length,
        doublePostConfig,
        mockResolveMaterial
      )

      expect(result.errors).toHaveLength(1)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1) // Should create single error element

      expect(result.errors[0].description).toContain('not wide enough')
      expect(result.errors[0].description).toContain('240mm minimum')
      expect(result.errors[0].elements).toContain(result.it[0].id)

      // Error element should be a single post
      expect(result.it[0].type).toBe('post')
      expect(result.it[0].size).toEqual([60, 200, 2500])
    })

    it('should generate warning for dimensional material size mismatch', () => {
      const dimensionalConfig: DoublePostConfig = {
        type: 'double',
        width: 80 as Length, // Different from material width (120)
        thickness: 80 as Length, // Different from material thickness (60)
        material: dimensionalMaterialId,
        infillMaterial: mockStrawMaterial
      }

      const result = constructPost(100 as Length, 300 as Length, 2500 as Length, dimensionalConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].description).toContain('dimensions')
      expect(result.warnings[0].description).toContain("don't match")
      expect(result.warnings[0].elements).toContain(result.it[0].id)
      expect(result.warnings[0].elements).toContain(result.it[1].id)
      expect(result.it).toHaveLength(3)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle very small dimensions', () => {
      const fullPostConfig: FullPostConfig = {
        type: 'full',
        width: 1 as Length,
        material: mockWoodMaterial
      }

      const result = constructPost(0 as Length, 1 as Length, 1 as Length, fullPostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)
      expect(result.it[0].size).toEqual([1, 1, 1])
    })

    it('should handle large dimensions', () => {
      const fullPostConfig: FullPostConfig = {
        type: 'full',
        width: 200 as Length,
        material: mockWoodMaterial
      }

      const result = constructPost(1000 as Length, 1000 as Length, 5000 as Length, fullPostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)
      expect(result.it[0].position).toEqual([1000, 0, 0])
      expect(result.it[0].size).toEqual([200, 1000, 5000])
    })

    it('should throw error for invalid post type', () => {
      const invalidConfig = {
        type: 'invalid',
        width: 60 as Length,
        material: mockWoodMaterial
      } as any

      expect(() => {
        constructPost(100 as Length, 360 as Length, 2500 as Length, invalidConfig, mockResolveMaterial)
      }).toThrow('Invalid post type')
    })
  })

  describe('element structure validation', () => {
    it('should maintain correct element structure for full post', () => {
      const fullPostConfig: FullPostConfig = {
        type: 'full',
        width: 60 as Length,
        material: mockWoodMaterial
      }

      const result = constructPost(100 as Length, 360 as Length, 2500 as Length, fullPostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)

      const post = result.it[0]
      expect(post).toHaveProperty('id')
      expect(post).toHaveProperty('type')
      expect(post).toHaveProperty('material')
      expect(post).toHaveProperty('position')
      expect(post).toHaveProperty('size')

      expect(Array.isArray(post.position)).toBe(true)
      expect(Array.isArray(post.size)).toBe(true)
      expect(post.position).toHaveLength(3)
      expect(post.size).toHaveLength(3)
    })

    it('should maintain correct element structure for double post', () => {
      const doublePostConfig: DoublePostConfig = {
        type: 'double',
        width: 60 as Length,
        thickness: 120 as Length,
        material: mockWoodMaterial,
        infillMaterial: mockStrawMaterial
      }

      const result = constructPost(100 as Length, 360 as Length, 2500 as Length, doublePostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)

      result.it.forEach(element => {
        expect(element).toHaveProperty('id')
        expect(element).toHaveProperty('type')
        expect(element).toHaveProperty('material')
        expect(element).toHaveProperty('position')
        expect(element).toHaveProperty('size')

        expect(Array.isArray(element.position)).toBe(true)
        expect(Array.isArray(element.size)).toBe(true)
        expect(element.position).toHaveLength(3)
        expect(element.size).toHaveLength(3)
      })
    })
  })

  describe('coordinate system consistency', () => {
    it('should maintain consistent coordinate system for full post', () => {
      const fullPostConfig: FullPostConfig = {
        type: 'full',
        width: 60 as Length,
        material: mockWoodMaterial
      }

      const offset = 500 as Length
      const result = constructPost(offset, 360 as Length, 2500 as Length, fullPostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)

      const post = result.it[0]

      // Position should follow wall coordinate system
      // [0] = along wall (offset from start)
      // [1] = across wall (0 = inside edge)
      // [2] = elevation (0 = bottom)
      expect(post.position[0]).toBe(offset) // Along wall position
      expect(post.position[1]).toBe(0) // At inside edge
      expect(post.position[2]).toBe(0) // At bottom
    })

    it('should maintain consistent coordinate system for double post', () => {
      const doublePostConfig: DoublePostConfig = {
        type: 'double',
        width: 60 as Length,
        thickness: 120 as Length,
        material: mockWoodMaterial,
        infillMaterial: mockStrawMaterial
      }

      const offset = 500 as Length
      const wallThickness = 360 as Length
      const result = constructPost(offset, wallThickness, 2500 as Length, doublePostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)

      // First post at inside edge
      expect(result.it[0].position[0]).toBe(offset)
      expect(result.it[0].position[1]).toBe(0)
      expect(result.it[0].position[2]).toBe(0)

      // Second post at outside edge
      expect(result.it[1].position[0]).toBe(offset)
      expect(result.it[1].position[1]).toBe(wallThickness - doublePostConfig.thickness)
      expect(result.it[1].position[2]).toBe(0)

      // Infill between posts
      expect(result.it[2].position[0]).toBe(offset)
      expect(result.it[2].position[1]).toBe(doublePostConfig.thickness)
      expect(result.it[2].position[2]).toBe(0)
    })
  })
})
