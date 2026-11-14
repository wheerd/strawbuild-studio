import { describe, expect, it } from 'vitest'

import { newVec2, newVec3 } from '@/shared/geometry'

import { WallConstructionArea } from './WallConstructionArea'

describe('withZAdjustment', () => {
  it('should adjust area without roof offsets', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000))

    const adjusted = area.withZAdjustment(100, 1000)

    expect(adjusted.position).toEqual(newVec3(0, 0, 100))
    expect(adjusted.size).toEqual(newVec3(3000, 300, 1000))
    expect(adjusted.topOffsets).toBeUndefined()
  })

  it('should add intersection points when roof is partially clipped', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, -200), // Roof at Z=2800
      newVec2(3000, -500) // Roof at Z=2500
    ])

    const adjusted = area.withZAdjustment(0, 2700)

    // At X=0: roof at 2800, above 2700 -> clipped to 0
    // At X=3000: roof at 2500, below 2700 -> offset -200
    // Should have intersection point where roof crosses 2700
    expect(adjusted.topOffsets!.length).toBeGreaterThan(2)

    // First point should be clipped
    expect(adjusted.topOffsets![0][0]).toBe(0)
    expect(adjusted.topOffsets![0][1]).toBe(0)

    // Should have an intersection point
    const intersectionPoint = adjusted.topOffsets![1]
    expect(intersectionPoint[1]).toBe(0) // At the boundary
    expect(intersectionPoint[0]).toBeGreaterThan(0)
    expect(intersectionPoint[0]).toBeLessThan(3000)

    // Last point should be unclipped
    const lastPoint = adjusted.topOffsets![adjusted.topOffsets!.length - 1]
    expect(lastPoint[0]).toBe(3000)
    expect(lastPoint[1]).toBe(-200)
  })

  it('should handle fully clipped roof', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, -200), // Roof at Z=2800
      newVec2(3000, -500) // Roof at Z=2500
    ])

    const adjusted = area.withZAdjustment(0, 1100)

    // New top (1100) and top offsets are removed
    expect(adjusted.size[2]).toEqual(1100)
    expect(adjusted.topOffsets).toBeUndefined()
  })
})

describe('splitAtHeightJumps', () => {
  it('returns the original area when the top contour is continuous', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, 0),
      newVec2(3000, -300)
    ])

    expect(area.splitAtHeightJumps()).toEqual([area])
  })

  it('splits the area into continuous sections at height jumps', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, 0),
      newVec2(1000, 0),
      newVec2(1000, -500),
      newVec2(3000, -500)
    ])

    const sections = area.splitAtHeightJumps()

    expect(sections).toHaveLength(2)
    expect(sections[0].position[0]).toBe(0)
    expect(sections[0].size[0]).toBe(1000)
    expect(sections[1].position[0]).toBe(1000)
    expect(sections[1].size[0]).toBe(2000)
    expect(
      sections.every(
        section =>
          section.topOffsets == null ||
          section.topOffsets.every((offset, index, offsets) => index === 0 || offset[0] > offsets[index - 1][0])
      )
    ).toBe(true)
  })
})

describe('splitAtTop', () => {
  it('splits a flat top by the requested thickness', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000))

    const [top, remainder] = area.splitAtTop(100)

    expect(top.position[2]).toBe(2900)
    expect(top.size[2]).toBe(100)
    expect(remainder.position[2]).toBe(0)
    expect(remainder.size[2]).toBe(2900)
  })

  it('keeps a sloped top strip perpendicular to the contour', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, 0),
      newVec2(3000, -300)
    ])

    const [top] = area.splitAtTop(100)
    const bottomAtStart = top.position[2] + top.getBottomOffsetsAt(0)[0]
    const topAtStart = area.position[2] + area.size[2]
    const slope = -300 / 3000
    const verticalDistance = topAtStart - bottomAtStart

    expect(verticalDistance / Math.sqrt(1 + slope * slope)).toBeCloseTo(100)
    expect(top.getBottomOffsetsAt(0)[0]).toBeGreaterThan(0)
    expect(top.getBottomOffsetsAt(3000)[0]).toBeCloseTo(0)
  })

  it('preserves the source bottom contour in the remainder', () => {
    const area = new WallConstructionArea(
      newVec3(0, 0, 0),
      newVec3(3000, 300, 3000),
      [newVec2(0, 0), newVec2(3000, -300)],
      [newVec2(0, 100), newVec2(3000, 0)]
    )

    const [, remainder] = area.splitAtTop(100)

    expect(remainder.getBottomOffsetsAt(0)[0]).toBe(100)
    expect(remainder.getBottomOffsetsAt(3000)[0]).toBe(0)
  })
})

describe('bottomOffsets', () => {
  it('should normalize bottom offsets so minimum is 0', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, -100), // Floor at Z=-100
      newVec2(3000, -300) // Floor at Z=-300
    ])

    // Should be normalized: subtract minimum (-300) from all
    expect(area.bottomOffsets).toBeDefined()
    expect(area.bottomOffsets![0]).toEqual(newVec2(0, 200))
    expect(area.bottomOffsets![1]).toEqual(newVec2(3000, 0))
  })

  it('should simplify flat bottom by removing offsets', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 0),
      newVec2(3000, 0)
    ])

    expect(area.bottomOffsets).toBeUndefined()
    expect(area.isBottomFlat).toBe(true)
  })

  it('should return bottom offsets at position', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200),
      newVec2(3000, 0)
    ])

    // At X=0: offset should be 200
    const atStart = area.getBottomOffsetsAt(0)
    expect(atStart).toEqual([200, 200])

    // At X=3000: offset should be 0
    const atEnd = area.getBottomOffsetsAt(3000)
    expect(atEnd).toEqual([0, 0])

    // At X=1500: should interpolate
    const atMiddle = area.getBottomOffsetsAt(1500)
    expect(atMiddle[0]).toBeCloseTo(100)
  })

  it('should handle withXAdjustment with bottom offsets', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200),
      newVec2(3000, 0)
    ])

    const adjusted = area.withXAdjustment(500, 2000)

    expect(adjusted.position[0]).toBe(500)
    expect(adjusted.size[0]).toBe(2000)
    expect(adjusted.bottomOffsets).toBeDefined()

    // First offset at X=0 (adjusted) should be interpolated from original at X=500
    expect(adjusted.bottomOffsets![0][0]).toBe(0)
    // At X=500 in original: linear interpolation from (0,200) to (3000,0)
    // ratio = 500/3000 = 0.16667, offset = 200 - 0.16667 * 200 = 166.67
    // But tolerance=1 captures point just before 500, giving offset at ~499.5 = 133.33
    expect(adjusted.bottomOffsets![0][1]).toBeCloseTo(133.33, 1)
  })

  it('should handle withZAdjustment clipping bottom offsets', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200), // Floor at Z=200
      newVec2(3000, 0) // Floor at Z=0
    ])

    // Adjust base up by 150 (newBase = 150)
    // Floor at X=0: 200 - 150 = 50 (above base, keep)
    // Floor at X=3000: 0 - 150 = -150 (below base, clip)
    const adjusted = area.withZAdjustment(150)

    expect(adjusted.position[2]).toBe(150)
    expect(adjusted.bottomOffsets).toBeDefined()

    // First point should be above new base
    expect(adjusted.bottomOffsets![0][1]).toBeCloseTo(50)

    // Last point should be clipped to 0
    const lastPoint = adjusted.bottomOffsets![adjusted.bottomOffsets!.length - 1]
    expect(lastPoint[1]).toBe(0)
  })

  it('should handle fully clipped bottom offsets', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200),
      newVec2(3000, 0)
    ])

    // Adjust base up by 300 (all floor points below new base)
    const adjusted = area.withZAdjustment(300)

    expect(adjusted.bottomOffsets).toBeUndefined()
  })
})

describe('getters', () => {
  it('should return correct minTopHeight', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, 0),
      newVec2(3000, -500)
    ])

    expect(area.minTopHeight).toBe(2500)
  })

  it('should return correct maxBottomHeight', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200),
      newVec2(3000, 0)
    ])

    expect(area.maxBottomHeight).toBe(200)
  })

  it('should return totalHeight', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000))

    expect(area.totalHeight).toBe(3000)
  })

  it('should return isTopFlat correctly', () => {
    const flatArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000))
    const slopedArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, 0),
      newVec2(3000, -500)
    ])

    expect(flatArea.isTopFlat).toBe(true)
    expect(slopedArea.isTopFlat).toBe(false)
  })

  it('should return isBottomFlat correctly', () => {
    const flatArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000))
    const slopedArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200),
      newVec2(3000, 0)
    ])

    expect(flatArea.isBottomFlat).toBe(true)
    expect(slopedArea.isBottomFlat).toBe(false)
  })

  it('should return isFlat when both top and bottom are flat', () => {
    const flatArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000))
    const topSlopedArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, 0),
      newVec2(3000, -500)
    ])
    const bottomSlopedArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), undefined, [
      newVec2(0, 200),
      newVec2(3000, 0)
    ])
    const bothSlopedArea = new WallConstructionArea(
      newVec3(0, 0, 0),
      newVec3(3000, 300, 3000),
      [newVec2(0, 0), newVec2(3000, -500)],
      [newVec2(0, 200), newVec2(3000, 0)]
    )

    expect(flatArea.isFlat).toBe(true)
    expect(topSlopedArea.isFlat).toBe(false)
    expect(bottomSlopedArea.isFlat).toBe(false)
    expect(bothSlopedArea.isFlat).toBe(false)
  })

  it('should maintain backward compatibility with minHeight', () => {
    const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 3000), [
      newVec2(0, 0),
      newVec2(3000, -500)
    ])

    expect(area.minHeight).toBe(area.minTopHeight)
  })
})
