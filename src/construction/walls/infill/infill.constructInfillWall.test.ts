import { describe, it, expect } from 'vitest'
import type { PerimeterWall } from '@/shared/types/model'
import type { Opening } from '@/shared/types/model'
import type { Perimeter } from '@/shared/types/model'
import type { Length } from '@/shared/geometry'
import type { LayersConfig } from '@/shared/types/config'
import {
  createOpeningId,
  createPerimeterWallId,
  createPerimeterId,
  createPerimeterCornerId,
  createPerimeterConstructionMethodId
} from '@/shared/types/ids'
import { constructInfillWall, type InfillConstructionConfig } from './infill'
import { createMaterialId } from '../../materials/material'
import { createVec2, createLength } from '@/shared/geometry'

const createTestWall = (overrides: Partial<PerimeterWall> = {}): PerimeterWall => ({
  id: createPerimeterWallId(),
  thickness: 360 as Length,
  constructionMethodId: createPerimeterConstructionMethodId(),
  openings: [],
  insideLength: 5000 as Length,
  outsideLength: 5000 as Length,
  wallLength: 5000 as Length,
  insideLine: { start: [0, 0], end: [5000, 0] },
  outsideLine: { start: [0, 360], end: [5000, 360] },
  direction: [1, 0],
  outsideDirection: [0, 1],
  ...overrides
})

const createTestPerimeter = (wall: PerimeterWall): Perimeter => ({
  id: createPerimeterId(),
  storeyId: 'test-storey' as any,
  walls: [wall],
  corners: [
    {
      id: createPerimeterCornerId(),
      insidePoint: createVec2(0, 0),
      outsidePoint: createVec2(-100, 400),
      constuctedByWall: 'previous' // doesn't belong to wall[0]
    },
    {
      id: createPerimeterCornerId(),
      insidePoint: createVec2(5000, 0),
      outsidePoint: createVec2(5100, 400),
      constuctedByWall: 'next' // doesn't belong to wall[0]
    }
  ]
})

const createTestOpening = (overrides: Partial<Opening> = {}): Opening => ({
  id: createOpeningId(),
  type: 'window',
  offsetFromStart: 2000 as Length,
  width: 800 as Length,
  height: 1200 as Length,
  sillHeight: 900 as Length,
  ...overrides
})

const createTestConfig = (): InfillConstructionConfig => ({
  type: 'infill',
  maxPostSpacing: 800 as Length,
  minStrawSpace: 70 as Length,
  posts: {
    type: 'full',
    width: 60 as Length,
    material: createMaterialId()
  },
  openings: {
    door: {
      padding: 15 as Length,
      headerThickness: 60 as Length,
      headerMaterial: createMaterialId(),
      sillThickness: 60 as Length,
      sillMaterial: createMaterialId(),
      fillingThickness: 30 as Length,
      fillingMaterial: createMaterialId()
    },
    window: {
      padding: 15 as Length,
      headerThickness: 60 as Length,
      headerMaterial: createMaterialId(),
      sillThickness: 60 as Length,
      sillMaterial: createMaterialId(),
      fillingThickness: 30 as Length,
      fillingMaterial: createMaterialId()
    },
    passage: {
      padding: 15 as Length,
      headerThickness: 60 as Length,
      headerMaterial: createMaterialId(),
      sillThickness: 60 as Length,
      sillMaterial: createMaterialId(),
      fillingThickness: 30 as Length,
      fillingMaterial: createMaterialId()
    }
  },
  straw: {
    baleLength: 800 as Length,
    baleHeight: 500 as Length,
    baleWidth: 360 as Length,
    material: createMaterialId()
  }
})

const createTestLayersConfig = (): LayersConfig => ({
  insideThickness: createLength(20),
  outsideThickness: createLength(20)
})

describe('constructInfillWall - Integration Tests', () => {
  describe('basic wall construction', () => {
    it('constructs wall without openings', () => {
      const wall = createTestWall({ openings: [] })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      expect(result.wallId).toBe(wall.id)
      expect(result.constructionType).toBe('infill')
      expect(result.wallDimensions).toEqual({
        length: 5000,
        boundaryLength: 5000,
        thickness: 360,
        height: 2500
      })
      expect(result.segments).toHaveLength(1)
      expect(result.segments[0].type).toBe('wall')
      expect(result.segments[0].position).toBe(0)
      expect(result.segments[0].width).toBe(5000)

      if (result.segments[0].type === 'wall') {
        expect(result.segments[0].constructionType).toBe('infill')
        expect(result.segments[0].elements).toBeDefined()
        expect(result.segments[0].elements.length).toBeGreaterThan(0)
      }
    })

    it('constructs wall with single opening', () => {
      const opening = createTestOpening({
        offsetFromStart: 2000 as Length,
        width: 800 as Length,
        type: 'window'
      })
      const wall = createTestWall({ openings: [opening] })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      expect(result.segments).toHaveLength(3) // wall + opening + wall

      // First wall segment
      expect(result.segments[0].type).toBe('wall')
      expect(result.segments[0].position).toBe(0)
      expect(result.segments[0].width).toBe(2000)

      // Opening segment
      expect(result.segments[1].type).toBe('opening')
      expect(result.segments[1].position).toBe(2000)
      expect(result.segments[1].width).toBe(800)
      if (result.segments[1].type === 'opening') {
        expect(result.segments[1].openingIds).toEqual([opening.id])
      }

      // Second wall segment
      expect(result.segments[2].type).toBe('wall')
      expect(result.segments[2].position).toBe(2800)
      expect(result.segments[2].width).toBe(2200)
    })

    it('constructs wall with multiple openings', () => {
      const opening1 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 600 as Length,
        type: 'door'
      })
      const opening2 = createTestOpening({
        offsetFromStart: 3000 as Length,
        width: 800 as Length,
        type: 'window'
      })
      const wall = createTestWall({ openings: [opening1, opening2] })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      expect(result.segments).toHaveLength(5) // wall + opening + wall + opening + wall

      // Check segment arrangement
      expect(result.segments[0].type).toBe('wall')
      expect(result.segments[0].position).toBe(0)
      expect(result.segments[0].width).toBe(1000)

      expect(result.segments[1].type).toBe('opening')
      expect(result.segments[1].position).toBe(1000)
      expect(result.segments[1].width).toBe(600)

      expect(result.segments[2].type).toBe('wall')
      expect(result.segments[2].position).toBe(1600)
      expect(result.segments[2].width).toBe(1400)

      expect(result.segments[3].type).toBe('opening')
      expect(result.segments[3].position).toBe(3000)
      expect(result.segments[3].width).toBe(800)

      expect(result.segments[4].type).toBe('wall')
      expect(result.segments[4].position).toBe(3800)
      expect(result.segments[4].width).toBe(1200)
    })

    it('constructs wall with opening at start', () => {
      const opening = createTestOpening({
        offsetFromStart: 0 as Length,
        width: 800 as Length,
        type: 'door'
      })
      const wall = createTestWall({
        openings: [opening],
        insideLength: 3000 as Length,
        outsideLength: 3000 as Length,
        wallLength: 3000 as Length
      })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      expect(result.segments).toHaveLength(2) // opening + wall

      expect(result.segments[0].type).toBe('opening')
      expect(result.segments[0].position).toBe(0)
      expect(result.segments[0].width).toBe(800)

      expect(result.segments[1].type).toBe('wall')
      expect(result.segments[1].position).toBe(800)
      expect(result.segments[1].width).toBe(2200)
    })

    it('constructs wall with opening at end', () => {
      const opening = createTestOpening({
        offsetFromStart: 2200 as Length,
        width: 800 as Length,
        type: 'window'
      })
      const wall = createTestWall({
        openings: [opening],
        insideLength: 3000 as Length,
        outsideLength: 3000 as Length,
        wallLength: 3000 as Length
      })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      expect(result.segments).toHaveLength(2) // wall + opening

      expect(result.segments[0].type).toBe('wall')
      expect(result.segments[0].position).toBe(0)
      expect(result.segments[0].width).toBe(2200)

      expect(result.segments[1].type).toBe('opening')
      expect(result.segments[1].position).toBe(2200)
      expect(result.segments[1].width).toBe(800)
    })
  })

  describe('wall dimensions and properties', () => {
    it('preserves wall dimensions correctly', () => {
      const wall = createTestWall({
        insideLength: 4000 as Length,
        wallLength: 4000 as Length,
        thickness: 300 as Length
      })
      const config = createTestConfig()
      const floorHeight = 2700 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      expect(result.wallDimensions).toEqual({
        length: 4000, // This is now the construction length including corners
        boundaryLength: 4000, // This is the original wall length
        thickness: 300,
        height: 2700
      })
    })

    it('sets correct construction type', () => {
      const wall = createTestWall()
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      expect(result.constructionType).toBe('infill')

      result.segments.forEach(segment => {
        if (segment.type === 'wall') {
          expect(segment.constructionType).toBe('infill')
        }
      })
    })
  })

  describe('element generation', () => {
    it('generates construction elements for wall segments', () => {
      const wall = createTestWall({ openings: [] })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      const wallSegment = result.segments[0]
      if (wallSegment.type === 'wall') {
        expect(wallSegment.elements).toBeDefined()
        expect(wallSegment.elements.length).toBeGreaterThan(0)

        // Check that elements have required properties
        wallSegment.elements.forEach(element => {
          expect(element.id).toBeDefined()
          expect(element.type).toBeDefined()
          expect(element.material).toBeDefined()
          expect(element.shape.position).toBeDefined()
          expect(element.shape.size).toBeDefined()
          expect(element.shape.position).toHaveLength(3)
          expect(element.shape.size).toHaveLength(3)
        })
      }
    })

    it('generates opening elements for opening segments', () => {
      const opening = createTestOpening()
      const wall = createTestWall({ openings: [opening] })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      const openingSegment = result.segments[1]
      if (openingSegment.type === 'opening') {
        expect(openingSegment.elements).toBeDefined()
        expect(openingSegment.elements.length).toBeGreaterThan(0)

        // Check that elements have required properties
        openingSegment.elements.forEach(element => {
          expect(element.id).toBeDefined()
          expect(element.type).toBeDefined()
          expect(element.material).toBeDefined()
          expect(element.shape.position).toBeDefined()
          expect(element.shape.size).toBeDefined()
        })
      }
    })
  })

  describe('error handling', () => {
    it('handles walls with no length', () => {
      const wall = createTestWall({
        insideLength: 0 as Length,
        openings: []
      })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      // Should still create a result, even if it has no meaningful segments
      expect(result).toBeDefined()
      expect(result.wallId).toBe(wall.id)
      expect(result.constructionType).toBe('infill')
    })

    it('handles very small walls', () => {
      const wall = createTestWall({
        insideLength: 50 as Length,
        wallLength: 50 as Length,
        outsideLength: 50 as Length,
        openings: []
      })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      expect(result).toBeDefined()
      expect(result.segments).toHaveLength(1)
      expect(result.segments[0].width).toBe(50)
    })
  })

  describe('opening type handling', () => {
    it('handles different opening types with correct configurations', () => {
      const door = createTestOpening({ type: 'door', offsetFromStart: 500 as Length })
      const window = createTestOpening({ type: 'window', offsetFromStart: 2000 as Length })
      const passage = createTestOpening({ type: 'passage', offsetFromStart: 3500 as Length })

      const wall = createTestWall({
        openings: [door, window, passage],
        insideLength: 6000 as Length
      })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      // Should have wall + door + wall + window + wall + passage + wall = 7 segments
      expect(result.segments).toHaveLength(7)

      // Check opening segments exist and have correct openingIds
      const openingSegments = result.segments.filter(s => s.type === 'opening')
      expect(openingSegments).toHaveLength(3)

      if (openingSegments[0].type === 'opening') {
        expect(openingSegments[0].openingIds).toEqual([door.id])
      }
      if (openingSegments[1].type === 'opening') {
        expect(openingSegments[1].openingIds).toEqual([window.id])
      }
      if (openingSegments[2].type === 'opening') {
        expect(openingSegments[2].openingIds).toEqual([passage.id])
      }
    })
  })
})
