import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GridSizeDisplay } from './GridSizeDisplay'

// Mock the formatLength utility
vi.mock('@/utils/formatLength', () => ({
  formatLength: vi.fn((length: number) => `${length}mm`) // Mock to return simple format for tests
}))

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
