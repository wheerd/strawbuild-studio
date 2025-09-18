import { describe, it, expect } from 'vitest'
import type { Length, Vec3 } from '@/types/geometry'
import type { MaterialId, Material } from './material'
import { DEFAULT_MATERIALS } from './material'
import { constructPost, type FullPostConfig, type DoublePostConfig } from './posts'
import { getElementPosition, getElementSize, type Cuboid } from './base'

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
      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 360 as Length, 2500 as Length]

      const result = constructPost(position, size, fullPostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)

      const post = result.it[0]
      expect(post.type).toBe('post')
      expect(post.material).toBe(mockWoodMaterial)
      expect(getElementPosition(post)).toEqual([100, 0, 0])
      expect(getElementSize(post)).toEqual([60, 360, 2500])
      expect(post.id).toBeTruthy()
    })

    it('should handle zero offset', () => {
      const position: Vec3 = [0 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 360 as Length, 2500 as Length]

      const result = constructPost(position, size, fullPostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)
      expect(result.it[0].shape.position).toEqual([0, 0, 0])
      expect(result.it[0].shape.size).toEqual([60, 360, 2500])
    })

    it('should handle different wall dimensions', () => {
      const position: Vec3 = [50 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 240 as Length, 3000 as Length]

      const result = constructPost(position, size, fullPostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)
      expect(result.it[0].shape.position).toEqual([50, 0, 0])
      expect(result.it[0].shape.size).toEqual([60, 240, 3000])
    })

    it('should use correct material from config', () => {
      const customMaterial = 'custom-wood-material' as MaterialId
      const customConfig: FullPostConfig = {
        ...fullPostConfig,
        material: customMaterial
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 360 as Length, 2500 as Length]

      const result = constructPost(position, size, customConfig, mockResolveMaterial)

      expect(result.it[0].material).toBe(customMaterial)
    })

    it('should use custom width from config', () => {
      const customConfig: FullPostConfig = {
        ...fullPostConfig,
        width: 80 as Length
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [80 as Length, 360 as Length, 2500 as Length]

      const result = constructPost(position, size, customConfig, mockResolveMaterial)

      expect(result.it[0].shape.size).toEqual([80, 360, 2500])
    })

    it('should generate unique IDs for multiple posts', () => {
      const position1: Vec3 = [0 as Length, 0 as Length, 0 as Length]
      const position2: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 360 as Length, 2500 as Length]

      const result1 = constructPost(position1, size, fullPostConfig, mockResolveMaterial)
      const result2 = constructPost(position2, size, fullPostConfig, mockResolveMaterial)

      expect(result1.it[0].id).not.toBe(result2.it[0].id)
    })

    it('should generate warning for dimensional material size mismatch', () => {
      const dimensionalConfig: FullPostConfig = {
        type: 'full',
        width: 100 as Length, // Different from material width (120)
        material: dimensionalMaterialId
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [100 as Length, 200 as Length, 2500 as Length] // Different thickness (200 vs 60)

      const result = constructPost(position, size, dimensionalConfig, mockResolveMaterial)

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].description).toContain("don't match material dimensions")
    })

    it('should not generate warning for dimensional material exact match', () => {
      const exactConfig: FullPostConfig = {
        type: 'full',
        width: 120 as Length, // Matches material width
        material: dimensionalMaterialId
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [120 as Length, 60 as Length, 2500 as Length] // Matches material thickness

      const result = constructPost(position, size, exactConfig, mockResolveMaterial)

      expect(result.warnings).toHaveLength(0)
    })

    it('should not generate warning for swapped material dimensions (60x120 post with 120x60 material)', () => {
      const swappedConfig: FullPostConfig = {
        type: 'full',
        width: 60 as Length, // Swapped: material.thickness (60)
        material: dimensionalMaterialId
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 120 as Length, 2500 as Length] // Swapped: material.width (120)

      const result = constructPost(position, size, swappedConfig, mockResolveMaterial)

      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)
      const post = result.it[0].shape as Cuboid
      expect(post.size).toEqual([60, 120, 2500])
    })

    it('should not generate warning for original dimensions (120x60 post with 120x60 material)', () => {
      const originalConfig: FullPostConfig = {
        type: 'full',
        width: 120 as Length, // Original: material.width (120)
        material: dimensionalMaterialId
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [120 as Length, 60 as Length, 2500 as Length] // Original: material.thickness (60)

      const result = constructPost(position, size, originalConfig, mockResolveMaterial)

      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(1)
      const post = result.it[0].shape as Cuboid
      expect(post.size).toEqual([120, 60, 2500])
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
      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 360 as Length, 2500 as Length]

      const result = constructPost(position, size, doublePostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(3) // 2 posts + 1 infill

      const [post1, post2, infill] = result.it

      // First post at front
      expect(post1.type).toBe('post')
      expect(post1.shape.position).toEqual([100, 0, 0])
      expect(post1.shape.size).toEqual([60, 120, 2500])

      // Second post at back
      expect(post2.type).toBe('post')
      expect(post2.shape.position).toEqual([100, 240, 0]) // 360 - 120 = 240
      expect(post2.shape.size).toEqual([60, 120, 2500])

      // Infill between posts
      expect(infill.type).toBe('infill')
      expect(infill.shape.position).toEqual([100, 120, 0])
      expect(infill.shape.size).toEqual([60, 120, 2500]) // 360 - 2*120 = 120
    })

    it('should handle zero offset', () => {
      const position: Vec3 = [0 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 360 as Length, 2500 as Length]

      const result = constructPost(position, size, doublePostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.it[0].shape.position).toEqual([0, 0, 0])
      expect(result.it[1].shape.position).toEqual([0, 240, 0])
      expect(result.it[2].shape.position).toEqual([0, 120, 0])
    })

    it('should handle different wall dimensions', () => {
      const position: Vec3 = [50 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 300 as Length, 3000 as Length]

      const result = constructPost(position, size, doublePostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.it).toHaveLength(3)

      expect(result.it[0].shape.position).toEqual([50, 0, 0])
      expect(result.it[0].shape.size).toEqual([60, 120, 3000])

      expect(result.it[1].shape.position).toEqual([50, 180, 0]) // 300 - 120 = 180
      expect(result.it[1].shape.size).toEqual([60, 120, 3000])

      expect(result.it[2].shape.position).toEqual([50, 120, 0])
      expect(result.it[2].shape.size).toEqual([60, 60, 3000]) // 300 - 2*120 = 60
    })

    it('should use custom post dimensions', () => {
      const customConfig: DoublePostConfig = {
        ...doublePostConfig,
        width: 80 as Length,
        thickness: 100 as Length
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [80 as Length, 360 as Length, 2500 as Length]

      const result = constructPost(position, size, customConfig, mockResolveMaterial)

      expect(result.it[0].shape.size).toEqual([80, 100, 2500])
      expect(result.it[1].shape.size).toEqual([80, 100, 2500])
      expect(result.it[2].shape.size).toEqual([80, 160, 2500]) // 360 - 2*100 = 160
    })

    it('should use correct materials from config', () => {
      const customPostMaterial = 'custom-post-material' as MaterialId
      const customInfillMaterial = 'custom-infill-material' as MaterialId
      const customConfig: DoublePostConfig = {
        ...doublePostConfig,
        material: customPostMaterial,
        infillMaterial: customInfillMaterial
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 360 as Length, 2500 as Length]

      const result = constructPost(position, size, customConfig, mockResolveMaterial)

      expect(result.it[0].material).toBe(customPostMaterial)
      expect(result.it[1].material).toBe(customPostMaterial)
      expect(result.it[2].material).toBe(customInfillMaterial)
    })

    it('should generate unique IDs for all elements', () => {
      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 360 as Length, 2500 as Length]

      const result = constructPost(position, size, doublePostConfig, mockResolveMaterial)

      const ids = result.it.map(element => element.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(3)
    })

    it('should not create infill when wall thickness equals exactly 2 * post thickness', () => {
      const config: DoublePostConfig = {
        ...doublePostConfig,
        thickness: 120 as Length
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 240 as Length, 2500 as Length] // Exactly 2 * 120

      const result = constructPost(position, size, config, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.it).toHaveLength(2) // Only 2 posts, no infill
      expect(result.it[0].type).toBe('post')
      expect(result.it[1].type).toBe('post')
    })

    it('should generate error when wall is too narrow for double posts', () => {
      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 200 as Length, 2500 as Length] // Less than 2 * 120 = 240

      const result = constructPost(position, size, doublePostConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].description).toContain('not wide enough for double posts')
      expect(result.it).toHaveLength(1) // Error element
    })

    it('should generate warning for dimensional material size mismatch', () => {
      const dimensionalConfig: DoublePostConfig = {
        type: 'double',
        width: 100 as Length, // Different from material width (120)
        thickness: 100 as Length, // Different from material thickness (60)
        material: dimensionalMaterialId,
        infillMaterial: mockStrawMaterial
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [100 as Length, 300 as Length, 2500 as Length]

      const result = constructPost(position, size, dimensionalConfig, mockResolveMaterial)

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].description).toContain("don't match material dimensions")
    })

    it('should not generate warning for swapped material dimensions (60x120 posts with 120x60 material)', () => {
      const swappedConfig: DoublePostConfig = {
        type: 'double',
        width: 60 as Length, // Swapped: material.thickness (60)
        thickness: 120 as Length, // Swapped: material.width (120)
        material: dimensionalMaterialId,
        infillMaterial: mockStrawMaterial
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 300 as Length, 2500 as Length]

      const result = constructPost(position, size, swappedConfig, mockResolveMaterial)

      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(3) // 2 posts + 1 infill
    })

    it('should not generate warning for original dimensions (120x60 posts with 120x60 material)', () => {
      const originalConfig: DoublePostConfig = {
        type: 'double',
        width: 120 as Length, // Original: material.width (120)
        thickness: 60 as Length, // Original: material.thickness (60)
        material: dimensionalMaterialId,
        infillMaterial: mockStrawMaterial
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [120 as Length, 200 as Length, 2500 as Length]

      const result = constructPost(position, size, originalConfig, mockResolveMaterial)

      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(3) // 2 posts + 1 infill
    })
  })

  describe('edge cases and error handling', () => {
    const fullPostConfig: FullPostConfig = {
      type: 'full',
      width: 60 as Length,
      material: mockWoodMaterial
    }

    it('should handle very small dimensions', () => {
      const position: Vec3 = [0 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [1 as Length, 1 as Length, 1 as Length]

      const result = constructPost(position, size, fullPostConfig, mockResolveMaterial)

      expect(result.it).toHaveLength(1)
      expect(result.it[0].shape.size).toEqual([60, 1, 1])
    })

    it('should handle large dimensions', () => {
      const position: Vec3 = [1000 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 1000 as Length, 5000 as Length]

      const result = constructPost(position, size, fullPostConfig, mockResolveMaterial)

      expect(result.it).toHaveLength(1)
      expect(result.it[0].shape.position).toEqual([1000, 0, 0])
      expect(result.it[0].shape.size).toEqual([60, 1000, 5000])
    })

    it('should throw error for invalid post type', () => {
      const invalidConfig = {
        type: 'invalid' as any,
        width: 60 as Length,
        material: mockWoodMaterial
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 360 as Length, 2500 as Length]

      expect(() => constructPost(position, size, invalidConfig, mockResolveMaterial)).toThrow('Invalid post type')
    })
  })

  describe('element structure validation', () => {
    it('should maintain correct element structure for full post', () => {
      const fullPostConfig: FullPostConfig = {
        type: 'full',
        width: 60 as Length,
        material: mockWoodMaterial
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 360 as Length, 2500 as Length]

      const result = constructPost(position, size, fullPostConfig, mockResolveMaterial)

      const post = result.it[0]
      expect(post).toHaveProperty('id')
      expect(post).toHaveProperty('type', 'post')
      expect(post).toHaveProperty('material')
      expect(post).toHaveProperty('shape')
    })

    it('should maintain correct element structure for double post', () => {
      const doublePostConfig: DoublePostConfig = {
        type: 'double',
        width: 60 as Length,
        thickness: 120 as Length,
        material: mockWoodMaterial,
        infillMaterial: mockStrawMaterial
      }

      const position: Vec3 = [100 as Length, 0 as Length, 0 as Length]
      const size: Vec3 = [60 as Length, 360 as Length, 2500 as Length]

      const result = constructPost(position, size, doublePostConfig, mockResolveMaterial)

      result.it.forEach(element => {
        expect(element).toHaveProperty('id')
        expect(element).toHaveProperty('type')
        expect(element).toHaveProperty('material')
        expect(element).toHaveProperty('shape')
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

      const position: Vec3 = [200 as Length, 50 as Length, 100 as Length]
      const size: Vec3 = [60 as Length, 360 as Length, 2500 as Length]

      const result = constructPost(position, size, fullPostConfig, mockResolveMaterial)

      expect(result.it[0].shape.type).toBe('cuboid')
      const cuboid = result.it[0].shape as Cuboid
      expect(cuboid.position).toEqual([200, 50, 100])
      expect(cuboid.size).toEqual([60, 360, 2500])
    })

    it('should maintain consistent coordinate system for double post', () => {
      const doublePostConfig: DoublePostConfig = {
        type: 'double',
        width: 60 as Length,
        thickness: 120 as Length,
        material: mockWoodMaterial,
        infillMaterial: mockStrawMaterial
      }

      const position: Vec3 = [200 as Length, 50 as Length, 100 as Length]
      const size: Vec3 = [60 as Length, 360 as Length, 2500 as Length]

      const result = constructPost(position, size, doublePostConfig, mockResolveMaterial)

      // First post should be at the original position
      expect(result.it[0].shape.position).toEqual([200, 50, 100])

      // Second post should be offset by wall thickness - post thickness
      expect(result.it[1].shape.position).toEqual([200, 290, 100]) // 50 + 360 - 120 = 290

      // Infill should be between the posts
      expect(result.it[2].shape.position).toEqual([200, 170, 100]) // 50 + 120 = 170
    })
  })
})
