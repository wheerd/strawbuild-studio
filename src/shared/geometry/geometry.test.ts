import { describe, expect, it } from 'vitest'

import { type LineSegment2D, createVec2, distanceToLineSegment } from './index'

describe('distanceToLineSegment', () => {
  it('should return 0 for a point on the line segment', () => {
    const point = createVec2(5, 0)
    const wall: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(10, 0)
    }

    const distance = distanceToLineSegment(point, wall)
    expect(distance).toBe(0)
  })

  it('should return perpendicular distance to horizontal line', () => {
    const point = createVec2(5, 5)
    const wall: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(10, 0)
    }

    const distance = distanceToLineSegment(point, wall)
    expect(distance).toBe(5)
  })

  it('should return perpendicular distance to vertical line', () => {
    const point = createVec2(5, 5)
    const wall: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(0, 10)
    }

    const distance = distanceToLineSegment(point, wall)
    expect(distance).toBe(5)
  })

  it('should return distance to nearest endpoint when point is beyond line segment', () => {
    const point = createVec2(15, 0)
    const wall: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(10, 0)
    }

    const distance = distanceToLineSegment(point, wall)
    expect(distance).toBe(5) // Distance from (15,0) to (10,0)
  })

  it('should return distance to start point when point is before line segment', () => {
    const point = createVec2(-5, 0)
    const wall: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(10, 0)
    }

    const distance = distanceToLineSegment(point, wall)
    expect(distance).toBe(5) // Distance from (-5,0) to (0,0)
  })

  it('should handle degenerate line segment (point)', () => {
    const point = createVec2(3, 4)
    const wall: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(0, 0) // Same point
    }

    const distance = distanceToLineSegment(point, wall)
    expect(distance).toBe(5) // Distance from (3,4) to (0,0) is 5
  })

  it('should handle diagonal line segment', () => {
    const point = createVec2(0, 0)
    const wall: LineSegment2D = {
      start: createVec2(1, 1),
      end: createVec2(3, 3)
    }

    const distance = distanceToLineSegment(point, wall)
    // Distance from origin to line y=x starting at (1,1) should be sqrt(2) ≈ 1.414
    expect(Math.abs(distance - Math.sqrt(2))).toBeLessThan(1e-10)
  })

  it('should be symmetric for start and end points', () => {
    const point = createVec2(5, 5)
    const wall1: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(10, 0)
    }
    const wall2: LineSegment2D = {
      start: createVec2(10, 0),
      end: createVec2(0, 0)
    }

    const distance1 = distanceToLineSegment(point, wall1)
    const distance2 = distanceToLineSegment(point, wall2)
    expect(distance1).toBe(distance2)
  })
})
