import type { GcsWrapper } from '@salusoft89/planegcs'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { keyFromSelector } from 'i18next'
import manifoldWasmUrl from 'manifold-3d/manifold.wasm?url'
import path from 'path'
import { afterEach, beforeAll, vi } from 'vitest'

import { newVec2 } from '@/shared/geometry/2d'
import { loadManifoldModule } from '@/shared/geometry/manifoldInstance'
import { partial } from '@/test/helpers'

vi.mock('@/shared/utils/version', () => ({
  VERSION_INFO: {
    version: 'test',
    commit: 'test',
    commitFull: 'test',
    buildTime: '-',
    branch: '-',
    tag: 'test',
    commitsSinceTag: 0
  }
}))

vi.mock('@/shared/geometry/clipperInstance', () => {
  interface ClipperPoint {
    x: number
    y: number
    delete: () => void
  }

  interface ClipperPath {
    points: number[][]
    delete: () => void
    size: () => number
    get: (index: number) => ClipperPoint
  }

  interface ClipperPaths {
    paths: ClipperPath[]
    delete: () => void
    size: () => number
    get: (index: number) => ClipperPath
  }

  const noop = (): undefined => undefined

  const createClipperPoint = (x: number, y: number): ClipperPoint => ({
    x,
    y,
    delete: noop
  })

  const createClipperPath = (points: number[][]): ClipperPath => ({
    points,
    delete: noop,
    size: () => points.length,
    get: (index: number) => {
      const [x, y] = points[index] ?? [0, 0]
      return createClipperPoint(x, y)
    }
  })

  const createClipperPaths = (paths: ClipperPath[]): ClipperPaths => ({
    paths,
    delete: noop,
    size: () => paths.length,
    get: (index: number) => paths[index]
  })

  const polygonArea = (points: number[][]): number => {
    let area = 0
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i]
      const [x2, y2] = points[(i + 1) % points.length]
      area += x1 * y2 - x2 * y1
    }
    return area / 2
  }

  const isPointInside = (point: number[], polygon: number[][]): boolean => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0]
      const yi = polygon[i][1]
      const xj = polygon[j][0]
      const yj = polygon[j][1]

      const intersect =
        yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi || 1) + xi
      if (intersect) inside = !inside
    }
    return inside
  }

  const mockModule = {
    PointInPolygonResult: {
      IsOutside: { value: 0 },
      IsInside: { value: 1 },
      IsOn: { value: 2 }
    },
    FillRule: {
      EvenOdd: { value: 0 },
      NonZero: { value: 1 },
      Positive: { value: 2 },
      Negative: { value: 3 }
    },
    JoinType: {
      Square: { value: 0 },
      Round: { value: 2 },
      Miter: { value: 3 }
    },
    EndType: {
      Polygon: { value: 0 },
      Joined: { value: 1 },
      Butt: { value: 2 },
      Square: { value: 3 },
      Round: { value: 4 }
    },
    PointInPolygonD: vi.fn((point: ClipperPoint, path: ClipperPath) => ({
      value: isPointInside([point.x, point.y], path.points)
        ? mockModule.PointInPolygonResult.IsInside.value
        : mockModule.PointInPolygonResult.IsOutside.value
    })),
    AreaPathD: vi.fn((path: ClipperPath) => polygonArea(path.points)),
    IsPositiveD: vi.fn((path: ClipperPath) => polygonArea(path.points) >= 0),
    SimplifyPathD: vi.fn((path: ClipperPath) => ({ delete: noop, points: path.points })),
    UnionSelfD: vi.fn((pathsD: ClipperPaths) => createClipperPaths(pathsD.paths)),
    IntersectD: vi.fn((pathsD: ClipperPaths) => createClipperPaths(pathsD.paths)),
    InflatePathsD: vi.fn((pathsD: ClipperPaths) => createClipperPaths(pathsD.paths))
  }

  return {
    getClipperModule: vi.fn(() => mockModule),
    ensureClipperModule: vi.fn(),
    loadClipperModule: vi.fn(() => mockModule),
    createPathD: vi.fn((points: ArrayLike<number>[]) => createClipperPath(points.map(point => [point[0], point[1]]))),
    createPathsD: vi.fn((paths: ClipperPath[]) => createClipperPaths(paths)),
    createPointD: vi.fn((point: ArrayLike<number>) => createClipperPoint(point[0], point[1])),
    pathDToPoints: vi.fn((path: ClipperPath) => path.points.map(([x, y]) => newVec2(x, y)))
  }
})

vi.mock('@/editor/gcs/gcsInstance', () => ({
  createGcs: () =>
    partial<GcsWrapper>({
      clear_data: vi.fn(),
      push_primitives_and_params: vi.fn(),
      solve: vi.fn(),
      get_gcs_conflicting_constraints: vi.fn(),
      get_gcs_redundant_constraints: vi.fn()
    })
}))

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: vi.fn((i18nKey: any) => keyFromSelector(i18nKey)),
    i18n: {
      changeLanguage: () => new Promise(vi.fn())
    }
  })),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn()
  }
}))

// Mock Zustand for consistent testing
vi.mock('zustand')

// Mock ResizeObserver
class ResizeObserverMock {
  callback: ResizeObserverCallback | undefined
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock)

// Mock SVG DOM methods for CTM support
beforeAll(() => {
  // Mock SVGElement methods
  Object.defineProperty(SVGElement.prototype, 'getScreenCTM', {
    writable: true,
    value: vi.fn(() => ({
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0, // Identity matrix
      inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
    }))
  })

  Object.defineProperty(SVGElement.prototype, 'createSVGPoint', {
    writable: true,
    value: vi.fn(() => ({
      x: 0,
      y: 0,
      matrixTransform: vi.fn(() => ({ x: 0, y: 0 }))
    }))
  })

  Object.defineProperty(SVGElement.prototype, 'getBoundingClientRect', {
    writable: true,
    value: vi.fn(() => ({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100
    }))
  })
})

// Load Manifold WASM module
beforeAll(async () => {
  function resolveBundledAssetPath(assetUrl: string): string {
    const normalized = assetUrl.startsWith('/') ? assetUrl.slice(1) : assetUrl
    return path.resolve(process.cwd(), normalized)
  }
  await loadManifoldModule({ wasmUrl: resolveBundledAssetPath(manifoldWasmUrl) })
})

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})
