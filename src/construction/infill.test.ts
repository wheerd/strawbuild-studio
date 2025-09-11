import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Length, Vec3 } from '@/types/geometry'
import type { MaterialId } from './material'
import type { PostConfig } from './posts'
import type { StrawConfig } from './straw'
import type { ConstructionElement, ConstructionIssue } from './base'
import { infillWallArea, type InfillConstructionConfig } from './infill'
import { constructPost } from './posts'
import { constructStraw } from './straw'

// Mock the dependencies
vi.mock('./posts', () => ({
  constructPost: vi.fn()
}))

vi.mock('./straw', () => ({
  constructStraw: vi.fn()
}))

// Mock material IDs
const mockWoodMaterial = 'wood-material' as MaterialId
const mockStrawMaterial = 'straw-material' as MaterialId
const mockHeaderMaterial = 'header-material' as MaterialId

// Mock resolve material function
const mockResolveMaterial = vi.fn()

// Default configurations for testing
const defaultPostConfig: PostConfig = {
  type: 'full',
  width: 60 as Length,
  material: mockWoodMaterial
}

const defaultStrawConfig: StrawConfig = {
  baleLength: 800 as Length,
  baleHeight: 500 as Length,
  baleWidth: 360 as Length,
  material: mockStrawMaterial
}

const defaultInfillConfig: InfillConstructionConfig = {
  maxPostSpacing: 800 as Length,
  minStrawSpace: 70 as Length,
  posts: defaultPostConfig,
  openings: {
    door: {
      padding: 15 as Length,
      headerThickness: 60 as Length,
      headerMaterial: mockHeaderMaterial
    },
    window: {
      padding: 15 as Length,
      headerThickness: 60 as Length,
      headerMaterial: mockHeaderMaterial
    },
    passage: {
      padding: 15 as Length,
      headerThickness: 60 as Length,
      headerMaterial: mockHeaderMaterial
    }
  },
  straw: defaultStrawConfig
}

// Mock element creation helpers
const createMockPost = (id: string, position: Vec3, size: Vec3): ConstructionElement => ({
  id: id as any,
  type: 'post',
  material: mockWoodMaterial,
  position,
  size
})

const createMockStraw = (id: string, position: Vec3, size: Vec3): ConstructionElement => ({
  id: id as any,
  type: 'straw',
  material: mockStrawMaterial,
  position,
  size
})

describe('infillWallArea', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    vi.mocked(constructPost).mockReturnValue({
      it: [createMockPost('post-1', [0, 0, 0], [60, 360, 2500])],
      errors: [],
      warnings: []
    })

    vi.mocked(constructStraw).mockReturnValue({
      it: [createMockStraw('straw-1', [0, 0, 0], [800, 360, 2500])],
      errors: [],
      warnings: []
    })
  })

  describe('basic functionality', () => {
    it('should create infill construction when no stands are specified', () => {
      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.it.length).toBeGreaterThan(0)
      expect(constructStraw).toHaveBeenCalled()
      // Note: The function may create intermediate posts as part of the recursive infill algorithm
    })

    it('should create start post when startsWithStand is true', () => {
      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, true)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(2) // post + straw
      expect(constructPost).toHaveBeenCalledWith(100, 360, 2500, defaultPostConfig, mockResolveMaterial)
      expect(constructStraw).toHaveBeenCalledWith([160, 0, 0], [740, 360, 2500], defaultStrawConfig)
    })

    it('should create end post when endsWithStand is true', () => {
      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, false, true)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(2) // straw + post
      expect(constructPost).toHaveBeenCalledWith(840, 360, 2500, defaultPostConfig, mockResolveMaterial)
      expect(constructStraw).toHaveBeenCalledWith([100, 0, 0], [740, 360, 2500], defaultStrawConfig)
    })

    it('should create both start and end posts when both stands are true', () => {
      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      vi.mocked(constructPost)
        .mockReturnValueOnce({
          it: [createMockPost('start-post', [100, 0, 0], [60, 360, 2500])],
          errors: [],
          warnings: []
        })
        .mockReturnValueOnce({
          it: [createMockPost('end-post', [840, 0, 0], [60, 360, 2500])],
          errors: [],
          warnings: []
        })

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, true, true)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it).toHaveLength(3) // start post + straw + end post
      expect(constructPost).toHaveBeenCalledTimes(2)
      expect(constructPost).toHaveBeenNthCalledWith(1, 100, 360, 2500, defaultPostConfig, mockResolveMaterial)
      expect(constructPost).toHaveBeenNthCalledWith(2, 840, 360, 2500, defaultPostConfig, mockResolveMaterial)
      expect(constructStraw).toHaveBeenCalledWith([160, 0, 0], [680, 360, 2500], defaultStrawConfig)
    })
  })

  describe('error conditions', () => {
    it('should generate error when not enough space for a post with starts/ends stand', () => {
      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [50, 360, 2500] // Less than post width (60)

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, true)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].description).toBe('Not enough space for a post')
    })

    it('should generate error when space for more than one post but not enough for two', () => {
      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [100, 360, 2500] // More than one post (60) but less than two (120)

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, true, true)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].description).toBe('Space for more than one post, but not enough for two')
    })

    it('should return single post when size equals post width', () => {
      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [60, 360, 2500] // Exactly post width

      infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, true)

      expect(constructPost).toHaveBeenCalledWith(100, 360, 2500, defaultPostConfig, mockResolveMaterial)
      expect(constructStraw).not.toHaveBeenCalled()
    })
  })

  describe('warning conditions', () => {
    it('should generate warning when not enough vertical space for straw', () => {
      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 360, 50] // Less than minStrawSpace (70)

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.description === 'Not enough vertical space to fill with straw')).toBe(true)
    })
  })

  describe('post configuration variations', () => {
    it('should work with double post configuration', () => {
      const doublePostConfig: PostConfig = {
        type: 'double',
        width: 60 as Length,
        thickness: 120 as Length,
        material: mockWoodMaterial,
        infillMaterial: mockStrawMaterial
      }

      const config: InfillConstructionConfig = {
        ...defaultInfillConfig,
        posts: doublePostConfig
      }

      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      infillWallArea(position, size, config, mockResolveMaterial, true)

      expect(constructPost).toHaveBeenCalledWith(100, 360, 2500, doublePostConfig, mockResolveMaterial)
    })

    it('should use custom post width from configuration', () => {
      const customPostConfig: PostConfig = {
        type: 'full',
        width: 80 as Length,
        material: mockWoodMaterial
      }

      const config: InfillConstructionConfig = {
        ...defaultInfillConfig,
        posts: customPostConfig
      }

      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      infillWallArea(position, size, config, mockResolveMaterial, true)

      expect(constructPost).toHaveBeenCalledWith(100, 360, 2500, customPostConfig, mockResolveMaterial)
      expect(constructStraw).toHaveBeenCalledWith([180, 0, 0], [720, 360, 2500], defaultStrawConfig)
    })
  })

  describe('recursive infill construction', () => {
    it('should handle complex recursive infill with multiple posts and straw sections', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [2000, 360, 2500] // Large area requiring multiple sections

      // Mock multiple calls to constructStraw for different sections
      vi.mocked(constructStraw)
        .mockReturnValueOnce({
          it: [createMockStraw('straw-1', [0, 0, 0], [800, 360, 2500])],
          errors: [],
          warnings: []
        })
        .mockReturnValueOnce({
          it: [createMockStraw('straw-2', [860, 0, 0], [800, 360, 2500])],
          errors: [],
          warnings: []
        })
        .mockReturnValueOnce({
          it: [createMockStraw('straw-3', [1720, 0, 0], [280, 360, 2500])],
          errors: [],
          warnings: []
        })

      // Mock multiple calls to constructPost for intermediate posts
      vi.mocked(constructPost)
        .mockReturnValueOnce({
          it: [createMockPost('post-1', [800, 0, 0], [60, 360, 2500])],
          errors: [],
          warnings: []
        })
        .mockReturnValueOnce({
          it: [createMockPost('post-2', [1660, 0, 0], [60, 360, 2500])],
          errors: [],
          warnings: []
        })

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.it.length).toBeGreaterThan(1) // Should have multiple elements
      expect(constructStraw).toHaveBeenCalledTimes(3)
      expect(constructPost).toHaveBeenCalledTimes(2)
    })

    it('should handle startAtEnd parameter correctly', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1600, 360, 2500] // Two bale widths

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, false, false, true)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      // Should start from the end when startAtEnd is true
      expect(constructStraw).toHaveBeenCalled()
    })
  })

  describe('error and warning propagation', () => {
    it('should propagate errors from constructPost', () => {
      const postErrors: ConstructionIssue[] = [{ description: 'Post construction error', elements: ['post-1' as any] }]

      vi.mocked(constructPost).mockReturnValue({
        it: [createMockPost('post-1', [100, 0, 0], [60, 360, 2500])],
        errors: postErrors,
        warnings: []
      })

      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, true)

      expect(result.errors).toEqual(postErrors)
    })

    it('should propagate warnings from constructPost', () => {
      const postWarnings: ConstructionIssue[] = [
        { description: 'Post construction warning', elements: ['post-1' as any] }
      ]

      vi.mocked(constructPost).mockReturnValue({
        it: [createMockPost('post-1', [100, 0, 0], [60, 360, 2500])],
        errors: [],
        warnings: postWarnings
      })

      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, true)

      expect(result.warnings).toEqual(expect.arrayContaining(postWarnings))
    })

    it('should propagate errors from constructStraw', () => {
      const strawErrors: ConstructionIssue[] = [
        { description: 'Straw construction error', elements: ['straw-1' as any] }
      ]

      vi.mocked(constructStraw).mockReturnValue({
        it: [createMockStraw('straw-1', [0, 0, 0], [800, 360, 2500])],
        errors: strawErrors,
        warnings: []
      })

      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial)

      expect(result.errors).toEqual(expect.arrayContaining(strawErrors))
    })

    it('should propagate warnings from constructStraw', () => {
      const strawWarnings: ConstructionIssue[] = [
        { description: 'Straw construction warning', elements: ['straw-1' as any] }
      ]

      vi.mocked(constructStraw).mockReturnValue({
        it: [createMockStraw('straw-1', [0, 0, 0], [800, 360, 2500])],
        errors: [],
        warnings: strawWarnings
      })

      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial)

      expect(result.warnings).toEqual(expect.arrayContaining(strawWarnings))
    })

    it('should combine multiple errors and warnings from different sources', () => {
      const postErrors: ConstructionIssue[] = [{ description: 'Post error', elements: ['post-1' as any] }]
      const postWarnings: ConstructionIssue[] = [{ description: 'Post warning', elements: ['post-1' as any] }]
      const strawErrors: ConstructionIssue[] = [{ description: 'Straw error', elements: ['straw-1' as any] }]
      const strawWarnings: ConstructionIssue[] = [{ description: 'Straw warning', elements: ['straw-1' as any] }]

      vi.mocked(constructPost).mockReturnValue({
        it: [createMockPost('post-1', [100, 0, 0], [60, 360, 2500])],
        errors: postErrors,
        warnings: postWarnings
      })

      vi.mocked(constructStraw).mockReturnValue({
        it: [createMockStraw('straw-1', [160, 0, 0], [740, 360, 2500])],
        errors: strawErrors,
        warnings: strawWarnings
      })

      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 360, 50] // Also triggers vertical space warning

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, true)

      expect(result.errors).toEqual(expect.arrayContaining([...postErrors, ...strawErrors]))
      expect(result.warnings).toEqual(expect.arrayContaining([...postWarnings, ...strawWarnings]))
      expect(result.warnings.some(w => w.description.includes('vertical space'))).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle zero dimensions gracefully', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [0, 360, 2500]

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
    })

    it('should handle very small dimensions', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [10, 10, 10]

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0) // Should warn about insufficient vertical space
      expect(result.warnings.some(w => w.description === 'Not enough vertical space to fill with straw')).toBe(true)
    })

    it('should handle large dimensions', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [10000, 1000, 5000]

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
    })

    it('should handle negative positions', () => {
      const position: Vec3 = [-500, -100, -200]
      const size: Vec3 = [800, 360, 2500]

      const result = infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
      // The function uses a recursive algorithm that may modify position/size, so we just check it was called
    })
  })

  describe('configuration variations', () => {
    it('should use custom maxPostSpacing from configuration', () => {
      const customConfig: InfillConstructionConfig = {
        ...defaultInfillConfig,
        maxPostSpacing: 1000 as Length
      }

      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [2000, 360, 2500]

      const result = infillWallArea(position, size, customConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
    })

    it('should use custom minStrawSpace from configuration', () => {
      const customConfig: InfillConstructionConfig = {
        ...defaultInfillConfig,
        minStrawSpace: 100 as Length
      }

      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 360, 90] // Less than custom minStrawSpace

      const result = infillWallArea(position, size, customConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.description === 'Not enough vertical space to fill with straw')).toBe(true)
    })

    it('should use custom straw configuration', () => {
      const customStrawConfig: StrawConfig = {
        baleLength: 1000 as Length,
        baleHeight: 400 as Length,
        baleWidth: 400 as Length,
        material: 'custom-straw' as MaterialId
      }

      const customConfig: InfillConstructionConfig = {
        ...defaultInfillConfig,
        straw: customStrawConfig
      }

      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      infillWallArea(position, size, customConfig, mockResolveMaterial)

      expect(constructStraw).toHaveBeenCalledWith(expect.anything(), expect.anything(), customStrawConfig)
    })
  })

  describe('getBaleWidth behavior within infillWallArea', () => {
    // Test configuration with known values for precise calculations
    const testConfig: InfillConstructionConfig = {
      maxPostSpacing: 800 as Length, // Full bale width
      minStrawSpace: 70 as Length, // Minimal spacer
      posts: {
        type: 'full',
        width: 60 as Length, // Post width
        material: mockWoodMaterial
      },
      openings: {
        door: {
          padding: 15 as Length,
          headerThickness: 60 as Length,
          headerMaterial: mockHeaderMaterial
        },
        window: {
          padding: 15 as Length,
          headerThickness: 60 as Length,
          headerMaterial: mockHeaderMaterial
        },
        passage: {
          padding: 15 as Length,
          headerThickness: 60 as Length,
          headerMaterial: mockHeaderMaterial
        }
      },
      straw: defaultStrawConfig
    }

    // Calculated values for test clarity:
    // fullBaleAndPost = 800 + 60 = 860
    // fullBaleAndPost + minStrawSpace = 860 + 70 = 930

    beforeEach(() => {
      vi.clearAllMocks()
      // Reset default mock behavior
      vi.mocked(constructPost).mockReturnValue({
        it: [createMockPost('post-1', [0, 0, 0], [60, 360, 2500])],
        errors: [],
        warnings: []
      })
    })

    it('should handle case 1: less space than full bale (availableWidth < maxPostSpacing)', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [700, 360, 2500] // Less than maxPostSpacing (800)

      // Mock constructStraw to capture the bale width used
      vi.mocked(constructStraw).mockImplementation((pos, size) => {
        // Verify that bale width equals available width (700)
        expect(size[0]).toBe(700)
        return {
          it: [createMockStraw('straw-1', pos, size)],
          errors: [],
          warnings: []
        }
      })

      const result = infillWallArea(position, size, testConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
    })

    it('should handle case 2: space for full bale + post + spacer (availableWidth >= fullBaleAndPost + minStrawSpace)', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1000, 360, 2500] // More than 930 (fullBaleAndPost + minStrawSpace)

      const strawCalls: Vec3[] = []
      vi.mocked(constructStraw).mockImplementation((pos, size) => {
        strawCalls.push(size)
        return {
          it: [createMockStraw('straw-1', pos, size)],
          errors: [],
          warnings: []
        }
      })

      const result = infillWallArea(position, size, testConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
      // The first call should use full bale width (800) since we have enough space
      expect(strawCalls[0][0]).toBe(800)
    })

    it('should handle case 3: between full bale+post and full bale+post+spacer', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [900, 360, 2500] // Between 860 and 930

      const strawCalls: Vec3[] = []
      vi.mocked(constructStraw).mockImplementation((pos, size) => {
        strawCalls.push(size)
        return {
          it: [createMockStraw('straw-1', pos, size)],
          errors: [],
          warnings: []
        }
      })

      const result = infillWallArea(position, size, testConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
      // Should return: 900 - 70 - 60 = 770 (shortened bale to fit post and spacer)
      expect(strawCalls[0][0]).toBe(770)
    })

    it('should handle case 4: between full bale and full bale+post', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [850, 360, 2500] // Between 800 and 860

      const strawCalls: Vec3[] = []
      vi.mocked(constructStraw).mockImplementation((pos, size) => {
        strawCalls.push(size)
        return {
          it: [createMockStraw('straw-1', pos, size)],
          errors: [],
          warnings: []
        }
      })

      const result = infillWallArea(position, size, testConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
      // Should return: 850 - 60 = 790 (shortened to fit a post)
      expect(strawCalls[0][0]).toBe(790)
    })

    it('should handle exact boundary: availableWidth equals maxPostSpacing', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 360, 2500] // Exactly maxPostSpacing

      const strawCalls: Vec3[] = []
      vi.mocked(constructStraw).mockImplementation((pos, size) => {
        strawCalls.push(size)
        return {
          it: [createMockStraw('straw-1', pos, size)],
          errors: [],
          warnings: []
        }
      })

      const result = infillWallArea(position, size, testConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
      // Should return: 800 - 60 = 740 (case 4 logic - shorten to fit post)
      expect(strawCalls[0][0]).toBe(740)
    })

    it('should handle exact boundary: availableWidth equals fullBaleAndPost', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [860, 360, 2500] // Exactly fullBaleAndPost (800 + 60)

      const strawCalls: Vec3[] = []
      vi.mocked(constructStraw).mockImplementation((pos, size) => {
        strawCalls.push(size)
        return {
          it: [createMockStraw('straw-1', pos, size)],
          errors: [],
          warnings: []
        }
      })

      const result = infillWallArea(position, size, testConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
      // Should return: 860 - 60 = 800 (case 4 logic - exactly fits full bale + post)
      expect(strawCalls[0][0]).toBe(800)
    })

    it('should handle exact boundary: availableWidth equals fullBaleAndPost + minStrawSpace', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [930, 360, 2500] // Exactly fullBaleAndPost + minStrawSpace (860 + 70)

      const strawCalls: Vec3[] = []
      vi.mocked(constructStraw).mockImplementation((pos, size) => {
        strawCalls.push(size)
        return {
          it: [createMockStraw('straw-1', pos, size)],
          errors: [],
          warnings: []
        }
      })

      const result = infillWallArea(position, size, testConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
      // Should return maxPostSpacing = 800 (case 2 logic - enough space for full bale + post + spacer)
      expect(strawCalls[0][0]).toBe(800)
    })

    it('should handle edge case: very small available width', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [50, 360, 2500] // Much less than maxPostSpacing

      vi.mocked(constructStraw).mockImplementation((pos, size) => {
        // Should return available width (50)
        expect(size[0]).toBe(50)
        return {
          it: [createMockStraw('straw-1', pos, size)],
          errors: [],
          warnings: []
        }
      })

      const result = infillWallArea(position, size, testConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
    })

    it('should handle different post widths affecting calculations', () => {
      const customConfig: InfillConstructionConfig = {
        ...testConfig,
        posts: {
          type: 'full',
          width: 100 as Length, // Wider post
          material: mockWoodMaterial
        }
      }
      // New calculations: fullBaleAndPost = 800 + 100 = 900

      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [850, 360, 2500] // Between 800 and 900

      const strawCalls: Vec3[] = []
      vi.mocked(constructStraw).mockImplementation((pos, size) => {
        strawCalls.push(size)
        return {
          it: [createMockStraw('straw-1', pos, size)],
          errors: [],
          warnings: []
        }
      })

      const result = infillWallArea(position, size, customConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
      // Should return: 850 - 100 = 750 (bale shortened for wider post)
      expect(strawCalls[0][0]).toBe(750)
    })

    it('should handle different minStrawSpace affecting calculations', () => {
      const customConfig: InfillConstructionConfig = {
        ...testConfig,
        minStrawSpace: 100 as Length // Larger minimum space
      }
      // New calculations: fullBaleAndPost + minStrawSpace = 860 + 100 = 960

      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [920, 360, 2500] // Between 860 and 960

      const strawCalls: Vec3[] = []
      vi.mocked(constructStraw).mockImplementation((pos, size) => {
        strawCalls.push(size)
        return {
          it: [createMockStraw('straw-1', pos, size)],
          errors: [],
          warnings: []
        }
      })

      const result = infillWallArea(position, size, customConfig, mockResolveMaterial)

      expect(result.errors).toHaveLength(0)
      expect(constructStraw).toHaveBeenCalled()
      // Should return: 920 - 100 - 60 = 760 (bale shortened for larger minimum space)
      expect(strawCalls[0][0]).toBe(760)
    })
  })
})
