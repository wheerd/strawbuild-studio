import { describe, expect, it } from 'vitest'

import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import { TAG_POST } from '@/construction/model/tags'
import { newVec3 } from '@/shared/geometry'

import { constructStudSegment } from './studs'

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
          fillMaterial: 'material_fill' as never
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
          fillMaterial: 'material_fill' as never
        },
        false,
        false
      )
    )

    expect(results.some(result => result.type === 'element')).toBe(true)
  })
})
