import { describe, expect, it, vi } from 'vitest'

import type { Roof } from '@/building/model'
import { computeRoofDerivedProperties } from '@/building/store/slices/roofsSlice'
import { VerticalOffsetMap } from '@/construction/storeys/offsets'
import type { Polygon2D, Vec2 } from '@/shared/geometry'
import { millimeters, newVec2, splitPolygonByLine } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import { MonolithicRoofAssembly } from './monolithic'
import type { MonolithicRoofConfig } from './types'

vi.mock('@/shared/geometry/polygon', () => ({
  splitPolygonByLine: vi.fn()
}))

const mockSplitPolygonByLine = vi.mocked(splitPolygonByLine)

describe('MonolithicRoofAssembly.getBottomOffsets', () => {
  const verticalOffset = 420

  const createTestRoof = (
    type: 'shed' | 'gable',
    ridgeStart: Vec2,
    ridgeEnd: Vec2,
    slope: number,
    verticalOffset = 3000
  ): Roof => {
    const roof = partial<Roof>({
      type,
      referencePolygon: {
        points: [newVec2(0, 0), newVec2(10000, 0), newVec2(10000, 5000), newVec2(0, 5000)]
      },
      overhangPolygon: {
        points: [newVec2(-500, -500), newVec2(10500, -500), newVec2(10500, 5500), newVec2(-500, 5500)]
      },
      ridgeLine: { start: ridgeStart, end: ridgeEnd },
      mainSideIndex: 0,
      slope,
      verticalOffset: millimeters(verticalOffset)
    })
    computeRoofDerivedProperties(roof)
    return roof
  }

  const createTestConfig = (): MonolithicRoofConfig => ({
    type: 'monolithic',
    thickness: millimeters(200),
    material: 'test-material' as any,
    infillMaterial: 'test-infill' as any,
    insideLayerSetId: undefined,
    topLayerSetId: undefined,
    overhangLayerSetId: undefined
  })

  describe('Shed Roof', () => {
    it('should add one sloped area to map for shed roof', () => {
      const roof = createTestRoof('shed', newVec2(5000, 5000), newVec2(5000, 0), 30, verticalOffset)
      const config = createTestConfig()
      const assembly = new MonolithicRoofAssembly(config)
      mockSplitPolygonByLine.mockReturnValue([{ side: 'right', polygon: roof.overhangPolygon }])
      const ridgeHeight = roof.verticalOffset + roof.rise

      const mockMap = new VerticalOffsetMap(0, true)
      const addSlopedSpy = vi.spyOn(mockMap, 'addSlopedArea')

      assembly.getBottomOffsets(roof, mockMap, [])

      expect(addSlopedSpy).toHaveBeenCalledTimes(1)
      expect(addSlopedSpy).toHaveBeenCalledWith(
        roof.overhangPolygon,
        roof.ridgeLine.start,
        newVec2(1, 0),
        roof.slopeAngleRad,
        ridgeHeight
      )
    })
  })

  describe('Gable Roof', () => {
    it('should add two sloped areas to map for gable roof', () => {
      const roof = createTestRoof('gable', newVec2(5000, 5000), newVec2(5000, 0), 30, verticalOffset)
      const config = createTestConfig()
      const assembly = new MonolithicRoofAssembly(config)
      const polygon1: Polygon2D = { points: [newVec2(0, 0), newVec2(1, 1), newVec2(2, 2)] }
      const polygon2: Polygon2D = { points: [newVec2(3, 3), newVec2(4, 4), newVec2(5, 5)] }
      mockSplitPolygonByLine.mockReturnValue([
        { side: 'right', polygon: polygon1 },
        { side: 'left', polygon: polygon2 }
      ])
      const ridgeHeight = roof.verticalOffset + roof.rise

      const mockMap = new VerticalOffsetMap(0, true)
      const addSlopedSpy = vi.spyOn(mockMap, 'addSlopedArea')

      assembly.getBottomOffsets(roof, mockMap, [])

      expect(addSlopedSpy).toHaveBeenCalledTimes(2)
      expect(addSlopedSpy).toHaveBeenCalledWith(
        polygon1,
        roof.ridgeLine.start,
        newVec2(1, 0),
        roof.slopeAngleRad,
        ridgeHeight
      )
      expect(addSlopedSpy).toHaveBeenCalledWith(
        polygon2,
        roof.ridgeLine.start,
        newVec2(-1, -0),
        roof.slopeAngleRad,
        ridgeHeight
      )
    })
  })
})
