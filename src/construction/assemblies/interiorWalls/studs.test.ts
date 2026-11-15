import { describe, expect, it } from 'vitest'

import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import {
  TAG_INFILL,
  TAG_NOGGIN_SPACING,
  TAG_STUD_SPACING,
  TAG_WALL_NOGGIN,
  TAG_WALL_STUD
} from '@/construction/model/tags'
import { newVec3 } from '@/shared/geometry'

import { constructStudInfill, constructStudWallSegment } from './studs'

const config = {
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

describe('constructStudWallSegment', () => {
  it('constructs boundary and intermediate studs within the spacing limits', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(2000, 100, 2400))
    const results = Array.from(constructStudWallSegment(area, config, true, true))

    const studs = results.filter(result => result.type === 'element' && result.element.tags?.includes(TAG_WALL_STUD))
    const spacingMeasurements = results.filter(
      result => result.type === 'measurement' && result.measurement.tags?.includes(TAG_STUD_SPACING)
    )

    expect(studs).toHaveLength(4)
    expect(spacingMeasurements).toHaveLength(3)
  })

  it('constructs filled infill without boundary studs when the segment is short', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(500, 100, 2400))
    const results = Array.from(constructStudWallSegment(area, config, false, false))

    expect(results.some(result => result.type === 'element' && result.element.tags?.includes(TAG_INFILL))).toBe(true)
    expect(results.some(result => result.type === 'element' && result.element.tags?.includes(TAG_WALL_STUD))).toBe(
      false
    )
  })

  it('reports an error when a boundary stud does not fit', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(20, 100, 2400))
    const results = Array.from(constructStudWallSegment(area, config, true, false))

    expect(results.some(result => result.type === 'error')).toBe(true)
  })
})

describe('constructStudInfill', () => {
  it('constructs and measures noggins separately from infill', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(500, 100, 2400))
    const results = Array.from(
      constructStudInfill(
        area,
        {
          ...config,
          nogginMaterial: 'material_noggin' as never
        },
        false
      )
    )

    const noggins = results.filter(
      result => result.type === 'element' && result.element.tags?.includes(TAG_WALL_NOGGIN)
    )
    const nogginMeasurements = results.filter(
      result => result.type === 'measurement' && result.measurement.tags?.includes(TAG_NOGGIN_SPACING)
    )

    expect(noggins).toHaveLength(2)
    expect(nogginMeasurements).toHaveLength(3)
  })
})
