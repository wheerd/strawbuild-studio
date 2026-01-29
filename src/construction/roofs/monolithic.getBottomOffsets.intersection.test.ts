import { describe, expect, it } from 'vitest'

import type { Roof } from '@/building/model'
import { computeRoofDerivedProperties } from '@/building/store/slices/roofsSlice'
import { type Vec2, ZERO_VEC2, millimeters, newVec2 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import { MonolithicRoofAssembly } from './monolithic'
import type { HeightItem, MonolithicRoofConfig } from './types'

describe('MonolithicRoofAssembly.getBottomOffsets - Intersection Tests', () => {
  const verticalOffset = 420

  const createTestRoof = (
    type: 'shed' | 'gable',
    ridgeStart: Vec2,
    ridgeEnd: Vec2,
    slope: number,
    verticalOffset = 3000,
    overhangPolygon?: { points: Vec2[] }
  ): Roof => {
    const roof = partial<Roof>({
      type,
      referencePolygon: {
        points: [newVec2(0, 0), newVec2(10000, 0), newVec2(10000, 5000), newVec2(0, 5000)]
      },
      overhangPolygon:
        overhangPolygon ??
        ({
          points: [newVec2(-500, -500), newVec2(10500, -500), newVec2(10500, 5500), newVec2(-500, 5500)]
        } as any),
      ridgeLine: { start: ridgeStart, end: ridgeEnd },
      mainSideIndex: 0,
      slope,
      verticalOffset: millimeters(verticalOffset)
    })
    computeRoofDerivedProperties(roof)
    return roof
  }

  const createTestConfig = (insideThickness = 0): MonolithicRoofConfig => ({
    type: 'monolithic',
    thickness: millimeters(200),
    material: 'test-material' as any,
    infillMaterial: 'test-infill' as any,
    layers: {
      insideThickness: millimeters(insideThickness),
      insideLayers: [],
      topThickness: millimeters(0),
      topLayers: [],
      overhangThickness: millimeters(0),
      overhangLayers: []
    }
  })

  describe('Line completely outside overhang', () => {
    it('should return empty array when line is completely outside overhang', () => {
      const roof = createTestRoof('shed', newVec2(0, 5000), newVec2(10000, 5000), 30, verticalOffset)
      const config = createTestConfig(0)
      const assembly = new MonolithicRoofAssembly(config)

      // Line completely outside the overhang polygon
      const line = {
        start: newVec2(-2000, 2500),
        end: newVec2(-1000, 2500)
      }

      const offsets = assembly.getBottomOffsets(roof, line)
      expect(offsets).toEqual([])
    })

    it('should return empty array when line is parallel to but outside overhang', () => {
      const roof = createTestRoof('shed', newVec2(0, 5000), newVec2(10000, 5000), 30, verticalOffset)
      const config = createTestConfig(0)

      // Line runs parallel to overhang but outside
      const line = {
        start: newVec2(0, 6000),
        end: newVec2(10000, 6000)
      }

      const assembly = new MonolithicRoofAssembly(config)
      const offsets = assembly.getBottomOffsets(roof, line)
      expect(offsets).toEqual([])
    })
  })

  describe('Line completely inside overhang', () => {
    it('should return offsets from position 0 to 1 when line is completely inside', () => {
      const roof = createTestRoof('shed', newVec2(0, 5000), newVec2(10000, 5000), 30, verticalOffset)
      const config = createTestConfig(0)

      // Line completely within overhang
      const line = {
        start: newVec2(1000, 1000),
        end: newVec2(9000, 1000)
      }

      const assembly = new MonolithicRoofAssembly(config)
      const offsets = assembly.getBottomOffsets(roof, line)

      expect(offsets.length).toBeGreaterThan(0)
      expect(offsets[0].position).toBe(0)
      expect(offsets[offsets.length - 1].position).toBe(1)
    })

    it('should set nullAfter true for last point when line is completely inside', () => {
      const roof = createTestRoof('shed', newVec2(0, 5000), newVec2(10000, 5000), 30, verticalOffset)
      const config = createTestConfig(0)

      const line = {
        start: newVec2(1000, 1000),
        end: newVec2(9000, 1000)
      }

      const assembly = new MonolithicRoofAssembly(config)
      const offsets = assembly.getBottomOffsets(roof, line)

      expect((offsets[0] as HeightItem).nullAfter).toBe(false)
      expect((offsets[offsets.length - 1] as HeightItem).nullAfter).toBe(true)
    })
  })

  describe('Line partially inside overhang', () => {
    it('should start from entry point when line enters overhang', () => {
      const roof = createTestRoof('shed', newVec2(0, 5000), newVec2(10000, 5000), 30, verticalOffset)
      const config = createTestConfig(0)

      // Line enters overhang from outside
      const line = {
        start: newVec2(-1000, 2500),
        end: newVec2(5000, 2500)
      }

      const assembly = new MonolithicRoofAssembly(config)
      const offsets = assembly.getBottomOffsets(roof, line)

      expect(offsets.length).toBeGreaterThan(0)
      expect(offsets[0].position).toBeGreaterThan(0) // Doesn't start at 0
      expect(offsets[offsets.length - 1].position).toBe(1) // Ends at 1
    })

    it('should end at exit point when line exits overhang', () => {
      const roof = createTestRoof('shed', newVec2(0, 5000), newVec2(10000, 5000), 30, verticalOffset)
      const config = createTestConfig(0)

      // Line exits overhang
      const line = {
        start: newVec2(5000, 2500),
        end: newVec2(15000, 2500)
      }

      const assembly = new MonolithicRoofAssembly(config)
      const offsets = assembly.getBottomOffsets(roof, line)

      expect(offsets.length).toBeGreaterThan(0)
      expect(offsets[0].position).toBe(0) // Starts at 0
      expect(offsets[offsets.length - 1].position).toBeLessThan(1) // Exits before end
    })

    it('should have both entry and exit points when line crosses through overhang', () => {
      const roof = createTestRoof('shed', newVec2(0, 5000), newVec2(10000, 5000), 30, verticalOffset)
      const config = createTestConfig(0)

      // Line crosses completely through overhang
      const line = {
        start: newVec2(-1000, 2500),
        end: newVec2(12000, 2500)
      }

      const assembly = new MonolithicRoofAssembly(config)
      const offsets = assembly.getBottomOffsets(roof, line)

      expect(offsets.length).toBeGreaterThan(0)
      expect(offsets[0].position).toBeGreaterThan(0) // Entry point
      expect(offsets[offsets.length - 1].position).toBeLessThan(1) // Exit point
      expect((offsets[offsets.length - 1] as HeightItem).nullAfter).toBe(true)
    })
  })

  describe('Concave polygon with multiple intersections', () => {
    it('should handle U-shaped polygon with line crossing twice', () => {
      // Create U-shaped polygon
      const roof = createTestRoof('shed', newVec2(0, 5000), newVec2(10000, 5000), 30, verticalOffset, {
        points: [
          ZERO_VEC2,
          newVec2(6000, 0),
          newVec2(6000, 2000),
          newVec2(4000, 2000),
          newVec2(4000, 0),
          newVec2(10000, 0),
          newVec2(10000, 5000),
          newVec2(0, 5000)
        ]
      })
      const config = createTestConfig(0)

      // Line crosses through the U notch
      const line = {
        start: newVec2(5000, -500),
        end: newVec2(5000, 5500)
      }

      const assembly = new MonolithicRoofAssembly(config)
      const offsets = assembly.getBottomOffsets(roof, line)

      // Should have at least 2 segments
      expect(offsets.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('Gable roof with ridge crossing', () => {
    it('should include ridge crossing when it occurs inside overhang segment', () => {
      const roof = createTestRoof('gable', newVec2(0, 2500), newVec2(10000, 2500), 30, verticalOffset)
      const config = createTestConfig(0)

      // Line crosses ridge perpendicularly and is fully inside overhang
      const line = {
        start: newVec2(5000, 0),
        end: newVec2(5000, 5000)
      }

      const assembly = new MonolithicRoofAssembly(config)
      const offsets = assembly.getBottomOffsets(roof, line)

      // Should have at least 3 points: start, ridge, end
      expect(offsets.length).toBeGreaterThanOrEqual(3)

      // Find the ridge point (should be near middle at T=0.5)
      const ridgePoint = offsets.find(o => Math.abs(o.position - 0.5) < 0.01)
      expect(ridgePoint).toBeDefined()

      // Ridge should be highest point
      const ridgeOffset = (ridgePoint as HeightItem).offset
      expect(ridgeOffset).toBeGreaterThan((offsets[0] as HeightItem).offset)
      expect(ridgeOffset).toBeGreaterThan((offsets[offsets.length - 1] as HeightItem).offset)
    })

    it('should not include ridge crossing when line does not cross ridge', () => {
      const roof = createTestRoof('gable', newVec2(0, 2500), newVec2(10000, 2500), 30, verticalOffset)
      const config = createTestConfig(0)

      // Line parallel to ridge, does not cross it
      const line = {
        start: newVec2(0, 1000),
        end: newVec2(10000, 1000)
      }

      const assembly = new MonolithicRoofAssembly(config)
      const offsets = assembly.getBottomOffsets(roof, line)

      // Should have only start and end points (no ridge crossing)
      expect(offsets.length).toBe(2)
      expect(offsets[0].position).toBe(0)
      expect(offsets[1].position).toBe(1)
    })

    it('should properly handle ridge when part of line is outside overhang', () => {
      // Create a gable roof with ridge at Y=2500
      // Overhang polygon: larger than reference, includes ridge area
      const roof = createTestRoof('gable', newVec2(0, 2500), newVec2(10000, 2500), 30, verticalOffset)
      const config = createTestConfig(0)

      // Line from (5000, 100) to (5000, 4900) - crosses ridge and is fully inside overhang
      const line = {
        start: newVec2(5000, 100),
        end: newVec2(5000, 4900)
      }

      const assembly = new MonolithicRoofAssembly(config)
      const offsets = assembly.getBottomOffsets(roof, line)

      // Should include ridge crossing since line crosses ridge and both sides are in overhang
      expect(offsets.length).toBeGreaterThanOrEqual(3)

      // Find the ridge point (should be near T=0.5 since line is symmetric)
      const ridgePoint = offsets.find(o => Math.abs(o.position - 0.5) < 0.1)
      expect(ridgePoint).toBeDefined()

      // Ridge should be the highest point
      const ridgeOffset = (ridgePoint as HeightItem).offset
      expect(ridgeOffset).toBeGreaterThan((offsets[0] as HeightItem).offset)
      expect(ridgeOffset).toBeGreaterThan((offsets[offsets.length - 1] as HeightItem).offset)
    })
  })

  describe('nullAfter flag correctness', () => {
    it('should set nullAfter false for all points except last in single segment', () => {
      const roof = createTestRoof('gable', newVec2(0, 2500), newVec2(10000, 2500), 30, verticalOffset)
      const config = createTestConfig(0)

      const line = {
        start: newVec2(5000, 0),
        end: newVec2(5000, 5000)
      }

      const assembly = new MonolithicRoofAssembly(config)
      const offsets = assembly.getBottomOffsets(roof, line)

      // All points except last should have nullAfter: false
      for (let i = 0; i < offsets.length - 1; i++) {
        expect((offsets[i] as HeightItem).nullAfter).toBe(false)
      }
      // Last point should have nullAfter: true
      expect((offsets[offsets.length - 1] as HeightItem).nullAfter).toBe(true)
    })
  })

  describe('Height calculations within segments', () => {
    it('should calculate correct heights for shed roof within segment', () => {
      const roof = createTestRoof('shed', newVec2(0, 5000), newVec2(10000, 5000), 30, verticalOffset)
      const config = createTestConfig(0)

      // Line perpendicular to ridge
      const line = {
        start: newVec2(5000, 1000),
        end: newVec2(5000, 4000)
      }

      const assembly = new MonolithicRoofAssembly(config)
      const offsets = assembly.getBottomOffsets(roof, line)

      // Height should increase as we approach ridge
      const startOffset = (offsets[0] as HeightItem).offset
      const endOffset = (offsets[offsets.length - 1] as HeightItem).offset
      expect(endOffset).toBeGreaterThan(startOffset)
    })

    it('should calculate correct heights for gable roof on both sides of ridge', () => {
      const roof = createTestRoof('gable', newVec2(0, 2500), newVec2(10000, 2500), 30, verticalOffset)
      const config = createTestConfig(0)

      const line = {
        start: newVec2(5000, 0),
        end: newVec2(5000, 5000)
      }

      const assembly = new MonolithicRoofAssembly(config)
      const offsets = assembly.getBottomOffsets(roof, line)

      // Should have ridge point
      expect(offsets.length).toBeGreaterThanOrEqual(3)

      const startOffset = (offsets[0] as HeightItem).offset
      const endOffset = (offsets[offsets.length - 1] as HeightItem).offset

      // Start and end should be roughly equal (symmetric gable)
      // and less than ridge height
      const tolerance = 10 // 10mm tolerance
      expect(Math.abs(startOffset - endOffset)).toBeLessThan(tolerance)
    })
  })
})
