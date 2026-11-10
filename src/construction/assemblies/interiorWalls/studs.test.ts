import { describe, expect, it } from 'vitest'

import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import { TAG_INFILL, TAG_POST, TAG_WALL_REINFORCEMENT } from '@/construction/model/tags'
import { newVec3 } from '@/shared/geometry'

import { constructStudSegment, getNogginBands, getStudPositions } from './studs'

describe('constructStudSegment', () => {
  it('keeps stud spacing within the configured range', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(2000, 100, 2400))
    const results = Array.from(
      constructStudSegment(
        area,
        {
          minStudSpacing: 200,
          desiredStudSpacing: 800,
          maxStudSpacing: 900,
          studWidth: 40,
          studMaterial: 'material_stud' as never,
          equidistantStuds: true,
          fillMaterial: 'material_fill' as never,
          nogginThickness: 60,
          nogginSpacing: 1500,
          equidistantNoggins: false,
          staggerNoggins: false
        },
        true,
        true
      )
    )

    const studs = results.filter(result => result.type === 'element' && result.element.tags?.includes(TAG_POST))
    expect(studs).toHaveLength(4)
    expect(results.filter(result => result.type === 'measurement')).toHaveLength(3)
  })

  it('can construct a filled segment without studs at its boundaries', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(500, 100, 2400))
    const results = Array.from(
      constructStudSegment(
        area,
        {
          minStudSpacing: 70,
          desiredStudSpacing: 800,
          maxStudSpacing: 900,
          studWidth: 40,
          studMaterial: 'material_stud' as never,
          equidistantStuds: true,
          fillMaterial: 'material_fill' as never,
          nogginThickness: 60,
          nogginSpacing: 1500,
          equidistantNoggins: false,
          staggerNoggins: false
        },
        false,
        false
      )
    )

    expect(results.some(result => result.type === 'element')).toBe(true)
  })

  it('keeps the desired pitch in exact stud mode and leaves the terminal remainder', () => {
    expect(getStudPositions(1040, 40, 600, 200, 900, true, true, false)).toEqual([0, 600, 1000])
  })

  it('splits fill around exact and staggered noggin bands', () => {
    const exact = getNogginBands(2400, 60, 1000, false, false, 0)
    const staggered = getNogginBands(2400, 60, 1000, false, true, 1)

    expect(exact.map(band => band.start)).toEqual([1000, 2000])
    expect(staggered.map(band => band.start)).toEqual([1060, 2060])
  })

  it('distributes equidistant noggins through the available height', () => {
    const bands = getNogginBands(2400, 60, 1500, true, false, 0)

    expect(bands).toHaveLength(1)
    expect(bands[0].start).toBe(1170)
  })

  it('splits fill around generated noggins', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(2000, 100, 2400))
    const results = Array.from(
      constructStudSegment(
        area,
        {
          minStudSpacing: 200,
          desiredStudSpacing: 800,
          maxStudSpacing: 900,
          studWidth: 40,
          studMaterial: 'material_stud' as never,
          equidistantStuds: true,
          fillMaterial: 'material_fill' as never,
          nogginMaterial: 'material_noggin' as never,
          nogginThickness: 60,
          nogginSpacing: 1500,
          equidistantNoggins: false,
          staggerNoggins: false
        },
        true,
        true
      )
    )

    const fill = results.filter(result => result.type === 'element' && result.element.tags?.includes(TAG_INFILL))
    const noggins = results.filter(
      result => result.type === 'element' && result.element.tags?.includes(TAG_WALL_REINFORCEMENT)
    )
    expect(fill).toHaveLength(6)
    expect(noggins).toHaveLength(3)
  })
})
