import { afterEach, vi, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import 'vitest-canvas-mock'

// Mock canvas before any imports
beforeAll(() => {
  // Mock the problematic canvas module completely
  vi.mock('canvas', () => ({
    default: {},
    Canvas: function MockCanvas () {
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

const propsAttrs = (props: any) => {
  return Object.entries(props).reduce((acc, [key, value]) => {
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
  }, {} as Record<string, any>)
}

// Mock React-Konva components with test-friendly implementations
vi.mock('react-konva', async () => {
  const React = await import('react')
  return {
    Stage: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'stage', ...propsAttrs(props) }, children),
    Layer: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'layer', ...propsAttrs(props) }, children),
    Line: ({ points, ...props }: any) => React.createElement('div', {
      'data-testid': 'wall-line',
      ...propsAttrs(props)
    }),
    Group: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'group', ...propsAttrs(props) }, children),
    Arrow: ({ points, ...props }: any) => React.createElement('div', {
      'data-testid': 'direction-arrow',
      ...propsAttrs(props)
    }),
    Circle: ({ ...props }: any) => React.createElement('div', { 'data-testid': 'circle', ...propsAttrs(props) }),
    Text: ({ text, ...props }: any) => React.createElement('div', { 'data-testid': 'text', ...propsAttrs(props) }, text)
  }
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})
