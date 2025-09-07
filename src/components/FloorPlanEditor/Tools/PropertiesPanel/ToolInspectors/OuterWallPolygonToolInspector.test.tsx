import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { OuterWallPolygonToolInspector } from './OuterWallPolygonToolInspector'
import { OuterWallPolygonTool } from '@/components/FloorPlanEditor/Tools/Categories/OuterWallTools/OuterWallPolygonTool'
import { createVec2, createLength } from '@/types/geometry'

// Mock scrollIntoView for Radix UI components
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true
})

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

      expect(screen.getByText('Construction Type')).toBeInTheDocument()
      expect(screen.getByLabelText('Wall Thickness')).toBeInTheDocument()
      expect(screen.getByText('CUT')).toBeInTheDocument()
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
    it('calls setConstructionType when selection changes', async () => {
      render(<OuterWallPolygonToolInspector tool={mockTool} />)

      // Find the select trigger button (Radix Select uses a button as trigger)
      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)

      // Wait for the dropdown to appear and find the option
      const infillOption = await screen.findByText('Infill')
      fireEvent.click(infillOption)

      expect(mockSetConstructionType).toHaveBeenCalledWith('infill')
    })
  })

  describe('wall thickness changes', () => {
    it('calls setWallThickness when input changes', () => {
      render(<OuterWallPolygonToolInspector tool={mockTool} />)

      const input = screen.getByLabelText('Wall Thickness')
      fireEvent.change(input, { target: { value: '350' } })
      fireEvent.blur(input)

      expect(mockSetWallThickness).toHaveBeenCalledWith(createLength(350))
    })

    it('handles input validation with min/max values', () => {
      render(<OuterWallPolygonToolInspector tool={mockTool} />)

      const input = screen.getByLabelText('Wall Thickness')

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

      expect(screen.getByText('Construction Type')).toBeInTheDocument()
      expect(screen.getByLabelText('Wall Thickness')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('has proper input attributes', () => {
      render(<OuterWallPolygonToolInspector tool={mockTool} />)

      const thicknessInput = screen.getByLabelText('Wall Thickness')
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
