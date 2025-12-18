import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { vec2 } from 'gl-matrix'
import manifoldWasmUrl from 'manifold-3d/manifold.wasm?url'
import path from 'path'
import { afterEach, beforeAll, vi } from 'vitest'
import 'vitest-canvas-mock'

import { loadManifoldModule } from '@/shared/geometry/manifoldInstance'

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
    loadClipperModule: vi.fn(async () => mockModule),
    createPathD: vi.fn((points: ArrayLike<number>[]) => createClipperPath(points.map(point => [point[0], point[1]]))),
    createPathsD: vi.fn((paths: ClipperPath[]) => createClipperPaths(paths)),
    createPointD: vi.fn((point: ArrayLike<number>) => createClipperPoint(point[0], point[1])),
    pathDToPoints: vi.fn((path: ClipperPath) => path.points.map(([x, y]) => vec2.fromValues(x, y)))
  }
})

// Mock Zustand for consistent testing
vi.mock('zustand')

// Mock canvas before any imports
beforeAll(() => {
  // Mock the problematic canvas module completely
  vi.mock('canvas', () => ({
    default: {},
    Canvas: function MockCanvas() {
      return {}
    },
    createCanvas: () => ({}),
    loadImage: async () => await Promise.resolve({})
  }))

  // Mock konva's canvas usage
  vi.mock('konva/lib/index-node.js', () => ({}))
  vi.mock('konva', () => ({
    default: {
      Stage: vi.fn(),
      Layer: vi.fn(),
      Line: vi.fn(),
      Circle: vi.fn(),
      Text: vi.fn()
    },
    Stage: vi.fn(),
    Layer: vi.fn(),
    Line: vi.fn(),
    Circle: vi.fn(),
    Text: vi.fn()
  }))

  vi.mock('@/shared/theme/CanvasThemeContext', async importOriginal => ({
    ...(await importOriginal<typeof import('@/shared/theme/CanvasThemeContext')>()),
    useCanvasTheme: vi.fn().mockReturnValue({
      primary: 'var(--color-primary)',
      primaryLight: 'var(--color-primary-light)',
      primaryDark: 'var(--color-primary-dark)',
      secondary: 'var(--color-secondary)',
      secondaryLight: 'var(--color-secondary-light)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      danger: 'var(--color-danger)',
      info: 'var(--color-info)',
      text: 'var(--color-text)',
      textSecondary: 'var(--color-text-secondary)',
      textTertiary: 'var(--color-text-tertiary)',
      gridVertical: 'var(--color-grid-vertical)',
      gridHorizontal: 'var(--color-grid-horizontal)',
      grid: 'var(--color-grid)',
      bgSubtle: 'var(--color-bg-subtle)',
      bgCanvas: 'var(--color-bg-canvas)',
      white: 'white',
      black: 'black',
      primaryLightOutline: 'var(--color-primary-dark)'
    })
  }))
})

const propsAttrs = (props: any): Record<string, any> => {
  return Object.entries(props).reduce<Record<string, any>>((acc, [key, value]) => {
    if (typeof value === 'function') return acc

    // Handle special attributes
    if (key === 'listening') {
      acc[key] = String(value)
      return acc
    }

    // Convert camelCase to kebab-case for data attributes
    const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    acc[`data-${kebabKey}`] = typeof value === 'object' ? JSON.stringify(value) : value
    return acc
  }, {})
}

// Mock React-Konva components with test-friendly implementations
vi.mock('react-konva/lib/ReactKonvaCore', async () => {
  const React = await import('react')
  return {
    Stage: ({ children, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'konva-stage', ...propsAttrs(props) }, children),
    Layer: ({ children, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'konva-layer', ...propsAttrs(props) }, children),
    Line: ({ ...props }: any) =>
      React.createElement('div', {
        'data-testid': 'konva-line',
        ...propsAttrs(props)
      }),
    Group: ({ children, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'konva-group', ...propsAttrs(props) }, children),
    Arrow: ({ ...props }: any) =>
      React.createElement('div', {
        'data-testid': 'konva-arrow',
        ...propsAttrs(props)
      }),
    Circle: ({ ...props }: any) => React.createElement('div', { 'data-testid': 'konva-circle', ...propsAttrs(props) }),
    Rect: ({ ...props }: any) => React.createElement('rect', { 'data-testid': 'konva-rect', ...propsAttrs(props) }),
    Text: ({ text, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'konva-text', ...propsAttrs(props) }, text)
  }
})

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
