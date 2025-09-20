import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Length, Vec3 } from '@/types/geometry'
import type { MaterialId } from './material'
import type { PostConfig } from './posts'
import type { StrawConfig } from './straw'
import {
  createCuboidShape,
  aggregateResults,
  type ConstructionElement,
  type ConstructionResult,
  yieldElement,
  yieldError,
  yieldWarning
} from './base'
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
const mockResolveMaterial = vi.fn(() => undefined)

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
  shape: createCuboidShape(position, size)
})

const createMockStraw = (id: string, position: Vec3, size: Vec3): ConstructionElement => ({
  id: id as any,
  type: 'straw',
  material: mockStrawMaterial,
  shape: createCuboidShape(position, size)
})

// Helper to create generator mocks
const createMockGenerator = function* (
  elements: ConstructionElement[],
  errors: any[] = [],
  warnings: any[] = []
): Generator<ConstructionResult> {
  for (const element of elements) {
    yield yieldElement(element)
  }
  for (const error of errors) {
    yield yieldError(error)
  }
  for (const warning of warnings) {
    yield yieldWarning(warning)
  }
}

describe('infillWallArea', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations returning generators
    vi.mocked(constructPost).mockReturnValue(
      createMockGenerator([createMockPost('post-1', [0, 0, 0], [60, 360, 2500])])
    )

    vi.mocked(constructStraw).mockReturnValue(
      createMockGenerator([createMockStraw('straw-1', [0, 0, 0], [800, 360, 2500])])
    )
  })

  describe('basic functionality', () => {
    it('should create infill construction when no stands are specified', () => {
      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      const results = [...infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(elements.length).toBeGreaterThan(0)
      expect(constructStraw).toHaveBeenCalled()
    })

    it('should create start post when startsWithStand is true', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      const results = [...infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(elements.length).toBeGreaterThan(0)
      expect(constructPost).toHaveBeenCalled()
    })

    it('should create end post when endsWithStand is true', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 360, 2500]

      const results = [...infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, false, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(elements.length).toBeGreaterThan(0)
      expect(constructPost).toHaveBeenCalled()
    })

    it('should create both start and end posts when both stands are true', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1600, 360, 2500] // Larger to accommodate both posts

      const results = [...infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, true, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(elements.length).toBeGreaterThan(0)
      expect(constructPost).toHaveBeenCalledTimes(3) // Called for start, end, and intermediate posts
    })
  })

  describe('error conditions', () => {
    it('should generate error when not enough space for a post with starts/ends stand', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [30, 360, 2500] // Less than post width

      const results = [...infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, true)]
      const { errors } = aggregateResults(results)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].description).toContain('Not enough space for a post')
    })

    it('should generate error when space for more than one post but not enough for two', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [80, 360, 2500] // More than one post width but less than 2

      const results = [...infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, true, true)]
      const { errors } = aggregateResults(results)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].description).toContain('more than one post')
    })

    it('should return single post when size equals post width', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [60, 360, 2500] // Exactly post width

      const results = [...infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(elements.length).toBeGreaterThan(0)
      expect(constructPost).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle zero dimensions gracefully', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [0, 0, 0]

      const results = [...infillWallArea(position, size, defaultInfillConfig, mockResolveMaterial)]
      const { elements, errors } = aggregateResults(results)

      expect(elements).toHaveLength(0) // No elements should be created
      expect(errors).toHaveLength(0)
    })
  })

  describe('configuration variations', () => {
    it('should work with double post configuration', () => {
      const doublePostConfig: PostConfig = {
        type: 'double',
        width: 60 as Length,
        thickness: 120 as Length,
        material: mockWoodMaterial,
        infillMaterial: mockStrawMaterial
      }

      const config = {
        ...defaultInfillConfig,
        posts: doublePostConfig
      }

      const results = [...infillWallArea([0, 0, 0], [800, 360, 2500], config, mockResolveMaterial, true)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(constructPost).toHaveBeenCalled()
    })
  })
})
