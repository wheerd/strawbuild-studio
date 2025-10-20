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
  isPointInPolygon,
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
