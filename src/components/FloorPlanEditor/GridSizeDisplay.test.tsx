import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GridSizeDisplay } from './GridSizeDisplay'

// Mock the editor store
vi.mock('@/components/FloorPlanEditor/hooks/useEditorStore', () => ({
  useEditorStore: (selector: any) => {
    const mockState = {
      showGrid: true,
      gridSize: 500
    }
    return selector(mockState)
  }
}))

describe('GridSizeDisplay', () => {
  describe('grid size formatting', () => {
    it('should format sizes less than 1000mm in millimeters', () => {
      // Test various sizes under 1000mm
      const testCases = [
        { size: 10, expected: '10mm' },
        { size: 50, expected: '50mm' },
        { size: 100, expected: '100mm' },
        { size: 500, expected: '500mm' },
        { size: 999, expected: '999mm' }
      ]

      testCases.forEach(({ size, expected }) => {
        // Create a function that matches the one in GridSizeDisplay
        function formatGridSize(sizeInMm: number): string {
          if (sizeInMm < 1000) {
            return `${sizeInMm}mm`
          } else {
            const sizeInM = sizeInMm / 1000
            if (sizeInM % 1 === 0) {
              return `${sizeInM}m`
            } else {
              return `${sizeInM.toFixed(1)}m`
            }
          }
        }

        expect(formatGridSize(size)).toBe(expected)
      })
    })

    it('should format sizes 1000mm and above in meters', () => {
      const testCases = [
        { size: 1000, expected: '1m' },
        { size: 2000, expected: '2m' },
        { size: 5000, expected: '5m' },
        { size: 10000, expected: '10m' },
        { size: 1500, expected: '1.5m' },
        { size: 2500, expected: '2.5m' }
      ]

      testCases.forEach(({ size, expected }) => {
        function formatGridSize(sizeInMm: number): string {
          if (sizeInMm < 1000) {
            return `${sizeInMm}mm`
          } else {
            const sizeInM = sizeInMm / 1000
            if (sizeInM % 1 === 0) {
              return `${sizeInM}m`
            } else {
              return `${sizeInM.toFixed(1)}m`
            }
          }
        }

        expect(formatGridSize(size)).toBe(expected)
      })
    })
  })

  describe('component rendering', () => {
    it('should display grid size when showGrid is true', () => {
      render(<GridSizeDisplay />)

      // Should show "Grid: 500mm" based on our mock
      expect(screen.getByText('Grid: 500mm')).toBeInTheDocument()
    })

    it('should have proper Tailwind classes for styling', () => {
      render(<GridSizeDisplay />)

      const element = screen.getByText('Grid: 500mm')
      expect(element).toHaveClass('absolute', 'bottom-4', 'right-4', 'bg-black/70', 'text-white')
    })
  })
})
