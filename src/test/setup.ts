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

// Mock React-Konva components with test-friendly implementations
vi.mock('react-konva', () => {
  const React = require('react')
  return {
    Stage: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'stage', ...props }, children),
    Layer: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'layer', ...props }, children),
    Line: ({ points, ...props }: any) => React.createElement('div', { 
      'data-testid': 'wall-line',
      'data-points': JSON.stringify(points),
      ...props
    }),
    Group: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'group', ...props }, children),
    Arrow: ({ points, ...props }: any) => React.createElement('div', { 
      'data-testid': 'direction-arrow',
      'data-points': JSON.stringify(points),
      ...props
    }),
    Circle: ({ ...props }: any) => React.createElement('div', { 'data-testid': 'circle', ...props }),
    Text: ({ text, ...props }: any) => React.createElement('div', { 'data-testid': 'text', ...props }, text)
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
