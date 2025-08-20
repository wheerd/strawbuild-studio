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

// Mock React-Konva components to return simple mock functions
vi.mock('react-konva', () => ({
  Stage: vi.fn(({ children }) => children),
  Layer: vi.fn(({ children }) => children),
  Line: vi.fn(() => null),
  Circle: vi.fn(() => null),
  Text: vi.fn(() => null)
}))

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
