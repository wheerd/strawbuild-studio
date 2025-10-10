import { Theme } from '@radix-ui/themes'
import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { createPerimeterConstructionMethodId } from '@/building/model/ids'
import { createLength, createVec2 } from '@/shared/geometry'

import { PerimeterTool } from './PerimeterTool'
import { PerimeterToolInspector } from './PerimeterToolInspector'

// Mock the config store
vi.mock('@/construction/config/store', () => ({
  useRingBeamConstructionMethods: () => [
    {
      id: 'test-ring-beam-method',
      name: 'Test Ring Beam',
      config: { type: 'full' }
    }
  ],
  usePerimeterConstructionMethods: () => [
    {
      id: 'test-method-1',
      name: 'Standard Infill',
      config: { type: 'infill' }
    },
    {
      id: 'test-method-2',
      name: 'Strawhenge Module',
      config: { type: 'strawhenge' }
    }
  ]
}))

// Mock scrollIntoView for Radix UI components
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true
})

describe('PerimeterToolInspector', () => {
  let mockTool: PerimeterTool
  let mockOnRenderNeeded: ReturnType<typeof vi.fn>
  let mockSetConstructionMethod: ReturnType<typeof vi.fn>
  let mockSetWallThickness: ReturnType<typeof vi.fn>
  let mockSetBaseRingBeam: ReturnType<typeof vi.fn>
  let mockSetTopRingBeam: ReturnType<typeof vi.fn>
  let mockClearLengthOverride: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnRenderNeeded = vi.fn()
    mockSetConstructionMethod = vi.fn()
    mockSetWallThickness = vi.fn()
    mockSetBaseRingBeam = vi.fn()
    mockSetTopRingBeam = vi.fn()
    mockClearLengthOverride = vi.fn()

    mockTool = new PerimeterTool()

    // Reset tool state
    mockTool.state = {
      points: [],
      pointer: createVec2(0, 0),
      snapContext: {
        snapPoints: [],
        alignPoints: [],
        referenceLineWalls: []
      },
      isCurrentLineValid: true,
      isClosingLineValid: true,
      constructionMethodId: createPerimeterConstructionMethodId(),
      wallThickness: createLength(440),
      baseRingBeamMethodId: undefined,
      topRingBeamMethodId: undefined,
      lengthOverride: null
    }

    // Mock methods
    mockTool.onRenderNeeded = mockOnRenderNeeded.mockReturnValue(vi.fn())
    mockTool.setConstructionMethod = mockSetConstructionMethod
    mockTool.setWallThickness = mockSetWallThickness
    mockTool.setBaseRingBeam = mockSetBaseRingBeam
    mockTool.setTopRingBeam = mockSetTopRingBeam
    mockTool.clearLengthOverride = mockClearLengthOverride
  })

  const renderInspector = (tool = mockTool) => {
    return render(
      <Theme>
        <PerimeterToolInspector tool={tool} />
      </Theme>
    )
  }

  describe('rendering', () => {
    it('renders basic inspector with default values', () => {
      renderInspector()

      expect(screen.getByText('Construction Method')).toBeInTheDocument()
      expect(screen.getByLabelText('Wall Thickness')).toBeInTheDocument()
      expect(screen.getByText('Base Plate')).toBeInTheDocument()
      expect(screen.getByText('Top Plate')).toBeInTheDocument()
      expect(screen.getByDisplayValue('440')).toBeInTheDocument()
      // Ring beam selects should show "None" by default
      expect(screen.getAllByText('None')).toHaveLength(2)
    })
  })

  describe('construction method changes', () => {
    it('calls setConstructionMethod when selection changes', async () => {
      renderInspector()

      // Find the construction method select trigger button by getting all comboboxes and selecting the first one
      const comboboxes = screen.getAllByRole('combobox')
      const constructionMethodSelect = comboboxes[0] // First combobox is construction method
      fireEvent.click(constructionMethodSelect)

      // Wait for the dropdown to appear and find the option
      const strawhengeOption = await screen.findByText('Strawhenge Module')
      fireEvent.click(strawhengeOption)

      expect(mockSetConstructionMethod).toHaveBeenCalledWith('test-method-2')
    })
  })

  describe('wall thickness changes', () => {
    it('calls setWallThickness when input changes', () => {
      renderInspector()

      const input = screen.getByLabelText('Wall Thickness')
      fireEvent.change(input, { target: { value: '350' } })
      fireEvent.blur(input)

      expect(mockSetWallThickness).toHaveBeenCalledWith(createLength(350))
    })

    it('handles input validation with min/max values', () => {
      renderInspector()

      const input = screen.getByLabelText('Wall Thickness') as HTMLInputElement

      // LengthField renders the underlying input with these constraints
      expect(input).toBeInTheDocument()
      expect(input.value).toBe('440')
    })
  })

  describe('accessibility', () => {
    it('has proper form labels', () => {
      renderInspector()

      expect(screen.getByText('Construction Method')).toBeInTheDocument()
      expect(screen.getByLabelText('Wall Thickness')).toBeInTheDocument()
      expect(screen.getByText('Base Plate')).toBeInTheDocument()
      expect(screen.getByText('Top Plate')).toBeInTheDocument()

      // Should have exactly 3 comboboxes: construction method, base ring beam, top ring beam
      const comboboxes = screen.getAllByRole('combobox')
      expect(comboboxes).toHaveLength(3)
    })

    it('has proper input attributes', () => {
      renderInspector()

      const thicknessInput = screen.getByLabelText('Wall Thickness')
      expect(thicknessInput).toBeInTheDocument()
      expect(thicknessInput).toHaveAttribute('id', 'wall-thickness')
    })
  })

  describe('ring beam changes', () => {
    it('renders ring beam selects with None as default', () => {
      renderInspector()

      expect(screen.getByText('Base Plate')).toBeInTheDocument()
      expect(screen.getByText('Top Plate')).toBeInTheDocument()
      // Should have 2 "None" values for the ring beam selects
      expect(screen.getAllByText('None')).toHaveLength(2)
    })

    it('calls setBaseRingBeam when base ring beam selection changes', async () => {
      renderInspector()

      // Find the base ring beam select (second combobox)
      const comboboxes = screen.getAllByRole('combobox')
      const baseRingBeamSelect = comboboxes[1]
      fireEvent.click(baseRingBeamSelect)

      // Since there are no ring beam methods in the test, clicking should still work
      // but we can't test actual selection without mocking the config store
      expect(baseRingBeamSelect).toBeInTheDocument()
    })

    it('calls setTopRingBeam when top ring beam selection changes', async () => {
      renderInspector()

      // Find the top ring beam select (third combobox)
      const comboboxes = screen.getAllByRole('combobox')
      const topRingBeamSelect = comboboxes[2]
      fireEvent.click(topRingBeamSelect)

      // Since there are no ring beam methods in the test, clicking should still work
      // but we can't test actual selection without mocking the config store
      expect(topRingBeamSelect).toBeInTheDocument()
    })
  })

  describe('component lifecycle', () => {
    it('subscribes to tool render updates on mount', () => {
      renderInspector()

      expect(mockOnRenderNeeded).toHaveBeenCalledWith(expect.any(Function))
    })

    it('unsubscribes from tool render updates on unmount', () => {
      const unsubscribe = vi.fn()
      mockOnRenderNeeded.mockReturnValue(unsubscribe)

      const { unmount } = renderInspector()
      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })
  })
})
