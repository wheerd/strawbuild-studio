import { describe, it, expect } from 'vitest'
import { distanceToLineSegment, createPoint2D, type LineSegment2D } from './geometry'

describe('distanceToLineSegment', () => {
  it('should return 0 for a point on the line segment', () => {
    const point = createPoint2D(5, 0)
    const segment: LineSegment2D = {
      start: createPoint2D(0, 0),
      end: createPoint2D(10, 0)
    }

    const distance = distanceToLineSegment(point, segment)
    expect(distance).toBe(0)
  })

  it('should return perpendicular distance to horizontal line', () => {
    const point = createPoint2D(5, 5)
    const segment: LineSegment2D = {
      start: createPoint2D(0, 0),
      end: createPoint2D(10, 0)
    }

    const distance = distanceToLineSegment(point, segment)
    expect(distance).toBe(5)
  })

  it('should return perpendicular distance to vertical line', () => {
    const point = createPoint2D(5, 5)
    const segment: LineSegment2D = {
      start: createPoint2D(0, 0),
      end: createPoint2D(0, 10)
    }

    const distance = distanceToLineSegment(point, segment)
    expect(distance).toBe(5)
  })

  it('should return distance to nearest endpoint when point is beyond line segment', () => {
    const point = createPoint2D(15, 0)
    const segment: LineSegment2D = {
      start: createPoint2D(0, 0),
      end: createPoint2D(10, 0)
    }

    const distance = distanceToLineSegment(point, segment)
    expect(distance).toBe(5) // Distance from (15,0) to (10,0)
  })

  it('should return distance to start point when point is before line segment', () => {
    const point = createPoint2D(-5, 0)
    const segment: LineSegment2D = {
      start: createPoint2D(0, 0),
      end: createPoint2D(10, 0)
    }

    const distance = distanceToLineSegment(point, segment)
    expect(distance).toBe(5) // Distance from (-5,0) to (0,0)
  })

  it('should handle degenerate line segment (point)', () => {
    const point = createPoint2D(3, 4)
    const segment: LineSegment2D = {
      start: createPoint2D(0, 0),
      end: createPoint2D(0, 0) // Same point
    }

    const distance = distanceToLineSegment(point, segment)
    expect(distance).toBe(5) // Distance from (3,4) to (0,0) is 5
  })

  it('should handle diagonal line segment', () => {
    const point = createPoint2D(0, 0)
    const segment: LineSegment2D = {
      start: createPoint2D(1, 1),
      end: createPoint2D(3, 3)
    }

    const distance = distanceToLineSegment(point, segment)
    // Distance from origin to line y=x starting at (1,1) should be sqrt(2) ≈ 1.414
    expect(Math.abs(distance - Math.sqrt(2))).toBeLessThan(1e-10)
  })

  it('should be symmetric for start and end points', () => {
    const point = createPoint2D(5, 5)
    const segment1: LineSegment2D = {
      start: createPoint2D(0, 0),
      end: createPoint2D(10, 0)
    }
    const segment2: LineSegment2D = {
      start: createPoint2D(10, 0),
      end: createPoint2D(0, 0)
    }

    const distance1 = distanceToLineSegment(point, segment1)
    const distance2 = distanceToLineSegment(point, segment2)
    expect(distance1).toBe(distance2)
  })
})
