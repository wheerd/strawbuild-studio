import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'
import 'vitest-canvas-mock'

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
    Line: ({ points, ...props }: any) =>
      React.createElement('div', {
        'data-testid': 'konva-line',
        ...propsAttrs(props)
      }),
    Group: ({ children, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'konva-group', ...propsAttrs(props) }, children),
    Arrow: ({ points, ...props }: any) =>
      React.createElement('div', {
        'data-testid': 'konva-arrow',
        ...propsAttrs(props)
      }),
    Circle: ({ ...props }: any) => React.createElement('div', { 'data-testid': 'konva-circle', ...propsAttrs(props) }),
    Text: ({ text, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'konva-text', ...propsAttrs(props) }, text)
  }
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

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

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})
