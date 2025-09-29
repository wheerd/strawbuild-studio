import { describe, expect, it } from 'vitest'

import {
  type LineSegment2D,
  createVec2,
  distanceToLineSegment,
  doLineSegmentsIntersect,
  isPointAlreadyUsed,
  wouldClosingPolygonSelfIntersect,
  wouldPolygonSelfIntersect
} from './index'

describe('distanceToLineWall', () => {
  it('should return 0 for a point on the line wall', () => {
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

  it('should return distance to nearest endpoint when point is beyond line wall', () => {
    const point = createVec2(15, 0)
    const wall: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(10, 0)
    }

    const distance = distanceToLineSegment(point, wall)
    expect(distance).toBe(5) // Distance from (15,0) to (10,0)
  })

  it('should return distance to start point when point is before line wall', () => {
    const point = createVec2(-5, 0)
    const wall: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(10, 0)
    }

    const distance = distanceToLineSegment(point, wall)
    expect(distance).toBe(5) // Distance from (-5,0) to (0,0)
  })

  it('should handle degenerate line wall (point)', () => {
    const point = createVec2(3, 4)
    const wall: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(0, 0) // Same point
    }

    const distance = distanceToLineSegment(point, wall)
    expect(distance).toBe(5) // Distance from (3,4) to (0,0) is 5
  })

  it('should handle diagonal line wall', () => {
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

describe('doLineWallsIntersect', () => {
  it('should detect intersection of crossing walls', () => {
    const seg1: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(10, 10)
    }
    const seg2: LineSegment2D = {
      start: createVec2(0, 10),
      end: createVec2(10, 0)
    }

    expect(doLineSegmentsIntersect(seg1, seg2)).toBe(true)
  })

  it('should not detect intersection for parallel walls', () => {
    const seg1: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(10, 0)
    }
    const seg2: LineSegment2D = {
      start: createVec2(0, 5),
      end: createVec2(10, 5)
    }

    expect(doLineSegmentsIntersect(seg1, seg2)).toBe(false)
  })

  it('should not detect intersection for walls that do not overlap', () => {
    const seg1: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(5, 0)
    }
    const seg2: LineSegment2D = {
      start: createVec2(10, 0),
      end: createVec2(15, 0)
    }

    expect(doLineSegmentsIntersect(seg1, seg2)).toBe(false)
  })

  it('should not detect intersection when walls share an endpoint', () => {
    const seg1: LineSegment2D = {
      start: createVec2(0, 0),
      end: createVec2(5, 5)
    }
    const seg2: LineSegment2D = {
      start: createVec2(5, 5),
      end: createVec2(10, 0)
    }

    expect(doLineSegmentsIntersect(seg1, seg2)).toBe(false)
  })

  it('should detect intersection for perpendicular walls', () => {
    const seg1: LineSegment2D = {
      start: createVec2(5, 0),
      end: createVec2(5, 10)
    }
    const seg2: LineSegment2D = {
      start: createVec2(0, 5),
      end: createVec2(10, 5)
    }

    expect(doLineSegmentsIntersect(seg1, seg2)).toBe(true)
  })
})

describe('wouldPolygonSelfIntersect', () => {
  it('should return false for empty polygon', () => {
    expect(wouldPolygonSelfIntersect([], createVec2(5, 5))).toBe(false)
  })

  it('should return false for first two points', () => {
    const points = [createVec2(0, 0)]
    expect(wouldPolygonSelfIntersect(points, createVec2(10, 0))).toBe(false)
  })

  it('should return false for valid triangle continuation', () => {
    const points = [createVec2(0, 0), createVec2(10, 0)]
    expect(wouldPolygonSelfIntersect(points, createVec2(5, 10))).toBe(false)
  })

  it('should return true for self-intersecting continuation', () => {
    const points = [createVec2(0, 0), createVec2(10, 0), createVec2(10, 10)]
    // This would create a line that intersects the first wall
    expect(wouldPolygonSelfIntersect(points, createVec2(5, -5))).toBe(true)
  })

  it('should return false for valid concave polygon continuation', () => {
    const points = [createVec2(0, 0), createVec2(10, 0), createVec2(10, 10)]
    // Creating a concave shape without self-intersection
    expect(wouldPolygonSelfIntersect(points, createVec2(5, 5))).toBe(false)
  })

  it('should return true when trying to reuse an existing point', () => {
    const points = [createVec2(0, 0), createVec2(10, 0), createVec2(10, 10)]
    // Trying to reuse the first point (not closing - that's handled separately)
    expect(wouldPolygonSelfIntersect(points, createVec2(0, 0))).toBe(true)
  })

  it('should return true when trying to reuse the second point', () => {
    const points = [createVec2(0, 0), createVec2(10, 0), createVec2(10, 10)]
    // Trying to reuse the second point
    expect(wouldPolygonSelfIntersect(points, createVec2(10, 0))).toBe(true)
  })

  it('should return true when trying to reuse the last point', () => {
    const points = [createVec2(0, 0), createVec2(10, 0), createVec2(10, 10)]
    // Trying to reuse the current last point
    expect(wouldPolygonSelfIntersect(points, createVec2(10, 10))).toBe(true)
  })

  it('should return true for nearly identical points within tolerance', () => {
    const points = [createVec2(0, 0), createVec2(10, 0)]
    // Point very close to first point (within floating point precision)
    expect(wouldPolygonSelfIntersect(points, createVec2(0.0000001, 0))).toBe(true)
  })
})

describe('isPointAlreadyUsed', () => {
  it('should return false for empty points array', () => {
    expect(isPointAlreadyUsed([], createVec2(5, 5))).toBe(false)
  })

  it('should return true for exact point match', () => {
    const points = [createVec2(0, 0), createVec2(10, 0)]
    expect(isPointAlreadyUsed(points, createVec2(0, 0))).toBe(true)
  })

  it('should return false for different points', () => {
    const points = [createVec2(0, 0), createVec2(10, 0)]
    expect(isPointAlreadyUsed(points, createVec2(5, 5))).toBe(false)
  })

  it('should return true for points within tolerance', () => {
    const points = [createVec2(0, 0)]
    expect(isPointAlreadyUsed(points, createVec2(0.0000001, 0.0000001))).toBe(true)
  })

  it('should return false for points outside tolerance', () => {
    const points = [createVec2(0, 0)]
    expect(isPointAlreadyUsed(points, createVec2(0.1, 0))).toBe(false)
  })
})

describe('wouldClosingPolygonSelfIntersect', () => {
  it('should return false for simple triangle', () => {
    const points = [createVec2(0, 0), createVec2(10, 0), createVec2(5, 10)]
    expect(wouldClosingPolygonSelfIntersect(points)).toBe(false)
  })

  it('should return true for self-intersecting quadrilateral', () => {
    // Create a bowtie/figure-8 shape: (0,0) -> (10,0) -> (5,5) -> (15,5) -> back to (0,0)
    // The closing line from (15,5) to (0,0) should intersect the line from (10,0) to (5,5)
    const points = [createVec2(0, 0), createVec2(10, 0), createVec2(5, 5), createVec2(15, 5)]
    expect(wouldClosingPolygonSelfIntersect(points)).toBe(true)
  })

  it('should return false for valid rectangle', () => {
    const points = [createVec2(0, 0), createVec2(10, 0), createVec2(10, 10), createVec2(0, 10)]
    expect(wouldClosingPolygonSelfIntersect(points)).toBe(false)
  })

  it('should return false for less than 3 points', () => {
    expect(wouldClosingPolygonSelfIntersect([])).toBe(false)
    expect(wouldClosingPolygonSelfIntersect([createVec2(0, 0)])).toBe(false)
    expect(wouldClosingPolygonSelfIntersect([createVec2(0, 0), createVec2(10, 0)])).toBe(false)
  })

  it('should return false for valid L-shaped polygon', () => {
    const points = [
      createVec2(0, 0),
      createVec2(10, 0),
      createVec2(10, 5),
      createVec2(5, 5),
      createVec2(5, 10),
      createVec2(0, 10)
    ]
    expect(wouldClosingPolygonSelfIntersect(points)).toBe(false)
  })
})
