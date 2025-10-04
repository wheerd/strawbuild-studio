import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createOpeningId } from '@/building/model/ids'
import type { Opening } from '@/building/model/model'
import { type ConstructionElement, type GroupOrElement, createConstructionElement } from '@/construction/elements'
import { createMaterialId, resolveDefaultMaterial } from '@/construction/materials/material'
import type { RawMeasurement } from '@/construction/measurements'
import { type ConstructionResult, aggregateResults, yieldElement } from '@/construction/results'
import {
  TAG_HEADER,
  TAG_HEADER_HEIGHT,
  TAG_OPENING_DOOR,
  TAG_OPENING_HEIGHT,
  TAG_OPENING_WIDTH,
  TAG_OPENING_WINDOW,
  TAG_SILL,
  TAG_SILL_HEIGHT,
  type Tag
} from '@/construction/tags'
import type { InfillConstructionConfig } from '@/construction/walls/infill/infill'
import { infillWallArea } from '@/construction/walls/infill/infill'
import type { WallSegment3D } from '@/construction/walls/segmentation'
import { type Length, type Vec3, vec3Add } from '@/shared/geometry'

import { type OpeningConstructionConfig, constructOpeningFrame } from './openings'

// Mock the infill module
vi.mock('@/construction/walls/infill/infill', () => ({
  infillWallArea: vi.fn()
}))

// Mock the formatLength utility
vi.mock('@/shared/utils/formatLength', () => ({
  formatLength: vi.fn((length: number) => `${length}mm`) // Mock to return simple format for tests
}))

const mockInfillWallArea = vi.mocked(infillWallArea)

// Helper function to check if an element has a specific tag
const hasTag = (element: GroupOrElement, tag: Tag): boolean => {
  const constructionElement = element as ConstructionElement
  return constructionElement.tags?.some(t => t.id === tag.id) ?? false
}

// Helper function to check if a measurement has a specific tag
const measurementHasTag = (measurement: RawMeasurement, tag: Tag): boolean => {
  return measurement.tags?.some(t => t.id === tag.id) ?? false
}

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
    padding: 15 as Length,
    headerThickness: 60 as Length,
    headerMaterial: createMaterialId(),
    sillThickness: 60 as Length,
    sillMaterial: createMaterialId()
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
    const offset = [100 * i, 0, 0] as Vec3
    const size = [100, 360, 500] as Vec3
    const element = createConstructionElement(createMaterialId(), {
      type: 'cuboid' as const,
      offset,
      size,
      bounds: {
        min: offset,
        max: vec3Add(offset, size)
      }
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
      const { elements, errors, areas } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(elements.length).toBeGreaterThan(3)

      const header = elements.find(el => hasTag(el, TAG_HEADER))
      const sill = elements.find(el => hasTag(el, TAG_SILL))
      const window = areas.find(a => a.tags?.includes(TAG_OPENING_WINDOW))

      expect(header).toBeDefined()
      expect(sill).toBeDefined()
      expect(window).toBeDefined()
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
      const openingWidthMeasurements = measurements.filter(m => measurementHasTag(m, TAG_OPENING_WIDTH))
      const headerHeightMeasurements = measurements.filter(m => measurementHasTag(m, TAG_HEADER_HEIGHT))
      const sillHeightMeasurements = measurements.filter(m => measurementHasTag(m, TAG_SILL_HEIGHT))
      const openingHeightMeasurements = measurements.filter(m => measurementHasTag(m, TAG_OPENING_HEIGHT))

      expect(openingWidthMeasurements).toHaveLength(1)
      expect(headerHeightMeasurements).toHaveLength(1)
      expect(sillHeightMeasurements).toHaveLength(1)
      expect(openingHeightMeasurements).toHaveLength(1)

      // Verify measurement values
      expect((openingWidthMeasurements[0] as any).size[0]).toBe(1000) // width (AutoMeasurement)
      expect((sillHeightMeasurements[0] as any).label).toBe('800mm') // sillHeight (DirectMeasurement)
      expect((headerHeightMeasurements[0] as any).label).toBe('2000mm') // sillHeight + height (DirectMeasurement)
      expect((openingHeightMeasurements[0] as any).label).toBe('1200mm') // height (DirectMeasurement)
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
      const openingWidthMeasurements = measurements.filter(m => measurementHasTag(m, TAG_OPENING_WIDTH))
      const headerHeightMeasurements = measurements.filter(m => measurementHasTag(m, TAG_HEADER_HEIGHT))
      const sillHeightMeasurements = measurements.filter(m => measurementHasTag(m, TAG_SILL_HEIGHT))
      const openingHeightMeasurements = measurements.filter(m => measurementHasTag(m, TAG_OPENING_HEIGHT))

      expect(openingWidthMeasurements).toHaveLength(1)
      expect(headerHeightMeasurements).toHaveLength(1)
      expect(sillHeightMeasurements).toHaveLength(0) // No sill for doors
      expect(openingHeightMeasurements).toHaveLength(0) // No opening height without sill

      // Verify measurement values
      expect((openingWidthMeasurements[0] as any).size[0]).toBe(800) // width (AutoMeasurement)
      expect((headerHeightMeasurements[0] as any).label).toBe('2000mm') // height (DirectMeasurement)
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
      const { elements, errors, areas } = aggregateResults(results)

      expect(errors).toHaveLength(0)

      const header = elements.find(el => hasTag(el, TAG_HEADER))
      const sill = elements.find(el => hasTag(el, TAG_SILL))
      const door = areas.find(a => a.tags?.includes(TAG_OPENING_DOOR))

      expect(header).toBeDefined()
      expect(sill).toBeUndefined()
      expect(door).toBeDefined()
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
