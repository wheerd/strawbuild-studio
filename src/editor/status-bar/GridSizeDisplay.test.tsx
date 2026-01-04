import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GridSizeDisplay } from './GridSizeDisplay'

// Mock the i18n formatters hook
vi.mock('@/shared/i18n/useFormatters', () => ({
  useFormatters: () => ({
    formatLength: (length: number) => `${length}mm` // Mock to return simple format for tests
  })
}))

// Mock the grid hooks
vi.mock('@/editor/hooks/useGrid', () => ({
  useShowGrid: () => true,
  useGridSize: () => 500,
  useGridActions: () => ({
    setShowGrid: vi.fn(),
    setGridSize: vi.fn()
  })
}))

describe('GridSizeDisplay', () => {
  describe('component rendering', () => {
    it('should display grid size when showGrid is true', () => {
      render(<GridSizeDisplay />)

      // Should show "500mm" based on our mock
      expect(screen.getByText('500mm')).toBeInTheDocument()
    })
  })
})
