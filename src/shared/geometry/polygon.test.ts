import type { MainModule, PathD, PathsD } from 'clipper2-wasm'
import { vec2 } from 'gl-matrix'
import { type Mocked, afterEach, beforeEach, describe, expect, vi } from 'vitest'

import {
  createPathD,
  createPathsD,
  createPointD,
  getClipperModule,
  pathDToPoints
} from '@/shared/geometry/clipperInstance'
import {
  type Polygon2D,
  arePolygonsIntersecting,
  calculatePolygonArea,
  canonicalPolygonKey,
  convexHullOfPolygonWithHoles,
  isPointInPolygon,
  minimumAreaBoundingBox,
  offsetPolygon,
  polygonEdgeOffset,
  polygonIsClockwise,
  simplifyPolygon,
  unionPolygons,
  wouldClosingPolygonSelfIntersect
} from '@/shared/geometry/polygon'

vi.mock('@/shared/geometry/clipperInstance', () => {
  return {
    createPointD: vi.fn(),
    createPathD: vi.fn(),
    createPathsD: vi.fn(),
    pathDToPoints: vi.fn(),
    getClipperModule: vi.fn()
  }
})

describe('convexHullOfPolygonWithHoles', () => {
  const sortPoints = (points: vec2[]) =>
    points.map(point => Array.from(point)).sort(([ax, ay], [bx, by]) => (ax === bx ? ay - by : ax - bx))

  it('returns the rectangle corners for a convex polygon', () => {
    const rectangle = {
      outer: {
        points: [vec2.fromValues(0, 0), vec2.fromValues(1000, 0), vec2.fromValues(1000, 500), vec2.fromValues(0, 500)]
      },
      holes: []
    }

    const hull = convexHullOfPolygonWithHoles(rectangle)

    expect(sortPoints(hull.points)).toEqual([
      [0, 0],
      [0, 500],
      [1000, 0],
      [1000, 500]
    ])
  })

  it('removes concave interior points while maintaining hull order', () => {
    const concave = {
      outer: {
        points: [
          vec2.fromValues(0, 0),
          vec2.fromValues(2000, 0),
          vec2.fromValues(2000, 500),
          vec2.fromValues(1000, 250),
          vec2.fromValues(2000, 1500),
          vec2.fromValues(0, 1500)
        ]
      },
      holes: []
    }

    const hull = convexHullOfPolygonWithHoles(concave)

    expect(sortPoints(hull.points)).toEqual([
      [0, 0],
      [0, 1500],
      [2000, 0],
      [2000, 1500]
    ])
  })
})

describe('canonicalPolygonKey', () => {
  const translate = (points: vec2[], dx: number, dy: number): vec2[] =>
    points.map(point => vec2.fromValues(point[0] + dx, point[1] + dy))
  const rotate90 = (points: vec2[]): vec2[] => points.map(point => vec2.fromValues(-point[1], point[0]))
  const mirrorYAxis = (points: vec2[]): vec2[] => points.map(point => vec2.fromValues(-point[0], point[1]))
  const changeStartingVertex = (points: vec2[], offset: number): vec2[] => {
    const count = points.length
    return Array.from({ length: count }, (_, index) => vec2.clone(points[(index + offset) % count]))
  }
  const reverseOrder = (points: vec2[]): vec2[] =>
    points
      .slice()
      .reverse()
      .map(point => vec2.clone(point))

  const basePoints: vec2[] = [
    vec2.fromValues(0, 0),
    vec2.fromValues(400, 0),
    vec2.fromValues(500, 300),
    vec2.fromValues(200, 500),
    vec2.fromValues(-100, 300)
  ]

  const baseKey = canonicalPolygonKey(basePoints)

  it('is translation invariant', () => {
    const translated = translate(basePoints, 10, -7)
    expect(canonicalPolygonKey(translated)).toBe(baseKey)
  })

  it('is rotation invariant', () => {
    const rotated = rotate90(basePoints)
    expect(canonicalPolygonKey(rotated)).toBe(baseKey)
  })

  it('is mirror invariant', () => {
    const mirrored = mirrorYAxis(basePoints)
    expect(canonicalPolygonKey(mirrored)).toBe(baseKey)
  })

  it('is invariant to reversed winding order', () => {
    const reversed = reverseOrder(basePoints)
    expect(canonicalPolygonKey(reversed)).toBe(baseKey)
  })

  it('is invariant to the starting vertex', () => {
    const rotatedStart = changeStartingVertex(basePoints, 2)
    expect(canonicalPolygonKey(rotatedStart)).toBe(baseKey)
  })

  it('returns different keys for different polygons', () => {
    const changedPolygon = [vec2.fromValues(10, 10), ...basePoints.slice(1)]
    expect(canonicalPolygonKey(changedPolygon)).not.toBe(baseKey)
  })
})

describe('minimumAreaBoundingBox', () => {
  const rotatePoint = (point: vec2, angle: number) => {
    const sinAngle = Math.sin(angle)
    const cosAngle = Math.cos(angle)
    return vec2.fromValues(point[0] * cosAngle - point[1] * sinAngle, point[0] * sinAngle + point[1] * cosAngle)
  }

  const createRectangle = (width: number, height: number, angle = 0): vec2[] => {
    const halfWidth = width / 2
    const halfHeight = height / 2
    const corners = [
      vec2.fromValues(-halfWidth, -halfHeight),
      vec2.fromValues(halfWidth, -halfHeight),
      vec2.fromValues(halfWidth, halfHeight),
      vec2.fromValues(-halfWidth, halfHeight)
    ]

    if (angle === 0) {
      return corners
    }

    return corners.map(corner => rotatePoint(corner, angle))
  }

  const sortedAbsComponents = (vector: vec2) => [Math.abs(vector[0]), Math.abs(vector[1])].sort((a, b) => a - b)
  const angleDifference = (a: number, b: number) => {
    const twoPi = Math.PI * 2
    let diff = (a - b) % twoPi
    if (diff < -Math.PI) diff += twoPi
    if (diff > Math.PI) diff -= twoPi
    return Math.abs(diff)
  }

  it('returns expected size and angle for an axis-aligned rectangle', () => {
    const rectangle = createRectangle(6, 2, 0)
    const { size, angle } = minimumAreaBoundingBox({ points: rectangle })

    const components = sortedAbsComponents(size)
    expect(components[0]).toBeCloseTo(2, 2)
    expect(components[1]).toBeCloseTo(6, 2)
    expect(
      Math.min(angleDifference(angle, 0), angleDifference(angle, Math.PI / 2), angleDifference(angle, -Math.PI / 2))
    ).toBeLessThan(1e-6)
  })

  it('finds the minimum box for a rotated rectangle', () => {
    const rotation = Math.PI / 6
    const rectangle = createRectangle(8, 3, rotation).map(point => vec2.fromValues(point[0] + 10, point[1] - 5))
    const { size, angle } = minimumAreaBoundingBox({ points: rectangle })

    const components = sortedAbsComponents(size)
    expect(components[0]).toBeCloseTo(3, 2)
    expect(components[1]).toBeCloseTo(8, 2)
    expect(
      Math.min(
        angleDifference(angle, rotation),
        angleDifference(angle, rotation + Math.PI / 2),
        angleDifference(angle, rotation - Math.PI / 2)
      )
    ).toBeLessThan(1e-6)
  })

  it('finds the minimum box for a rotated trapezoid with axis-aligned legs', () => {
    const trapezoid = {
      points: [vec2.fromValues(0, 0), vec2.fromValues(4, 4), vec2.fromValues(4, 6), vec2.fromValues(-2, 0)]
    }

    const { size, angle } = minimumAreaBoundingBox(trapezoid)

    const components = sortedAbsComponents(size)
    expect(components[0]).toBeCloseTo(Math.sqrt(2), 2)
    expect(components[1]).toBeCloseTo(6 * Math.SQRT2, 2)

    const target = Math.PI / 4
    expect(
      Math.min(
        angleDifference(angle, target),
        angleDifference(angle, target + Math.PI / 2),
        angleDifference(angle, target - Math.PI / 2)
      )
    ).toBeLessThan(1e-6)
  })

  it('throws when the polygon has fewer than three points', () => {
    const polygon = { points: [vec2.fromValues(0, 0), vec2.fromValues(1, 1)] }
    expect(() => minimumAreaBoundingBox(polygon)).toThrowError('Polygon requires at least 3 points')
  })

  it('throws when the polygon is degenerate after computing the hull', () => {
    const polygon = {
      points: [vec2.fromValues(0, 0), vec2.fromValues(2, 2), vec2.fromValues(4, 4), vec2.fromValues(6, 6)]
    }
    expect(() => minimumAreaBoundingBox(polygon)).toThrowError('Convex hull of polygon requires at least 3 points')
  })
})

const createPointDMock = vi.mocked(createPointD)
const createPathDMock = vi.mocked(createPathD)
const createPathsDMock = vi.mocked(createPathsD)
const pathDToPointsMock = vi.mocked(pathDToPoints)
const getClipperModuleMock = vi.mocked(getClipperModule)

function mockClipperModule(overrides: Partial<Mocked<ReturnType<typeof getClipperModule>>> = {}) {
  const module = {
    AreaPathD: vi.fn(() => 123),
    IsPositiveD: vi.fn(() => false),
    PointInPolygonD: vi.fn(() => ({ value: 1 })),
    PointInPolygonResult: { IsOutside: { value: 0 } },
    SimplifyPathD: vi.fn(path => path),
    InflatePathsD: vi.fn(() => ({ get: vi.fn(() => ({})), size: vi.fn(() => 1), delete: vi.fn() })),
    UnionSelfD: vi.fn(() => ({ size: vi.fn(() => 1), delete: vi.fn() })),
    IntersectD: vi.fn(() => ({ size: vi.fn(() => 0), delete: vi.fn() })),
    FillRule: { EvenOdd: { value: 0 } },
    JoinType: { Miter: { value: 3 } },
    EndType: { Polygon: { value: 0 } },
    PathD: vi.fn(),
    PathsD: vi.fn(),
    PointD: vi.fn()
  } as any as MainModule

  Object.assign(module, overrides)
  return module
}

beforeEach(() => {
  createPointDMock.mockReset()
  createPathDMock.mockReset()
  createPathsDMock.mockReset()
  pathDToPointsMock.mockReset()
  getClipperModuleMock.mockReset()

  createPointDMock.mockReturnValue({ delete: vi.fn() } as any)
  createPathDMock.mockReturnValue({ delete: vi.fn() } as any)
  createPathsDMock.mockReturnValue({ delete: vi.fn() } as any)
  pathDToPointsMock.mockReturnValue([new Float32Array(vec2.fromValues(0, 0))])
  getClipperModuleMock.mockReturnValue(mockClipperModule())
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('polygon helpers using Clipper', () => {
  const samplePolygon = {
    points: [vec2.fromValues(0, 0), vec2.fromValues(10, 0), vec2.fromValues(10, 10), vec2.fromValues(0, 10)].map(
      ([x, y]) => new Float32Array([x, y])
    )
  }

  it('calculatePolygonArea delegates to AreaPathD', () => {
    const module = mockClipperModule({ AreaPathD: vi.fn(_ => 456) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStub = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStub as any)

    const area = calculatePolygonArea(samplePolygon)

    expect(createPathDMock).toHaveBeenCalledWith(samplePolygon.points)
    expect(module.AreaPathD).toHaveBeenCalledWith(pathStub)
    expect(area).toEqual(456)
    expect(pathStub.delete).toHaveBeenCalled()
  })

  it('polygonIsClockwise delegates to IsPositiveD', () => {
    const module = mockClipperModule({ IsPositiveD: vi.fn(_ => true) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStub = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStub as any)

    const result = polygonIsClockwise(samplePolygon)

    expect(module.IsPositiveD).toHaveBeenCalledWith(pathStub)
    expect(result).toBe(false)
    expect(pathStub.delete).toHaveBeenCalled()
  })

  it('isPointInPolygon delegates to PointInPolygonD', () => {
    const module = mockClipperModule({
      PointInPolygonD: vi.fn((_1, _2) => ({ value: 1 })),
      PointInPolygonResult: { IsOutside: { value: 2 } } as any
    })
    getClipperModuleMock.mockReturnValue(module)
    const pointStub = { delete: vi.fn() }
    const pathStub = { delete: vi.fn() }
    createPointDMock.mockReturnValueOnce(pointStub as any)
    createPathDMock.mockReturnValueOnce(pathStub as any)

    const point = new Float32Array(vec2.fromValues(5, 5))
    const result = isPointInPolygon(point, samplePolygon)

    expect(createPointDMock).toHaveBeenCalledWith(point)
    expect(createPathDMock).toHaveBeenCalledWith(samplePolygon.points)
    expect(module.PointInPolygonD).toHaveBeenCalledWith(pointStub, pathStub)
    expect(result).toBe(true)
    expect(pointStub.delete).toHaveBeenCalled()
    expect(pathStub.delete).toHaveBeenCalled()
  })

  it('simplifyPolygon delegates to SimplifyPathD and returns points', () => {
    const simplifiedPath = { delete: vi.fn() } as any as PathD
    const module = mockClipperModule({ SimplifyPathD: vi.fn((_1, _2, _3) => simplifiedPath) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStub = { delete: vi.fn() }
    const pathsStub = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStub as any)
    createPathsDMock.mockReturnValueOnce(pathsStub as any)
    const pathPoints = [new Float32Array(vec2.fromValues(123, 456))]
    pathDToPointsMock.mockReturnValueOnce(pathPoints)

    const result = simplifyPolygon(samplePolygon, 23)

    expect(createPathDMock).toHaveBeenCalledWith(samplePolygon.points)
    expect(createPathsDMock).toHaveBeenCalledWith([pathStub])
    expect(module.SimplifyPathD).toHaveBeenCalledWith(pathStub, 23, true)
    expect(pathDToPointsMock).toHaveBeenCalledWith(simplifiedPath)
    expect(result.points).toBe(pathPoints)
    expect(pathsStub.delete).toHaveBeenCalled()
    expect(pathStub.delete).toHaveBeenCalled()
  })

  it('offsetPolygon delegates to InflatePathsD and unwraps points', () => {
    const inflatedPath = { delete: vi.fn() }
    const inflatedPaths = {
      get: vi.fn(() => inflatedPath),
      size: vi.fn(() => 1),
      delete: vi.fn()
    } as any as PathsD
    const module = mockClipperModule({ InflatePathsD: vi.fn((_1, _2, _3, _4, _5, _6, _7) => inflatedPaths) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStub = { delete: vi.fn() }
    const pathsStub = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStub as any)
    createPathsDMock.mockReturnValueOnce(pathsStub as any)
    const pathPoints = [new Float32Array(vec2.fromValues(123, 456))]
    pathDToPointsMock.mockReturnValueOnce(pathPoints)

    const result = offsetPolygon(samplePolygon, 5)

    expect(createPathDMock).toHaveBeenCalledWith(samplePolygon.points)
    expect(createPathsDMock).toHaveBeenCalledWith([pathStub])
    expect(module.InflatePathsD).toHaveBeenCalledWith(
      pathsStub,
      5,
      module.JoinType.Miter,
      module.EndType.Polygon,
      1000,
      2,
      expect.any(Number)
    )
    expect(pathDToPointsMock).toHaveBeenCalledWith(inflatedPath)
    expect(result.points).toBe(pathPoints)
    expect(pathsStub.delete).toHaveBeenCalled()
    expect(pathStub.delete).toHaveBeenCalled()
    expect(inflatedPaths.delete).toHaveBeenCalled()
  })

  it('arePolygonsIntersecting delegates to IntersectD', () => {
    const intersections = {
      size: vi.fn(() => 1),
      get: vi.fn(() => ({ size: vi.fn(() => 1) })),
      delete: vi.fn()
    } as any as PathsD
    const module = mockClipperModule({ IntersectD: vi.fn((_1, _2, _3, _4) => intersections) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStubA = { delete: vi.fn() }
    const pathStubB = { delete: vi.fn() }
    const pathsStubA = { delete: vi.fn() }
    const pathsStubB = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStubA as any).mockReturnValueOnce(pathStubB as any)
    createPathsDMock.mockReturnValueOnce(pathsStubA as any).mockReturnValueOnce(pathsStubB as any)

    const otherPolygon = {
      points: [vec2.fromValues(0, 0), vec2.fromValues(1, 1), vec2.fromValues(2, 2)]
    }
    const result = arePolygonsIntersecting(samplePolygon, otherPolygon)

    expect(createPathDMock).toHaveBeenCalledWith(samplePolygon.points)
    expect(createPathsDMock).toHaveBeenCalledWith([pathStubA])
    expect(createPathDMock).toHaveBeenCalledWith(otherPolygon.points)
    expect(createPathsDMock).toHaveBeenCalledWith([pathStubB])
    expect(module.IntersectD).toHaveBeenCalledWith(pathsStubA, pathsStubB, module.FillRule.EvenOdd, 2)
    expect(result).toBe(true)
    expect(pathStubA.delete).toHaveBeenCalled()
    expect(pathStubB.delete).toHaveBeenCalled()
    expect(pathsStubA.delete).toHaveBeenCalled()
    expect(pathsStubB.delete).toHaveBeenCalled()
    expect(intersections.delete).toHaveBeenCalled()
  })

  it('wouldClosingPolygonSelfIntersect delegates to UnionSelfD', () => {
    const union = {
      size: vi.fn(() => 2),
      delete: vi.fn()
    } as any as PathsD
    const module = mockClipperModule({ UnionSelfD: vi.fn((_1, _2, _3) => union) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStub = { delete: vi.fn() }
    const pathsStub = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStub as any)
    createPathsDMock.mockReturnValueOnce(pathsStub as any)

    const result = wouldClosingPolygonSelfIntersect(samplePolygon)

    expect(createPathDMock).toHaveBeenCalledWith(samplePolygon.points)
    expect(createPathsDMock).toHaveBeenCalledWith([pathStub])
    expect(module.UnionSelfD).toHaveBeenCalledWith(pathsStub, module.FillRule.EvenOdd, 2)
    expect(result).toBe(true)
    expect(pathsStub.delete).toHaveBeenCalled()
    expect(pathStub.delete).toHaveBeenCalled()
    expect(union.delete).toHaveBeenCalled()
  })
})

describe('polygonEdgeOffset', () => {
  const createClockwiseRectangle = (): Polygon2D => ({
    points: [vec2.fromValues(0, 0), vec2.fromValues(0, 10), vec2.fromValues(10, 10), vec2.fromValues(10, 0)]
  })

  it('expands a clockwise polygon when offsets are positive', () => {
    const rectangle = createClockwiseRectangle()
    const result = polygonEdgeOffset(rectangle, [1, 1, 1, 1])

    const expected = [
      vec2.fromValues(-1, -1),
      vec2.fromValues(-1, 11),
      vec2.fromValues(11, 11),
      vec2.fromValues(11, -1)
    ]

    expect(result.points).toHaveLength(expected.length)
    result.points.forEach((point, index) => {
      expect(point[0]).toBeCloseTo(expected[index][0], 6)
      expect(point[1]).toBeCloseTo(expected[index][1], 6)
    })
  })

  it('applies per-edge offsets individually', () => {
    const rectangle = createClockwiseRectangle()
    const offsets = [1, 2, 3, 4]

    const result = polygonEdgeOffset(rectangle, offsets)
    const expected = [
      vec2.fromValues(-1, -4),
      vec2.fromValues(-1, 12),
      vec2.fromValues(13, 12),
      vec2.fromValues(13, -4)
    ]

    result.points.forEach((point, index) => {
      expect(point[0]).toBeCloseTo(expected[index][0], 6)
      expect(point[1]).toBeCloseTo(expected[index][1], 6)
    })
  })

  it('handles colinear adjacent edges using fallback averaging', () => {
    const polygon: Polygon2D = {
      points: [
        vec2.fromValues(0, 0),
        vec2.fromValues(0, 10),
        vec2.fromValues(20, 10),
        vec2.fromValues(20, 0),
        vec2.fromValues(10, 0)
      ]
    }

    const result = polygonEdgeOffset(polygon, [1, 1, 1, 1, 1])
    const expected = [
      vec2.fromValues(-1, -1),
      vec2.fromValues(-1, 11),
      vec2.fromValues(21, 11),
      vec2.fromValues(21, -1),
      vec2.fromValues(10, -1)
    ]

    result.points.forEach((point, index) => {
      expect(point[0]).toBeCloseTo(expected[index][0], 6)
      expect(point[1]).toBeCloseTo(expected[index][1], 6)
    })
  })

  it('shrinks a polygon when offsets are negative', () => {
    const rectangle = createClockwiseRectangle()
    const result = polygonEdgeOffset(rectangle, [-1, -1, -1, -1])

    const expected = [vec2.fromValues(1, 1), vec2.fromValues(1, 9), vec2.fromValues(9, 9), vec2.fromValues(9, 1)]

    result.points.forEach((point, index) => {
      expect(point[0]).toBeCloseTo(expected[index][0], 6)
      expect(point[1]).toBeCloseTo(expected[index][1], 6)
    })
  })
})

describe('unionPolygons', () => {
  it('should return empty array for empty input', () => {
    const result = unionPolygons([])
    expect(result).toEqual([])
  })

  it('should return same polygon for single polygon input', () => {
    const polygon: Polygon2D = {
      points: [vec2.fromValues(0, 0), vec2.fromValues(10, 0), vec2.fromValues(10, 10), vec2.fromValues(0, 10)]
    }
    const result = unionPolygons([polygon])
    expect(result).toEqual([polygon])
  })

  it('should union two overlapping polygons', () => {
    const polygon1: Polygon2D = {
      points: [vec2.fromValues(0, 0), vec2.fromValues(10, 0), vec2.fromValues(10, 10), vec2.fromValues(0, 10)]
    }
    const polygon2: Polygon2D = {
      points: [vec2.fromValues(5, 5), vec2.fromValues(15, 5), vec2.fromValues(15, 15), vec2.fromValues(5, 15)]
    }

    const unionResultPath = { delete: vi.fn() } as any
    const union = {
      size: vi.fn(() => 1),
      get: vi.fn(() => unionResultPath),
      delete: vi.fn()
    } as any as PathsD
    const module = mockClipperModule({ UnionSelfD: vi.fn((_1, _2, _3) => union) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStub1 = { delete: vi.fn() }
    const pathStub2 = { delete: vi.fn() }
    const pathsStub = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStub1 as any).mockReturnValueOnce(pathStub2 as any)
    createPathsDMock.mockReturnValueOnce(pathsStub as any)
    const pathPoints = [new Float32Array(vec2.fromValues(123, 456))]
    pathDToPointsMock.mockReturnValueOnce(pathPoints)

    const result = unionPolygons([polygon1, polygon2])

    expect(createPathDMock).toHaveBeenCalledWith(polygon1.points)
    expect(createPathDMock).toHaveBeenCalledWith(polygon2.points)
    expect(createPathsDMock).toHaveBeenCalledWith([pathStub1, pathStub2])
    expect(module.UnionSelfD).toHaveBeenCalledWith(pathsStub, module.FillRule.NonZero, 2)
    expect(result).toHaveLength(1)
    expect(result[0].points).toBe(pathPoints)
    expect(pathsStub.delete).toHaveBeenCalled()
    expect(pathStub1.delete).toHaveBeenCalled()
    expect(pathStub2.delete).toHaveBeenCalled()
    expect(union.delete).toHaveBeenCalled()
  })
})
