import { describe, expect, it } from 'vitest'

import type { IntermediateWallWithGeometry } from '@/building/model'
import type { StudWallAssemblyConfig } from '@/config/types'
import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import {
  TAG_INFILL,
  TAG_NOGGIN_SPACING,
  TAG_STUD_SPACING,
  TAG_WALL_NOGGIN,
  TAG_WALL_PLANKING,
  TAG_WALL_STUD
} from '@/construction/model/tags'
import type { Bounds3D } from '@/shared/geometry'
import { newVec3 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import { StudInteriorWallAssembly } from './stud'

const config: StudWallAssemblyConfig = {
  id: 'test-stud-assembly' as never,
  name: 'Test Stud Assembly',
  minStudSpacing: 200,
  desiredStudSpacing: 800,
  maxStudSpacing: 900,
  studWidth: 40,
  studMaterial: 'material_stud' as never,
  equidistantStuds: true,
  type: 'stud' as const,
  layerSetId: 'layer-set' as never,
  headPlateThickness: 60,
  solePlateThickness: 60,
  plankThickness: 20,
  fillMaterial: 'material_fill' as never,
  nogginThickness: 60,
  nogginSpacing: 1000,
  equidistantNoggins: false,
  staggerNoggins: false
}

class TestStudAssembly extends StudInteriorWallAssembly {
  public constructSegment(area: WallConstructionArea, startsWithStud: boolean, endsWithStud: boolean) {
    return this.constructStudWallSegment(area, startsWithStud, endsWithStud)
  }

  public constructInfill(area: WallConstructionArea, stagger: boolean) {
    return this.constructStudInfill(area, stagger)
  }

  public constructCoreForTest(wall: IntermediateWallWithGeometry, area: WallConstructionArea) {
    return this.constructCore(wall, area, [], [], undefined as never, undefined as never, undefined as never)
  }

  public intervalCount(span: number) {
    return this.calculateIntervalCount(span)
  }
}

function elementYSize(result: { bounds: Bounds3D }) {
  return result.bounds.max[1] - result.bounds.min[1]
}

describe('StudInteriorWallAssembly.constructStudWallSegment', () => {
  it('constructs boundary and intermediate studs within the spacing limits', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(2000, 100, 2400))
    const assembly = new TestStudAssembly(config)
    const results = Array.from(assembly.constructSegment(area, true, true))

    const studs = results.filter(result => result.type === 'element' && result.element.tags?.includes(TAG_WALL_STUD))
    const spacingMeasurements = results.filter(
      result => result.type === 'measurement' && result.measurement.tags?.includes(TAG_STUD_SPACING)
    )

    expect(studs).toHaveLength(4)
    expect(spacingMeasurements).toHaveLength(3)
  })

  it('constructs filled infill without boundary studs when the segment is short', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(500, 100, 2400))
    const assembly = new TestStudAssembly(config)
    const results = Array.from(assembly.constructSegment(area, false, false))

    expect(results.some(result => result.type === 'element' && result.element.tags?.includes(TAG_INFILL))).toBe(true)
    expect(results.some(result => result.type === 'element' && result.element.tags?.includes(TAG_WALL_STUD))).toBe(
      false
    )
  })

  it('reports an error when a boundary stud does not fit', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(20, 100, 2400))
    const assembly = new TestStudAssembly(config)
    const results = Array.from(assembly.constructSegment(area, true, false))

    expect(results.some(result => result.type === 'error')).toBe(true)
  })

  it('uses one infill section when the segment is at the maximum spacing', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(900, 100, 2400))
    const assembly = new TestStudAssembly(config)
    const results = Array.from(assembly.constructSegment(area, false, false))

    expect(results.filter(result => result.type === 'measurement')).toHaveLength(1)
    expect(results.some(result => result.type === 'element' && result.element.tags?.includes(TAG_WALL_STUD))).toBe(
      false
    )
  })

  it('shortens the first infill when the remaining segment cannot fit two minimum intervals', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1010, 100, 2400))
    const assembly = new TestStudAssembly({ ...config, equidistantStuds: false })
    const results = Array.from(assembly.constructSegment(area, false, false))

    const measurements = results.filter(result => result.type === 'measurement')
    expect(measurements).toHaveLength(2)
    expect(measurements[0].measurement.endPoint[0] - measurements[0].measurement.startPoint[0]).toBe(770)
  })
})

describe('StudInteriorWallAssembly.constructStudInfill', () => {
  it('constructs and measures noggins separately from infill', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(500, 100, 2400))
    const assembly = new TestStudAssembly({ ...config, nogginMaterial: 'material_noggin' as never })
    const results = Array.from(assembly.constructInfill(area, false))

    const noggins = results.filter(
      result => result.type === 'element' && result.element.tags?.includes(TAG_WALL_NOGGIN)
    )
    const nogginMeasurements = results.filter(
      result => result.type === 'measurement' && result.measurement.tags?.includes(TAG_NOGGIN_SPACING)
    )

    expect(noggins).toHaveLength(2)
    expect(nogginMeasurements).toHaveLength(3)
  })

  it('creates only a spacing measurement when no infill or noggin material is configured', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(500, 100, 2400))
    const assembly = new TestStudAssembly({ ...config, fillMaterial: undefined, nogginMaterial: undefined })
    const results = Array.from(assembly.constructInfill(area, false))

    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('measurement')
  })

  it('distributes equidistant noggins across the infill height', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(500, 100, 2400))
    const assembly = new TestStudAssembly({
      ...config,
      nogginMaterial: 'material_noggin' as never,
      equidistantNoggins: true,
      nogginSpacing: 800
    })
    const results = Array.from(assembly.constructInfill(area, false))

    const noggins = results.filter(
      result => result.type === 'element' && result.element.tags?.includes(TAG_WALL_NOGGIN)
    )
    expect(noggins).toHaveLength(2)
    expect(noggins.every(result => result.type === 'element' && elementYSize(result.element) === 100)).toBe(true)
  })
})

describe('StudInteriorWallAssembly.calculateIntervalCount', () => {
  it('clamps the desired interval count to the configured spacing limits', () => {
    const assembly = new TestStudAssembly(config)

    expect(assembly.intervalCount(100)).toBe(1)
    expect(assembly.intervalCount(1700)).toBe(2)
    expect(assembly.intervalCount(2000)).toBe(3)
  })
})

describe('StudInteriorWallAssembly.constructCore', () => {
  it('reduces stud depth by the two applied planks', () => {
    const wall = partial<IntermediateWallWithGeometry>({ entityIds: [] })
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(2000, 100, 2400))
    const withoutPlanking = new TestStudAssembly({ ...config, plankMaterial: undefined })
    const withPlanking = new TestStudAssembly({ ...config, plankMaterial: 'material_plank' as never })

    const withoutPlankingStud = Array.from(withoutPlanking.constructCoreForTest(wall, area)).find(
      result => result.type === 'element' && result.element.tags?.includes(TAG_WALL_STUD)
    )
    const withPlankingResults = Array.from(withPlanking.constructCoreForTest(wall, area))
    const withPlankingStud = withPlankingResults.find(
      result => result.type === 'element' && result.element.tags?.includes(TAG_WALL_STUD)
    )
    const planks = withPlankingResults.filter(
      result => result.type === 'element' && result.element.tags?.includes(TAG_WALL_PLANKING)
    )

    expect(withoutPlankingStud?.type).toBe('element')
    expect(withPlankingStud?.type).toBe('element')
    if (withoutPlankingStud?.type !== 'element' || withPlankingStud?.type !== 'element') return

    expect(planks).toHaveLength(2)
    expect(
      planks.every(result => result.type === 'element' && elementYSize(result.element) === config.plankThickness)
    ).toBe(true)
    expect(elementYSize(withPlankingStud.element)).toBe(
      elementYSize(withoutPlankingStud.element) - 2 * config.plankThickness
    )
  })
})
