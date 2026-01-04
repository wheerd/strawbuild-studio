import { keyFromSelector } from 'i18next'
import { describe, expect, it, vi } from 'vitest'

import type { ConstructionElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import { aggregateResults } from '@/construction/results'
import type { CuboidShape } from '@/construction/shapes'
import { getPosition, newVec3 } from '@/shared/geometry'

import type { Material, MaterialId } from './material'
import { roughWood } from './material'
import { type DoublePostConfig, type FullPostConfig, constructPost } from './posts'

const mockWoodMaterial = 'wood-material' as MaterialId
const mockStrawMaterial = 'straw-material' as MaterialId

const dimensionalMaterialId = roughWood.id

vi.mock('./store', () => ({
  getMaterialById: vi.fn().mockImplementation((materialId: MaterialId): Material | undefined => {
    if (materialId === dimensionalMaterialId) {
      return roughWood
    }
    // Return undefined for mock materials (no warnings)
    return undefined
  })
}))

describe('constructPost', () => {
  describe('full post construction', () => {
    const fullPostConfig: FullPostConfig = {
      type: 'full',
      width: 60,
      material: mockWoodMaterial
    }

    it('should create a single full post element without errors', () => {
      const position = newVec3(100, 50, 25)
      const size = newVec3(60, 360, 3000)
      const area = new WallConstructionArea(position, size)

      const results = [...constructPost(area, fullPostConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const post = elements[0]
      expect('material' in post).toBe(true) // Should be ConstructionElement, not ConstructionGroup
      const postElement = post as ConstructionElement
      expect(postElement.material).toBe(mockWoodMaterial)
      expect(postElement.shape.base?.type).toBe('cuboid')
      expect(getPosition(postElement.transform)).toEqual(newVec3(100, 50, 25)) // Corner-based positioning
      expect((postElement.shape.base as CuboidShape).size).toEqual(newVec3(60, 360, 3000))
    })

    it('should handle zero offset', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(60, 360, 3000)
      const area = new WallConstructionArea(position, size)

      const results = [...constructPost(area, fullPostConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const post = elements[0]
      expect('material' in post).toBe(true)
      const postElement = post as ConstructionElement
      expect(getPosition(postElement.transform)).toEqual(newVec3(0, 0, 0))
      expect((postElement.shape.base as CuboidShape).size).toEqual(newVec3(60, 360, 3000))
    })

    it('should handle different wall dimensions', () => {
      const position = newVec3(200, 100, 0)
      const size = newVec3(60, 180, 2500)
      const area = new WallConstructionArea(position, size)

      const results = [...constructPost(area, fullPostConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const post = elements[0]
      expect('material' in post).toBe(true)
      const postElement = post as ConstructionElement
      const postShape = postElement.shape.base as CuboidShape
      expect(getPosition(postElement.transform)).toEqual(newVec3(200, 100, 0))
      expect(postShape.size).toEqual(newVec3(60, 180, 2500))
    })

    it('should use correct material from config', () => {
      const customMaterial = 'custom-wood' as MaterialId
      const config: FullPostConfig = {
        ...fullPostConfig,
        material: customMaterial
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(60, 360, 3000)), config)]
      const { elements } = aggregateResults(results)

      expect((elements[0] as ConstructionElement).material).toBe(customMaterial)
    })

    it('should use custom width from config', () => {
      const config: FullPostConfig = {
        ...fullPostConfig,
        width: 80
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(80, 360, 3000)), config)]
      const { elements } = aggregateResults(results)

      const post = elements[0]
      expect('material' in post).toBe(true)
      const postElement = post as ConstructionElement
      expect((postElement.shape.base as CuboidShape).size).toEqual(newVec3(80, 360, 3000))
    })

    it('should generate unique IDs for multiple posts', () => {
      const results1 = [
        ...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(60, 360, 3000)), fullPostConfig)
      ]
      const results2 = [
        ...constructPost(new WallConstructionArea(newVec3(100, 0, 0), newVec3(60, 360, 3000)), fullPostConfig)
      ]
      const { elements: elements1 } = aggregateResults(results1)
      const { elements: elements2 } = aggregateResults(results2)

      expect(elements1[0].id).not.toBe(elements2[0].id)
    })

    it('should generate warning for dimensional material size mismatch', () => {
      const config: FullPostConfig = {
        ...fullPostConfig,
        material: dimensionalMaterialId,
        width: 80 // Doesn't match material dimensions
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(80, 200, 3000)), config)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(1)
      expect(keyFromSelector(warnings[0].messageKey)).toBe('construction.post.dimensionsMismatch')
    })

    it('should not generate warning for dimensional material exact match', () => {
      const config: FullPostConfig = {
        ...fullPostConfig,
        material: dimensionalMaterialId,
        width: 120 // Matches material width
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(120, 60, 3000)), config)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(0)
    })

    it('should not generate warning for swapped material dimensions (60x120 post with 120x60 material)', () => {
      const config: FullPostConfig = {
        ...fullPostConfig,
        material: dimensionalMaterialId,
        width: 60 // Swapped dimension match
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(60, 120, 3000)), config)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(0)
    })

    it('should not generate warning for original dimensions (120x60 post with 120x60 material)', () => {
      const config: FullPostConfig = {
        ...fullPostConfig,
        material: dimensionalMaterialId,
        width: 120 // Original dimension match
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(120, 60, 3000)), config)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(0)
    })
  })

  describe('double post construction', () => {
    const doublePostConfig: DoublePostConfig = {
      type: 'double',
      width: 60,
      thickness: 120,
      material: mockWoodMaterial,
      infillMaterial: mockStrawMaterial
    }

    it('should create two posts and one infill element without errors', () => {
      const position = newVec3(100, 50, 25)
      const size = newVec3(60, 360, 3000)
      const area = new WallConstructionArea(position, size)

      const results = [...constructPost(area, doublePostConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(3)

      // First post
      expect('material' in elements[0]).toBe(true)
      const firstPost = elements[0] as ConstructionElement
      const firstShape = firstPost.shape.base as CuboidShape
      expect(firstPost.material).toBe(mockWoodMaterial)
      expect(getPosition(firstPost.transform)).toEqual(newVec3(100, 50, 25))
      expect(firstShape.size).toEqual(newVec3(60, 120, 3000))

      // Second post
      expect('material' in elements[1]).toBe(true)
      const secondPost = elements[1] as ConstructionElement
      const secondShape = secondPost.shape.base as CuboidShape
      expect(secondPost.material).toBe(mockWoodMaterial)
      expect(getPosition(secondPost.transform)).toEqual(newVec3(100, 290, 25))
      expect(secondShape.size).toEqual(newVec3(60, 120, 3000))

      // Infill
      expect('material' in elements[2]).toBe(true)
      const infillElement = elements[2] as ConstructionElement
      const infillShape = infillElement.shape.base as CuboidShape
      expect(infillElement.material).toBe(mockStrawMaterial)
      expect(getPosition(infillElement.transform)).toEqual(newVec3(100, 170, 25))
      expect(infillShape.size).toEqual(newVec3(60, 120, 3000))
    })

    it('should handle zero offset', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(60, 360, 3000)
      const area = new WallConstructionArea(position, size)

      const results = [...constructPost(area, doublePostConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(3)
      // Check element positions via shape offset
      expect('material' in elements[0]).toBe(true)
      expect('material' in elements[1]).toBe(true)
      expect('material' in elements[2]).toBe(true)
      expect(getPosition(elements[0].transform)).toEqual(newVec3(0, 0, 0))
      expect(getPosition(elements[1].transform)).toEqual(newVec3(0, 240, 0))
      expect(getPosition(elements[2].transform)).toEqual(newVec3(0, 120, 0))
    })

    it('should handle different wall dimensions', () => {
      const position = newVec3(200, 100, 0)
      const size = newVec3(60, 400, 2500)
      const area = new WallConstructionArea(position, size)

      const results = [...constructPost(area, doublePostConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(3)
      // Check element positions via shape offset
      expect('material' in elements[0]).toBe(true)
      expect('material' in elements[1]).toBe(true)
      expect('material' in elements[2]).toBe(true)
      expect(getPosition(elements[0].transform)).toEqual(newVec3(200, 100, 0))
      expect(getPosition(elements[1].transform)).toEqual(newVec3(200, 380, 0))
      expect(getPosition(elements[2].transform)).toEqual(newVec3(200, 220, 0))
    })

    it('should use custom post dimensions', () => {
      const config: DoublePostConfig = {
        ...doublePostConfig,
        width: 80,
        thickness: 150
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(80, 400, 3000)), config)]
      const { elements } = aggregateResults(results)

      // Check element sizes via shape size
      expect('material' in elements[0]).toBe(true)
      expect('material' in elements[1]).toBe(true)
      expect('material' in elements[2]).toBe(true)
      expect(((elements[0] as ConstructionElement).shape.base as CuboidShape).size).toEqual(newVec3(80, 150, 3000))
      expect(((elements[1] as ConstructionElement).shape.base as CuboidShape).size).toEqual(newVec3(80, 150, 3000))
      expect(((elements[2] as ConstructionElement).shape.base as CuboidShape).size).toEqual(newVec3(80, 100, 3000))
    })

    it('should use correct materials from config', () => {
      const customWood = 'custom-wood' as MaterialId
      const customStraw = 'custom-straw' as MaterialId
      const config: DoublePostConfig = {
        ...doublePostConfig,
        material: customWood,
        infillMaterial: customStraw
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(60, 360, 3000)), config)]
      const { elements } = aggregateResults(results)

      expect((elements[0] as ConstructionElement).material).toBe(customWood)
      expect((elements[1] as ConstructionElement).material).toBe(customWood)
      expect((elements[2] as ConstructionElement).material).toBe(customStraw)
    })

    it('should generate unique IDs for all elements', () => {
      const results = [
        ...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(60, 360, 3000)), doublePostConfig)
      ]
      const { elements } = aggregateResults(results)

      const ids = elements.map(e => e.id)
      expect(new Set(ids).size).toBe(3) // All IDs should be unique
    })

    it('should not create infill when wall thickness equals exactly 2 * post thickness', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(60, 240, 3000) // Exactly 2 * 120
      const area = new WallConstructionArea(position, size)

      const results = [...constructPost(area, doublePostConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(2) // Only two posts, no infill
      expect(elements.every(e => 'material' in e)).toBe(true) // All should be ConstructionElements
    })

    it('should generate error when wall is too narrow for double posts', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(60, 200, 3000) // Less than 2 * 120
      const area = new WallConstructionArea(position, size)

      const results = [...constructPost(area, doublePostConfig)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)
      expect(keyFromSelector(errors[0].messageKey)).toBe('construction.post.wallTooThin')
    })

    it('should generate warning for dimensional material size mismatch', () => {
      const config: DoublePostConfig = {
        ...doublePostConfig,
        material: dimensionalMaterialId,
        width: 80,
        thickness: 100
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(80, 300, 3000)), config)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(1)
      expect(keyFromSelector(warnings[0].messageKey)).toBe('construction.post.dimensionsMismatch')
    })

    it('should not generate warning for swapped material dimensions (60x120 posts with 120x60 material)', () => {
      const config: DoublePostConfig = {
        ...doublePostConfig,
        material: dimensionalMaterialId,
        width: 60,
        thickness: 120
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(60, 300, 3000)), config)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(0)
    })

    it('should not generate warning for original dimensions (120x60 posts with 120x60 material)', () => {
      const config: DoublePostConfig = {
        ...doublePostConfig,
        material: dimensionalMaterialId,
        width: 120,
        thickness: 60
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(120, 200, 3000)), config)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(0)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle very small dimensions', () => {
      const config: FullPostConfig = {
        type: 'full',
        width: 1,
        material: mockWoodMaterial
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(1, 1, 1)), config)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)
    })

    it('should handle large dimensions', () => {
      const config: FullPostConfig = {
        type: 'full',
        width: 1000,
        material: mockWoodMaterial
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 5000, 10000)), config)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)
    })

    it('should throw error for invalid post type', () => {
      const invalidConfig = { type: 'invalid' } as any

      expect(() => {
        return [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(60, 360, 3000)), invalidConfig)]
      }).toThrow('Invalid post type')
    })
  })

  describe('element structure validation', () => {
    it('should maintain correct element structure for full post', () => {
      const config: FullPostConfig = {
        type: 'full',
        width: 60,
        material: mockWoodMaterial
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(60, 360, 3000)), config)]
      const { elements } = aggregateResults(results)

      expect('material' in elements[0]).toBe(true)
      const post = elements[0] as ConstructionElement
      const postShape = post.shape.base as CuboidShape
      expect(post.id).toBeTruthy()
      expect(post.material).toBeTruthy()
      expect(postShape).toBeTruthy()
      expect(postShape.type).toBe('cuboid')
    })

    it('should maintain correct element structure for double post', () => {
      const config: DoublePostConfig = {
        type: 'double',
        width: 60,
        thickness: 120,
        material: mockWoodMaterial,
        infillMaterial: mockStrawMaterial
      }

      const results = [...constructPost(new WallConstructionArea(newVec3(0, 0, 0), newVec3(60, 360, 3000)), config)]
      const { elements } = aggregateResults(results)

      elements.forEach(element => {
        expect(element.id).toBeTruthy()
        expect('material' in element).toBe(true)
        const constructionElement = element as ConstructionElement
        expect(constructionElement.material).toBeTruthy()
        expect(constructionElement.shape).toBeTruthy()
        expect(constructionElement.shape.base?.type).toBe('cuboid')
      })
    })
  })

  describe('coordinate system consistency', () => {
    it('should maintain consistent coordinate system for full post', () => {
      const position = newVec3(100, 200, 300)
      const size = newVec3(60, 180, 2400)
      const area = new WallConstructionArea(position, size)
      const config: FullPostConfig = {
        type: 'full',
        width: 60,
        material: mockWoodMaterial
      }

      const results = [...constructPost(area, config)]
      const { elements } = aggregateResults(results)

      expect('material' in elements[0]).toBe(true)
      const post = elements[0] as ConstructionElement
      const postShape = post.shape.base as CuboidShape

      expect(getPosition(post.transform)).toEqual(position)
      expect(postShape.size[0]).toBe(60) // width from config
      expect(postShape.size[1]).toBe(size[1])
      expect(postShape.size[2]).toBe(size[2])
    })

    it('should maintain consistent coordinate system for double post', () => {
      const position = newVec3(100, 200, 300)
      const size = newVec3(60, 360, 2400)
      const area = new WallConstructionArea(position, size)
      const config: DoublePostConfig = {
        type: 'double',
        width: 60,
        thickness: 120,
        material: mockWoodMaterial,
        infillMaterial: mockStrawMaterial
      }

      const results = [...constructPost(area, config)]
      const { elements } = aggregateResults(results)

      // First post should be at original position
      expect(getPosition(elements[0].transform)).toEqual(newVec3(100, 200, 300))

      // Second post should be at the far end
      expect(getPosition(elements[1].transform)).toEqual(newVec3(100, 440, 300))

      // Infill should be in between
      expect(getPosition(elements[2].transform)).toEqual(newVec3(100, 320, 300))
    })
  })
})
