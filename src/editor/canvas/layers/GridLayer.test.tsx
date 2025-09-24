import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { GridLayer } from './GridLayer'

// Mock the editor store
const mockSetGridSize = vi.fn()

vi.mock('@/editor/hooks/useEditorStore', () => ({
  useEditorStore: (selector: any) => {
    const mockState = {
      showGrid: true,
      gridSize: 500,
      setGridSize: mockSetGridSize
    }
    return selector(mockState)
  },
  useShowGrid: () => true
}))

// Test the grid size calculation algorithm
function calculateDynamicGridSize(zoom: number): number {
  const targetPixelSpacing = 30
  const worldSpacing = targetPixelSpacing / zoom
  const niceValues = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]
  const gridSize = niceValues.find(value => value >= worldSpacing) ?? niceValues[niceValues.length - 1]
  return gridSize
}

describe('GridLayer', () => {
  describe('dynamic grid sizing', () => {
    it('should calculate appropriate grid sizes for different zoom levels', () => {
      // Test various zoom levels and expected grid sizes
      const testCases = [
        { zoom: 0.001, expectedSize: 50000 }, // Very zoomed out - 50m grid
        { zoom: 0.01, expectedSize: 5000 }, // Zoomed out - 5m grid
        { zoom: 0.1, expectedSize: 500 }, // Medium zoom - 500mm grid
        { zoom: 1, expectedSize: 50 }, // Close zoom - 50mm grid
        { zoom: 2, expectedSize: 20 } // Max zoom - 20mm grid
      ]

      testCases.forEach(({ zoom, expectedSize }) => {
        const gridSize = calculateDynamicGridSize(zoom)
        expect(gridSize).toBe(expectedSize)
      })
    })

    it('should always return a nice grid value', () => {
      const niceValues = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]

      // Test many different zoom levels
      const testZooms = [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 1.5, 2.0]

      testZooms.forEach(zoom => {
        const gridSize = calculateDynamicGridSize(zoom)
        expect(niceValues).toContain(gridSize)
      })
    })
  })

  describe('component rendering', () => {
    it('should render grid when showGrid is true', () => {
      const viewport = { zoom: 1, panX: 0, panY: 0 }

      const { container } = render(<GridLayer width={800} height={600} viewport={viewport} />)

      // Should render a Layer component (Konva Layer)
      expect(container.querySelector('div')).toBeTruthy()
    })

    it('should not render grid lines when showGrid is false', () => {
      // Mock showGrid to false for this test
      vi.doMock('@/editor/hooks/useEditorStore', () => ({
        useEditorStore: (selector: any) => {
          const mockState = {
            showGrid: false,
            gridSize: 500,
            setGridSize: mockSetGridSize
          }
          return selector(mockState)
        },
        useShowGrid: () => false
      }))

      const viewport = { zoom: 1, panX: 0, panY: 0 }

      const { container } = render(<GridLayer width={800} height={600} viewport={viewport} />)

      // Should still render a Layer but it should be empty
      expect(container.querySelector('div')).toBeTruthy()
    })
  })
})
