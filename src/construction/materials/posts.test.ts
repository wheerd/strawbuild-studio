import { describe, expect, it } from 'vitest'

import { type Cuboid, getElementPosition, getElementSize } from '@/construction/elements'
import { aggregateResults } from '@/construction/results'
import type { Length, Vec3 } from '@/shared/geometry'

import type { Material, MaterialId } from './material'
import { DEFAULT_MATERIALS } from './material'
import { type DoublePostConfig, type FullPostConfig, constructPost } from './posts'

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
      const position: Vec3 = [100, 50, 25]
      const size: Vec3 = [60, 360, 3000]

      const results = [...constructPost(position, size, fullPostConfig, mockResolveMaterial)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const post = elements[0]
      expect(post.type).toBe('post')
      expect(post.material).toBe(mockWoodMaterial)
      expect(post.shape.type).toBe('cuboid')
      expect((post.shape as Cuboid).position).toEqual([100, 50, 25])
      expect((post.shape as Cuboid).size).toEqual([60, 360, 3000])
    })

    it('should handle zero offset', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [60, 360, 3000]

      const results = [...constructPost(position, size, fullPostConfig, mockResolveMaterial)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)
      expect(getElementPosition(elements[0])).toEqual([0, 0, 0])
      expect(getElementSize(elements[0])).toEqual([60, 360, 3000])
    })

    it('should handle different wall dimensions', () => {
      const position: Vec3 = [200, 100, 0]
      const size: Vec3 = [60, 180, 2500]

      const results = [...constructPost(position, size, fullPostConfig, mockResolveMaterial)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)
      expect(getElementPosition(elements[0])).toEqual([200, 100, 0])
      expect(getElementSize(elements[0])).toEqual([60, 180, 2500])
    })

    it('should use correct material from config', () => {
      const customMaterial = 'custom-wood' as MaterialId
      const config: FullPostConfig = {
        ...fullPostConfig,
        material: customMaterial
      }

      const results = [...constructPost([0, 0, 0], [60, 360, 3000], config, mockResolveMaterial)]
      const { elements } = aggregateResults(results)

      expect(elements[0].material).toBe(customMaterial)
    })

    it('should use custom width from config', () => {
      const config: FullPostConfig = {
        ...fullPostConfig,
        width: 80 as Length
      }

      const results = [...constructPost([0, 0, 0], [80, 360, 3000], config, mockResolveMaterial)]
      const { elements } = aggregateResults(results)

      expect(getElementSize(elements[0])).toEqual([80, 360, 3000])
    })

    it('should generate unique IDs for multiple posts', () => {
      const results1 = [...constructPost([0, 0, 0], [60, 360, 3000], fullPostConfig, mockResolveMaterial)]
      const results2 = [...constructPost([100, 0, 0], [60, 360, 3000], fullPostConfig, mockResolveMaterial)]
      const { elements: elements1 } = aggregateResults(results1)
      const { elements: elements2 } = aggregateResults(results2)

      expect(elements1[0].id).not.toBe(elements2[0].id)
    })

    it('should generate warning for dimensional material size mismatch', () => {
      const config: FullPostConfig = {
        ...fullPostConfig,
        material: dimensionalMaterialId,
        width: 80 as Length // Doesn't match material dimensions
      }

      const results = [...constructPost([0, 0, 0], [80, 200, 3000], config, mockResolveMaterial)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(1)
      expect(warnings[0].description).toContain('dimensions')
    })

    it('should not generate warning for dimensional material exact match', () => {
      const config: FullPostConfig = {
        ...fullPostConfig,
        material: dimensionalMaterialId,
        width: 120 as Length // Matches material width
      }

      const results = [...constructPost([0, 0, 0], [120, 60, 3000], config, mockResolveMaterial)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(0)
    })

    it('should not generate warning for swapped material dimensions (60x120 post with 120x60 material)', () => {
      const config: FullPostConfig = {
        ...fullPostConfig,
        material: dimensionalMaterialId,
        width: 60 as Length // Swapped dimension match
      }

      const results = [...constructPost([0, 0, 0], [60, 120, 3000], config, mockResolveMaterial)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(0)
    })

    it('should not generate warning for original dimensions (120x60 post with 120x60 material)', () => {
      const config: FullPostConfig = {
        ...fullPostConfig,
        material: dimensionalMaterialId,
        width: 120 as Length // Original dimension match
      }

      const results = [...constructPost([0, 0, 0], [120, 60, 3000], config, mockResolveMaterial)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(0)
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
      const position: Vec3 = [100, 50, 25]
      const size: Vec3 = [60, 360, 3000]

      const results = [...constructPost(position, size, doublePostConfig, mockResolveMaterial)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(3)

      // First post
      expect(elements[0].type).toBe('post')
      expect(elements[0].material).toBe(mockWoodMaterial)
      expect(getElementPosition(elements[0])).toEqual([100, 50, 25])
      expect(getElementSize(elements[0])).toEqual([60, 120, 3000])

      // Second post
      expect(elements[1].type).toBe('post')
      expect(elements[1].material).toBe(mockWoodMaterial)
      expect(getElementPosition(elements[1])).toEqual([100, 290, 25])
      expect(getElementSize(elements[1])).toEqual([60, 120, 3000])

      // Infill
      expect(elements[2].type).toBe('infill')
      expect(elements[2].material).toBe(mockStrawMaterial)
      expect(getElementPosition(elements[2])).toEqual([100, 170, 25])
      expect(getElementSize(elements[2])).toEqual([60, 120, 3000])
    })

    it('should handle zero offset', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [60, 360, 3000]

      const results = [...constructPost(position, size, doublePostConfig, mockResolveMaterial)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(3)
      expect(getElementPosition(elements[0])).toEqual([0, 0, 0])
      expect(getElementPosition(elements[1])).toEqual([0, 240, 0])
      expect(getElementPosition(elements[2])).toEqual([0, 120, 0])
    })

    it('should handle different wall dimensions', () => {
      const position: Vec3 = [200, 100, 0]
      const size: Vec3 = [60, 400, 2500]

      const results = [...constructPost(position, size, doublePostConfig, mockResolveMaterial)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(3)
      expect(getElementPosition(elements[0])).toEqual([200, 100, 0])
      expect(getElementPosition(elements[1])).toEqual([200, 380, 0])
      expect(getElementPosition(elements[2])).toEqual([200, 220, 0])
    })

    it('should use custom post dimensions', () => {
      const config: DoublePostConfig = {
        ...doublePostConfig,
        width: 80 as Length,
        thickness: 150 as Length
      }

      const results = [...constructPost([0, 0, 0], [80, 400, 3000], config, mockResolveMaterial)]
      const { elements } = aggregateResults(results)

      expect(getElementSize(elements[0])).toEqual([80, 150, 3000])
      expect(getElementSize(elements[1])).toEqual([80, 150, 3000])
      expect(getElementSize(elements[2])).toEqual([80, 100, 3000])
    })

    it('should use correct materials from config', () => {
      const customWood = 'custom-wood' as MaterialId
      const customStraw = 'custom-straw' as MaterialId
      const config: DoublePostConfig = {
        ...doublePostConfig,
        material: customWood,
        infillMaterial: customStraw
      }

      const results = [...constructPost([0, 0, 0], [60, 360, 3000], config, mockResolveMaterial)]
      const { elements } = aggregateResults(results)

      expect(elements[0].material).toBe(customWood)
      expect(elements[1].material).toBe(customWood)
      expect(elements[2].material).toBe(customStraw)
    })

    it('should generate unique IDs for all elements', () => {
      const results = [...constructPost([0, 0, 0], [60, 360, 3000], doublePostConfig, mockResolveMaterial)]
      const { elements } = aggregateResults(results)

      const ids = elements.map(e => e.id)
      expect(new Set(ids).size).toBe(3) // All IDs should be unique
    })

    it('should not create infill when wall thickness equals exactly 2 * post thickness', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [60, 240, 3000] // Exactly 2 * 120

      const results = [...constructPost(position, size, doublePostConfig, mockResolveMaterial)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(2) // Only two posts, no infill
      expect(elements.every(e => e.type === 'post')).toBe(true)
    })

    it('should generate error when wall is too narrow for double posts', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [60, 200, 3000] // Less than 2 * 120

      const results = [...constructPost(position, size, doublePostConfig, mockResolveMaterial)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)
      expect(errors[0].description).toContain('not wide enough')
    })

    it('should generate warning for dimensional material size mismatch', () => {
      const config: DoublePostConfig = {
        ...doublePostConfig,
        material: dimensionalMaterialId,
        width: 80 as Length,
        thickness: 100 as Length
      }

      const results = [...constructPost([0, 0, 0], [80, 300, 3000], config, mockResolveMaterial)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(1)
      expect(warnings[0].description).toContain('dimensions')
    })

    it('should not generate warning for swapped material dimensions (60x120 posts with 120x60 material)', () => {
      const config: DoublePostConfig = {
        ...doublePostConfig,
        material: dimensionalMaterialId,
        width: 60 as Length,
        thickness: 120 as Length
      }

      const results = [...constructPost([0, 0, 0], [60, 300, 3000], config, mockResolveMaterial)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(0)
    })

    it('should not generate warning for original dimensions (120x60 posts with 120x60 material)', () => {
      const config: DoublePostConfig = {
        ...doublePostConfig,
        material: dimensionalMaterialId,
        width: 120 as Length,
        thickness: 60 as Length
      }

      const results = [...constructPost([0, 0, 0], [120, 200, 3000], config, mockResolveMaterial)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(0)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle very small dimensions', () => {
      const config: FullPostConfig = {
        type: 'full',
        width: 1 as Length,
        material: mockWoodMaterial
      }

      const results = [...constructPost([0, 0, 0], [1, 1, 1], config, mockResolveMaterial)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)
    })

    it('should handle large dimensions', () => {
      const config: FullPostConfig = {
        type: 'full',
        width: 1000 as Length,
        material: mockWoodMaterial
      }

      const results = [...constructPost([0, 0, 0], [1000, 5000, 10000], config, mockResolveMaterial)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)
    })

    it('should throw error for invalid post type', () => {
      const invalidConfig = { type: 'invalid' } as any

      expect(() => {
        return [...constructPost([0, 0, 0], [60, 360, 3000], invalidConfig, mockResolveMaterial)]
      }).toThrow('Invalid post type')
    })
  })

  describe('element structure validation', () => {
    it('should maintain correct element structure for full post', () => {
      const config: FullPostConfig = {
        type: 'full',
        width: 60 as Length,
        material: mockWoodMaterial
      }

      const results = [...constructPost([0, 0, 0], [60, 360, 3000], config, mockResolveMaterial)]
      const { elements } = aggregateResults(results)

      const post = elements[0]
      expect(post.id).toBeTruthy()
      expect(post.type).toBe('post')
      expect(post.material).toBeTruthy()
      expect(post.shape).toBeTruthy()
      expect(post.shape.type).toBe('cuboid')
    })

    it('should maintain correct element structure for double post', () => {
      const config: DoublePostConfig = {
        type: 'double',
        width: 60 as Length,
        thickness: 120 as Length,
        material: mockWoodMaterial,
        infillMaterial: mockStrawMaterial
      }

      const results = [...constructPost([0, 0, 0], [60, 360, 3000], config, mockResolveMaterial)]
      const { elements } = aggregateResults(results)

      elements.forEach(element => {
        expect(element.id).toBeTruthy()
        expect(['post', 'infill']).toContain(element.type)
        expect(element.material).toBeTruthy()
        expect(element.shape).toBeTruthy()
        expect(element.shape.type).toBe('cuboid')
      })
    })
  })

  describe('coordinate system consistency', () => {
    it('should maintain consistent coordinate system for full post', () => {
      const position: Vec3 = [100, 200, 300]
      const size: Vec3 = [60, 180, 2400]
      const config: FullPostConfig = {
        type: 'full',
        width: 60 as Length,
        material: mockWoodMaterial
      }

      const results = [...constructPost(position, size, config, mockResolveMaterial)]
      const { elements } = aggregateResults(results)

      const post = elements[0]
      const postPosition = getElementPosition(post)
      const postSize = getElementSize(post)

      expect(postPosition[0]).toBe(position[0])
      expect(postPosition[1]).toBe(position[1])
      expect(postPosition[2]).toBe(position[2])
      expect(postSize[0]).toBe(60) // width from config
      expect(postSize[1]).toBe(size[1])
      expect(postSize[2]).toBe(size[2])
    })

    it('should maintain consistent coordinate system for double post', () => {
      const position: Vec3 = [100, 200, 300]
      const size: Vec3 = [60, 360, 2400]
      const config: DoublePostConfig = {
        type: 'double',
        width: 60 as Length,
        thickness: 120 as Length,
        material: mockWoodMaterial,
        infillMaterial: mockStrawMaterial
      }

      const results = [...constructPost(position, size, config, mockResolveMaterial)]
      const { elements } = aggregateResults(results)

      // First post should be at original position
      expect(getElementPosition(elements[0])).toEqual([100, 200, 300])

      // Second post should be at the far end
      expect(getElementPosition(elements[1])).toEqual([100, 440, 300])

      // Infill should be in between
      expect(getElementPosition(elements[2])).toEqual([100, 320, 300])
    })
  })
})
