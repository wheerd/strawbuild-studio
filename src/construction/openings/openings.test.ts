import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createOpeningId } from '@/building/model/ids'
import type { Opening } from '@/building/model/model'
import { createConstructionElement } from '@/construction/elements'
import { createMaterialId, resolveDefaultMaterial } from '@/construction/materials/material'
import { type ConstructionResult, aggregateResults, yieldElement } from '@/construction/results'
import type { InfillConstructionConfig } from '@/construction/walls/infill/infill'
import { infillWallArea } from '@/construction/walls/infill/infill'
import type { WallSegment3D } from '@/construction/walls/segmentation'
import type { Length, Vec3 } from '@/shared/geometry'

import { type OpeningConstructionConfig, constructOpening, constructOpeningFrame } from './openings'

// Mock the infill module
vi.mock('@/construction/walls/infill/infill', () => ({
  infillWallArea: vi.fn()
}))

// Mock the formatLength utility
vi.mock('@/shared/utils/formatLength', () => ({
  formatLength: vi.fn((length: number) => `${length}mm`) // Mock to return simple format for tests
}))

const mockInfillWallArea = vi.mocked(infillWallArea)

const createTestOpening = (overrides: Partial<Opening> = {}): Opening => ({
  id: createOpeningId(),
  type: 'window',
  offsetFromStart: 1000 as Length,
  width: 800 as Length,
  height: 1200 as Length,
  sillHeight: 900 as Length,
  ...overrides
})

const createTestConfig = (overrides: Partial<OpeningConstructionConfig> = {}): OpeningConstructionConfig => ({
  padding: 15 as Length,
  headerThickness: 60 as Length,
  headerMaterial: createMaterialId(),
  sillThickness: 60 as Length,
  sillMaterial: createMaterialId(),
  fillingThickness: 30 as Length,
  fillingMaterial: createMaterialId(),
  ...overrides
})

const createTestInfillConfig = (): InfillConstructionConfig => ({
  type: 'infill',
  maxPostSpacing: 800 as Length,
  minStrawSpace: 70 as Length,
  posts: {
    type: 'full' as const,
    width: 60 as Length,
    material: createMaterialId()
  },
  openings: {
    door: {
      padding: 15 as Length,
      headerThickness: 60 as Length,
      headerMaterial: createMaterialId()
    },
    window: {
      padding: 15 as Length,
      headerThickness: 60 as Length,
      headerMaterial: createMaterialId()
    },
    passage: {
      padding: 15 as Length,
      headerThickness: 60 as Length,
      headerMaterial: createMaterialId()
    }
  },
  straw: {
    baleLength: 800 as Length,
    baleHeight: 500 as Length,
    baleWidth: 360 as Length,
    material: createMaterialId()
  }
})

const createTestOpeningSegment = (opening: Opening): WallSegment3D => ({
  type: 'opening',
  position: [opening.offsetFromStart, 0, 0] as Vec3,
  size: [opening.width, 360, 2500] as Vec3,
  openings: [opening]
})

// Helper to create mock generator for infillWallArea
const createMockInfillGenerator = function* (numElements = 2): Generator<ConstructionResult> {
  for (let i = 0; i < numElements; i++) {
    const position = [100 * i, 0, 0] as Vec3
    const size = [100, 360, 500] as Vec3
    const element = createConstructionElement('straw' as const, createMaterialId(), {
      type: 'cuboid' as const,
      position,
      size
    })
    yield yieldElement(element)
  }
}

describe('constructOpeningFrame', () => {
  beforeEach(() => {
    mockInfillWallArea.mockReset()
    mockInfillWallArea.mockReturnValue(createMockInfillGenerator())
  })

  describe('basic opening construction', () => {
    it('creates header and sill for window with sill height', () => {
      const opening = createTestOpening({
        sillHeight: 900 as Length,
        height: 1200 as Length
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig()
      const infillConfig = createTestInfillConfig()

      const results = [...constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(elements.length).toBeGreaterThan(3)

      const header = elements.find(el => el.type === 'header')
      const sill = elements.find(el => el.type === 'sill')
      const filling = elements.find(el => el.type === 'opening')

      expect(header).toBeDefined()
      expect(sill).toBeDefined()
      expect(filling).toBeDefined()
    })

    it('generates measurements', () => {
      const opening = createTestOpening({
        sillHeight: 800 as Length,
        height: 1200 as Length,
        width: 1000 as Length
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig()
      const infillConfig = createTestInfillConfig()
      const results = [...constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)]
      const { measurements } = aggregateResults(results)

      // Should generate measurements inline
      expect(measurements.length).toBeGreaterThan(0)

      // Check specific measurement types
      const openingWidthMeasurements = measurements.filter(m => m.type === 'opening-width')
      const headerHeightMeasurements = measurements.filter(m => m.type === 'header-height')
      const sillHeightMeasurements = measurements.filter(m => m.type === 'sill-height')
      const openingHeightMeasurements = measurements.filter(m => m.type === 'opening-height')

      expect(openingWidthMeasurements).toHaveLength(1)
      expect(headerHeightMeasurements).toHaveLength(1)
      expect(sillHeightMeasurements).toHaveLength(1)
      expect(openingHeightMeasurements).toHaveLength(1)

      // Verify measurement values (using mocked formatLength)
      expect(openingWidthMeasurements[0].label).toBe('1000mm')
      expect(sillHeightMeasurements[0].label).toBe('800mm')
      expect(headerHeightMeasurements[0].label).toBe('2000mm') // sillHeight + height
      expect(openingHeightMeasurements[0].label).toBe('1200mm')
    })

    it('generates only header and opening width measurements for door', () => {
      const opening = createTestOpening({
        type: 'door',
        sillHeight: 0 as Length,
        height: 2000 as Length,
        width: 800 as Length
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig()
      const infillConfig = createTestInfillConfig()
      const results = [...constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)]
      const { measurements } = aggregateResults(results)

      // Should generate fewer measurements for door (no sill)
      const openingWidthMeasurements = measurements.filter(m => m.type === 'opening-width')
      const headerHeightMeasurements = measurements.filter(m => m.type === 'header-height')
      const sillHeightMeasurements = measurements.filter(m => m.type === 'sill-height')
      const openingHeightMeasurements = measurements.filter(m => m.type === 'opening-height')

      expect(openingWidthMeasurements).toHaveLength(1)
      expect(headerHeightMeasurements).toHaveLength(1)
      expect(sillHeightMeasurements).toHaveLength(0) // No sill for doors
      expect(openingHeightMeasurements).toHaveLength(0) // No opening height without sill

      // Verify measurement values
      expect(openingWidthMeasurements[0].label).toBe('800mm')
      expect(headerHeightMeasurements[0].label).toBe('2000mm')
    })

    it('creates only header for door without sill height', () => {
      const opening = createTestOpening({
        type: 'door',
        sillHeight: 0 as Length,
        height: 2000 as Length
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig()
      const infillConfig = createTestInfillConfig()

      const results = [...constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)

      const header = elements.find(el => el.type === 'header')
      const sill = elements.find(el => el.type === 'sill')
      const filling = elements.find(el => el.type === 'opening')

      expect(header).toBeDefined()
      expect(sill).toBeUndefined()
      expect(filling).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('returns error when header does not fit', () => {
      const opening = createTestOpening({
        sillHeight: 2360 as Length,
        height: 100 as Length
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig({
        headerThickness: 100 as Length
      })
      const infillConfig = createTestInfillConfig()

      const results = [...constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toContain('Header does not fit')
    })

    it('returns error when sill does not fit', () => {
      const opening = createTestOpening({
        sillHeight: 50 as Length,
        height: 1200 as Length
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig({
        sillThickness: 100 as Length
      })
      const infillConfig = createTestInfillConfig()

      const results = [...constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toContain('Sill does not fit')
    })
  })
})

describe('constructOpening', () => {
  beforeEach(() => {
    mockInfillWallArea.mockReset()
    mockInfillWallArea.mockReturnValue(createMockInfillGenerator())
  })

  it('yields elements from constructOpeningFrame', () => {
    const opening = createTestOpening()
    const openingSegment = createTestOpeningSegment(opening)
    const config = createTestConfig()
    const infillConfig = createTestInfillConfig()

    const results = [...constructOpening(openingSegment, config, infillConfig, resolveDefaultMaterial)]
    const { elements, errors } = aggregateResults(results)

    expect(errors).toHaveLength(0)
    expect(elements.length).toBeGreaterThan(0)
  })

  it('propagates errors from constructOpeningFrame', () => {
    const opening = createTestOpening({
      sillHeight: 50 as Length,
      height: 1200 as Length
    })
    const openingSegment = createTestOpeningSegment(opening)
    const config = createTestConfig({
      sillThickness: 100 as Length
    })
    const infillConfig = createTestInfillConfig()

    const results = [...constructOpening(openingSegment, config, infillConfig, resolveDefaultMaterial)]
    const { errors } = aggregateResults(results)

    expect(errors).toHaveLength(1)
    expect(errors[0].description).toContain('Sill does not fit')
  })
})
