import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createConstructionElement, createCuboidShape } from '@/construction/elements'
import { constructStraw } from '@/construction/materials/straw'
import { aggregateResults, yieldElement } from '@/construction/results'
import { infillWallArea } from '@/construction/walls/infill/infill'
import type { Length, Vec3 } from '@/shared/geometry'

import { constructModule } from './modules'
import { type StrawhengeConstructionConfig, strawhengeWallArea } from './strawhenge'

// Mock dependencies
vi.mock('@/construction/materials/straw', () => ({
  constructStraw: vi.fn()
}))

vi.mock('@/construction/walls/infill/infill', () => ({
  infillWallArea: vi.fn()
}))

vi.mock('./modules', () => ({
  constructModule: vi.fn()
}))

const mockConstructStraw = vi.mocked(constructStraw)
const mockInfillWallArea = vi.mocked(infillWallArea)
const mockConstructModule = vi.mocked(constructModule)

// Test constants matching C# implementation
const MODULE_WIDTH = 500 as Length
const FULL_BALE = 400 as Length
const MIN_BALE = 100 as Length
const POST_WIDTH = 10 as Length

const createTestConfig = (): StrawhengeConstructionConfig => ({
  type: 'strawhenge',
  module: {
    type: 'single',
    width: MODULE_WIDTH,
    frameThickness: 60 as Length,
    frameMaterial: 'wood' as any,
    strawMaterial: 'straw' as any
  },
  infill: {
    type: 'infill',
    maxPostSpacing: FULL_BALE,
    minStrawSpace: MIN_BALE,
    posts: {
      type: 'full',
      width: POST_WIDTH,
      material: 'wood' as any
    },
    openings: {} as any,
    straw: {
      baleLength: 800 as Length,
      baleHeight: 500 as Length,
      baleWidth: 360 as Length,
      material: 'straw' as any
    }
  },
  openings: {} as any,
  straw: {
    baleLength: 800 as Length,
    baleHeight: 500 as Length,
    baleWidth: 360 as Length,
    material: 'straw' as any
  }
})

// Test wall lengths from C# implementation
const WALL_LENGTHS = [
  MODULE_WIDTH - 1, // 499
  MODULE_WIDTH, // 500
  MODULE_WIDTH + 1, // 501
  MODULE_WIDTH + MIN_BALE, // 600
  MODULE_WIDTH + MIN_BALE + POST_WIDTH - 1, // 609
  MODULE_WIDTH + MIN_BALE + POST_WIDTH, // 610
  MODULE_WIDTH + MIN_BALE + MODULE_WIDTH - 1, // 1099
  MODULE_WIDTH + MIN_BALE + MODULE_WIDTH, // 1100
  MODULE_WIDTH + FULL_BALE + MODULE_WIDTH, // 1400
  MODULE_WIDTH + FULL_BALE + MODULE_WIDTH + 1, // 1401
  MODULE_WIDTH + MODULE_WIDTH + MODULE_WIDTH - 1, // 1499
  MODULE_WIDTH + MODULE_WIDTH + MODULE_WIDTH, // 1500
  MODULE_WIDTH + MODULE_WIDTH + MODULE_WIDTH + 1, // 1501
  MODULE_WIDTH + MODULE_WIDTH + MIN_BALE + MODULE_WIDTH - 1, // 1599
  MODULE_WIDTH + MODULE_WIDTH + MIN_BALE + MODULE_WIDTH, // 1600
  MODULE_WIDTH + MODULE_WIDTH + FULL_BALE + MODULE_WIDTH, // 1900
  MODULE_WIDTH + MODULE_WIDTH + FULL_BALE + MODULE_WIDTH + 1, // 1901
  MODULE_WIDTH + FULL_BALE + MODULE_WIDTH + FULL_BALE + MODULE_WIDTH, // 2300
  MODULE_WIDTH + FULL_BALE + MODULE_WIDTH + FULL_BALE + MODULE_WIDTH + 1, // 2301
  4 * MODULE_WIDTH + 3 * FULL_BALE // 3200
]

// Helper to create mock results for testing
function* createMockStrawResults(position: Vec3, size: Vec3, material = 'straw') {
  const element = createConstructionElement(material as any, createCuboidShape(position, size))
  yield yieldElement(element)
}

function* createMockModuleResults(position: Vec3, size: Vec3, material = 'module') {
  const element = createConstructionElement(material as any, createCuboidShape(position, size))
  yield yieldElement(element)
}

function* createMockInfillResults(position: Vec3, size: Vec3, material = 'infill') {
  const element = createConstructionElement(material as any, createCuboidShape(position, size))
  yield yieldElement(element)
}

// Helper to extract snapshot data from results
function extractSnapshotData(results: any[]) {
  const aggregated = aggregateResults(results)
  return aggregated.elements
    .map(el => ({
      position_x: el.bounds.min[0],
      size_x: el.bounds.max[0] - el.bounds.min[0],
      material: 'material' in el ? el.material : null,
      tags: el.tags?.map(t => t.id)
    }))
    .sort((a, b) => a.position_x - b.position_x)
}

describe('Strawhenge Wall Construction', () => {
  const config = createTestConfig()

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    mockConstructStraw.mockImplementation((position, size) => createMockStrawResults(position, size))
    mockConstructModule.mockImplementation((position, size) => createMockModuleResults(position, size))
    mockInfillWallArea.mockImplementation((position, size) => createMockInfillResults(position, size))
  })

  describe('Fallback to Infill', () => {
    it('should create module when no stands available but size equals module width', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [MODULE_WIDTH, 360, 2000]

      Array.from(
        strawhengeWallArea(
          position,
          size,
          config,
          false,
          false,
          false // No stands
        )
      )

      // Current implementation creates a module even without stands if size equals module width
      expect(mockConstructModule).toHaveBeenCalledWith(position, size, config.module)
      expect(mockInfillWallArea).not.toHaveBeenCalled()
    })

    it('should fall back to infill when no stands and size larger than module', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [MODULE_WIDTH + 100, 360, 2000] // Larger than module but no stands

      Array.from(
        strawhengeWallArea(
          position,
          size,
          config,
          false,
          false,
          false // No stands
        )
      )

      // Should call infill for insufficient space to place modules properly
      expect(mockInfillWallArea).toHaveBeenCalledWith(position, size, config.infill, false, false, false)
    })

    it('should fall back to infill when space is too small for module', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [MODULE_WIDTH - 1, 360, 2000] // Just under module width

      Array.from(
        strawhengeWallArea(
          position,
          size,
          config,
          true,
          true,
          false // Has stands but too small
        )
      )

      // Should call infill, not module construction
      expect(mockInfillWallArea).toHaveBeenCalledWith(position, size, config.infill, true, true, false)
      expect(mockConstructModule).not.toHaveBeenCalled()
    })
  })

  describe('Single Module Cases', () => {
    it('should create single module when size equals module width', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [MODULE_WIDTH, 360, 2000]

      Array.from(strawhengeWallArea(position, size, config, true, true, false))

      // Should call module construction, not infill
      expect(mockConstructModule).toHaveBeenCalledWith(position, size, config.module)
      expect(mockInfillWallArea).not.toHaveBeenCalled()
    })
  })

  describe('Multi-Module Patterns', () => {
    it('should handle placement with both starts and ends with stands', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [MODULE_WIDTH + FULL_BALE + MODULE_WIDTH, 360, 2000] // 1400

      Array.from(strawhengeWallArea(position, size, config, true, true, false))

      // Should call both module and straw construction
      expect(mockConstructModule).toHaveBeenCalled()
      expect(mockConstructStraw).toHaveBeenCalled()
    })
  })

  describe('Wall Length Snapshots - startAtEnd=false', () => {
    describe.each(WALL_LENGTHS)('Wall length %s', wallLength => {
      it(`should produce consistent layout for length ${wallLength}`, () => {
        const position: Vec3 = [0, 0, 0]
        const size: Vec3 = [wallLength, 360, 2000]

        const results = Array.from(strawhengeWallArea(position, size, config, true, true, false))

        const snapshotData = extractSnapshotData(results)
        expect(snapshotData).toMatchSnapshot(`wall-length-${wallLength}-startAtEnd-false`)
      })
    })
  })

  describe('Wall Length Snapshots - startAtEnd=true', () => {
    describe.each(WALL_LENGTHS)('Wall length %s', wallLength => {
      it(`should produce consistent layout for length ${wallLength}`, () => {
        const position: Vec3 = [0, 0, 0]
        const size: Vec3 = [wallLength, 360, 2000]

        const results = Array.from(strawhengeWallArea(position, size, config, true, true, true))

        const snapshotData = extractSnapshotData(results)
        expect(snapshotData).toMatchSnapshot(`wall-length-${wallLength}-startAtEnd-true`)
      })
    })
  })

  describe('Stand Placement', () => {
    it('should place modules at start when startsWithStand=true', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [MODULE_WIDTH * 2, 360, 2000]

      Array.from(
        strawhengeWallArea(
          position,
          size,
          config,
          true,
          false,
          false // Only start stand
        )
      )

      // Should place module at start position
      expect(mockConstructModule).toHaveBeenCalledWith(
        expect.arrayContaining([0, expect.any(Number), expect.any(Number)]),
        expect.arrayContaining([MODULE_WIDTH, expect.any(Number), expect.any(Number)]),
        config.module
      )
    })

    it('should place modules at end when endsWithStand=true', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [MODULE_WIDTH * 2, 360, 2000]

      Array.from(
        strawhengeWallArea(
          position,
          size,
          config,
          false,
          true,
          false // Only end stand
        )
      )

      // Should place module at end position
      expect(mockConstructModule).toHaveBeenCalledWith(
        expect.arrayContaining([MODULE_WIDTH, expect.any(Number), expect.any(Number)]),
        expect.arrayContaining([MODULE_WIDTH, expect.any(Number), expect.any(Number)]),
        config.module
      )
    })
  })

  describe('Mock Verification', () => {
    it('should call mocked dependencies correctly', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [MODULE_WIDTH, 360, 2000]

      // Test module construction
      Array.from(strawhengeWallArea(position, size, config, true, true, false))
      expect(mockConstructModule).toHaveBeenCalled()

      // Reset and test infill fallback
      vi.clearAllMocks()
      Array.from(strawhengeWallArea(position, [MODULE_WIDTH - 1, 360, 2000], config, true, true, false))
      expect(mockInfillWallArea).toHaveBeenCalled()
    })
  })
})
