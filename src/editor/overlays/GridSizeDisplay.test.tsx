import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GridSizeDisplay } from './GridSizeDisplay'

// Mock the formatLength utility
vi.mock('@/shared/utils/formatLength', () => ({
  formatLength: vi.fn((length: number) => `${length}mm`) // Mock to return simple format for tests
}))

// Mock the editor store
vi.mock('@/editor/hooks/useEditorStore', () => ({
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

      // Should show "500mm" based on our mock
      expect(screen.getByText('500mm')).toBeInTheDocument()
    })
  })
})
