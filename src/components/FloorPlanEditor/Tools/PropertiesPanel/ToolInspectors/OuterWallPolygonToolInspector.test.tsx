import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { OuterWallPolygonToolInspector } from './OuterWallPolygonToolInspector'
import { OuterWallPolygonTool } from '../../Categories/OuterWallTools/OuterWallPolygonTool'
import { createVec2, createLength } from '@/types/geometry'

describe('OuterWallPolygonToolInspector', () => {
  let mockTool: OuterWallPolygonTool
  let mockOnRenderNeeded: ReturnType<typeof vi.fn>
  let mockSetConstructionType: ReturnType<typeof vi.fn>
  let mockSetWallThickness: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnRenderNeeded = vi.fn()
    mockSetConstructionType = vi.fn()
    mockSetWallThickness = vi.fn()

    mockTool = new OuterWallPolygonTool()

    // Reset tool state
    mockTool.state = {
      points: [],
      mouse: createVec2(0, 0),
      snapContext: {
        snapPoints: [],
        alignPoints: [],
        referenceLineSegments: []
      },
      isCurrentLineValid: true,
      isClosingLineValid: true,
      constructionType: 'cells-under-tension',
      wallThickness: createLength(440)
    }

    // Mock methods
    mockTool.onRenderNeeded = mockOnRenderNeeded.mockReturnValue(vi.fn())
    mockTool.setConstructionType = mockSetConstructionType
    mockTool.setWallThickness = mockSetWallThickness
  })

  describe('rendering', () => {
    it('renders basic inspector with default values', () => {
      render(<OuterWallPolygonToolInspector tool={mockTool} />)

      expect(screen.getByText('Outer Wall Polygon Tool')).toBeInTheDocument()
      expect(screen.getByLabelText('Construction Type')).toBeInTheDocument()
      expect(screen.getByLabelText('Wall Thickness (mm)')).toBeInTheDocument()
      expect(screen.getByDisplayValue('CUT')).toBeInTheDocument()
      expect(screen.getByDisplayValue('440')).toBeInTheDocument()
    })

    it('renders keyboard shortcuts', () => {
      render(<OuterWallPolygonToolInspector tool={mockTool} />)

      expect(screen.getByText('Enter')).toBeInTheDocument()
      expect(screen.getByText('Complete polygon')).toBeInTheDocument()
      expect(screen.getByText('Escape')).toBeInTheDocument()
      expect(screen.getByText('Cancel polygon')).toBeInTheDocument()
    })
  })

  describe('construction type changes', () => {
    it('calls setConstructionType when selection changes', () => {
      render(<OuterWallPolygonToolInspector tool={mockTool} />)

      const select = screen.getByLabelText('Construction Type')
      fireEvent.change(select, { target: { value: 'infill' } })

      expect(mockSetConstructionType).toHaveBeenCalledWith('infill')
    })
  })

  describe('wall thickness changes', () => {
    it('calls setWallThickness when input changes', () => {
      render(<OuterWallPolygonToolInspector tool={mockTool} />)

      const input = screen.getByLabelText('Wall Thickness (mm)')
      fireEvent.change(input, { target: { value: '350' } })
      fireEvent.blur(input)

      expect(mockSetWallThickness).toHaveBeenCalledWith(createLength(350))
    })

    it('handles input validation with min/max values', () => {
      render(<OuterWallPolygonToolInspector tool={mockTool} />)

      const input = screen.getByLabelText('Wall Thickness (mm)')

      // Test that input has proper constraints
      expect(input).toHaveAttribute('min', '50')
      expect(input).toHaveAttribute('max', '1000')
      expect(input).toHaveAttribute('step', '10')

      // Test changing value within range
      fireEvent.change(input, { target: { value: '350' } })
      fireEvent.blur(input)

      expect(mockSetWallThickness).toHaveBeenCalledWith(createLength(350))
    })
  })

  describe('accessibility', () => {
    it('has proper form labels', () => {
      render(<OuterWallPolygonToolInspector tool={mockTool} />)

      expect(screen.getByLabelText('Construction Type')).toBeInTheDocument()
      expect(screen.getByLabelText('Wall Thickness (mm)')).toBeInTheDocument()
    })

    it('has proper input attributes', () => {
      render(<OuterWallPolygonToolInspector tool={mockTool} />)

      const thicknessInput = screen.getByLabelText('Wall Thickness (mm)')
      expect(thicknessInput).toHaveAttribute('type', 'number')
      expect(thicknessInput).toHaveAttribute('min', '50')
      expect(thicknessInput).toHaveAttribute('max', '1000')
      expect(thicknessInput).toHaveAttribute('step', '10')
    })
  })

  describe('component lifecycle', () => {
    it('subscribes to tool render updates on mount', () => {
      render(<OuterWallPolygonToolInspector tool={mockTool} />)

      expect(mockOnRenderNeeded).toHaveBeenCalledWith(expect.any(Function))
    })

    it('unsubscribes from tool render updates on unmount', () => {
      const unsubscribe = vi.fn()
      mockOnRenderNeeded.mockReturnValue(unsubscribe)

      const { unmount } = render(<OuterWallPolygonToolInspector tool={mockTool} />)
      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })
  })
})
