import { describe, it, expect, vi } from 'vitest'
import type { ConstructionElement } from '@/construction/elements'
import { createCuboidShape, createConstructionElement } from '@/construction/elements'
import type { ConstructionSegment } from '@/construction/walls/construction'
import {
  calculatePostSpacingMeasurements,
  calculateOpeningMeasurements,
  calculateOpeningSpacingMeasurements
} from './measurements'
import type { Length } from '@/shared/geometry'

// Mock the formatLength utility
vi.mock('@/shared/utils/formatLength', () => ({
  formatLength: vi.fn((length: number) => `${length}mm`) // Mock to return simple format for tests
}))

const mockPost = (x: Length, width: Length = 40 as Length): ConstructionElement =>
  createConstructionElement(
    'post',
    'wood' as any,
    createCuboidShape([x, 0 as Length, 0 as Length], [width, 100 as Length, 2400 as Length])
  )

const mockHeader = (x: Length, width: Length, z: Length): ConstructionElement =>
  createConstructionElement(
    'header',
    'wood' as any,
    createCuboidShape([x, 0 as Length, z], [width, 100 as Length, 60 as Length])
  )

const mockSill = (x: Length, width: Length, z: Length): ConstructionElement =>
  createConstructionElement(
    'sill',
    'wood' as any,
    createCuboidShape([x, 0 as Length, z], [width, 100 as Length, 60 as Length])
  )

describe('calculatePostSpacingMeasurements', () => {
  it('calculates spacing between adjacent posts', () => {
    const posts = [
      mockPost(0 as Length), // Post 1: 0-40
      mockPost(840 as Length), // Post 2: 840-880
      mockPost(1680 as Length) // Post 3: 1680-1720
    ]

    const measurements = calculatePostSpacingMeasurements(posts)

    expect(measurements).toHaveLength(2)

    // First spacing: 40 to 840 = 800mm
    expect(measurements[0]).toMatchObject({
      type: 'post-spacing',
      label: '800mm'
    })

    // Second spacing: 880 to 1680 = 800mm
    expect(measurements[1]).toMatchObject({
      type: 'post-spacing',
      label: '800mm'
    })
  })

  it('handles posts with zero spacing', () => {
    const posts = [
      mockPost(0 as Length),
      mockPost(40 as Length) // Adjacent post, no gap
    ]

    const measurements = calculatePostSpacingMeasurements(posts)

    expect(measurements).toHaveLength(0)
  })
})

describe('calculateOpeningMeasurements', () => {
  it('calculates opening measurements with sill and header', () => {
    const sill = mockSill(100 as Length, 800 as Length, 0 as Length) // Sill at ground level
    const header = mockHeader(100 as Length, 800 as Length, 2040 as Length) // Header at 2040mm

    const mockSegment: ConstructionSegment = {
      id: 'test-segment',
      type: 'opening',
      position: 100 as Length,
      width: 800 as Length,
      elements: [sill, header],
      openingIds: ['opening1' as any]
    }

    const measurements = calculateOpeningMeasurements(mockSegment, 2400 as Length)

    // Should have: width, header height, sill height, opening height
    expect(measurements).toHaveLength(4)

    const widthMeasurement = measurements.find(m => m.type === 'opening-width')
    expect(widthMeasurement).toMatchObject({
      type: 'opening-width',
      label: '800mm'
    })

    const headerMeasurement = measurements.find(m => m.type === 'header-height')
    expect(headerMeasurement).toMatchObject({
      type: 'header-height',
      label: '2040mm'
    })

    const sillMeasurement = measurements.find(m => m.type === 'sill-height')
    expect(sillMeasurement).toMatchObject({
      type: 'sill-height',
      label: '60mm'
    })

    const openingHeightMeasurement = measurements.find(m => m.type === 'opening-height')
    expect(openingHeightMeasurement).toMatchObject({
      type: 'opening-height',
      label: '1980mm' // 2040 - 60 = 1980
    })
  })

  it('calculates measurements without sill', () => {
    const header = mockHeader(100 as Length, 800 as Length, 2040 as Length)

    const mockSegment: ConstructionSegment = {
      id: 'test-segment',
      type: 'opening',
      position: 100 as Length,
      width: 800 as Length,
      elements: [header],
      openingIds: ['opening1' as any]
    }

    const measurements = calculateOpeningMeasurements(mockSegment, 2400 as Length)

    // Should have: width and header height only (no sill or opening height)
    expect(measurements).toHaveLength(2)

    const types = measurements.map(m => m.type)
    expect(types).toContain('opening-width')
    expect(types).toContain('header-height')
    expect(types).not.toContain('sill-height')
    expect(types).not.toContain('opening-height')
  })
})

describe('calculateOpeningSpacingMeasurements', () => {
  it('calculates spacing between adjacent openings', () => {
    const mockSegments: ConstructionSegment[] = [
      {
        id: 'opening1',
        type: 'opening',
        position: 100 as Length,
        width: 800 as Length,
        elements: [],
        openingIds: ['opening1' as any]
      },
      {
        id: 'opening2',
        type: 'opening',
        position: 1200 as Length,
        width: 600 as Length,
        elements: [],
        openingIds: ['opening2' as any]
      }
    ]

    const measurements = calculateOpeningSpacingMeasurements(mockSegments, 3000 as Length, 2400 as Length)

    // Should have 3 measurements: start to first opening, between openings, and last opening to end
    expect(measurements).toHaveLength(3)

    // Start of wall to first opening: 0 to 100 = 100mm
    expect(measurements[0]).toMatchObject({
      type: 'opening-spacing',
      label: '100mm'
    })

    // Between openings: (100 + 800) to 1200 = 300mm
    expect(measurements[1]).toMatchObject({
      type: 'opening-spacing',
      label: '300mm'
    })

    // Last opening to end: (1200 + 600) to 3000 = 1200mm
    expect(measurements[2]).toMatchObject({
      type: 'opening-spacing',
      label: '1200mm'
    })
  })

  it('handles adjacent openings with zero spacing', () => {
    const mockSegments: ConstructionSegment[] = [
      {
        id: 'opening1',
        type: 'opening',
        position: 100 as Length,
        width: 800 as Length,
        elements: [],
        openingIds: ['opening1' as any]
      },
      {
        id: 'opening2',
        type: 'opening',
        position: 900 as Length, // Starts right where first one ends
        width: 600 as Length,
        elements: [],
        openingIds: ['opening2' as any]
      }
    ]

    const measurements = calculateOpeningSpacingMeasurements(mockSegments, 1500 as Length, 2400 as Length)

    // Should have 1 measurement: start to first opening only (openings are adjacent and fill to end)
    expect(measurements).toHaveLength(1)

    // Start of wall to first opening: 0 to 100 = 100mm
    expect(measurements[0]).toMatchObject({
      type: 'opening-spacing',
      label: '100mm'
    })
  })
})
