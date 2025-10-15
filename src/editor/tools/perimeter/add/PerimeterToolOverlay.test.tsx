import { render } from '@testing-library/react'
import { vec2 } from 'gl-matrix'
import { vi } from 'vitest'

import { createWallAssemblyId } from '@/building/model/ids'
import type { SnapResult } from '@/editor/services/snapping/types'

import { PerimeterTool } from './PerimeterTool'
import { PerimeterToolOverlay } from './PerimeterToolOverlay'

// Mock the viewport store
const mockUseZoom = vi.fn()
const mockUseStageWidth = vi.fn()
const mockUseStageHeight = vi.fn()

vi.mock('@/editor/hooks/useViewportStore', () => ({
  useZoom: () => mockUseZoom(),
  useStageWidth: () => mockUseStageWidth(),
  useStageHeight: () => mockUseStageHeight()
}))

describe('PerimeterToolOverlay', () => {
  let mockTool: PerimeterTool

  beforeEach(() => {
    mockUseZoom.mockReturnValue(1.0)
    mockUseStageWidth.mockReturnValue(800)
    mockUseStageHeight.mockReturnValue(600)

    mockTool = new PerimeterTool()

    // Reset tool state
    mockTool.state = {
      points: [],
      pointer: vec2.fromValues(0, 0),
      snapContext: {
        snapPoints: [],
        alignPoints: [],
        referenceLineWalls: []
      },
      isCurrentLineValid: true,
      isClosingLineValid: true,
      wallAssemblyId: createWallAssemblyId(),
      wallThickness: 440,
      lengthOverride: null
    }

    // Mock the getPreviewPosition method to return pointer position by default
    mockTool.getPreviewPosition = vi.fn().mockImplementation(() => mockTool.state.pointer)
  })

  describe('rendering with no points', () => {
    it('renders only snap point when no polygon points exist', () => {
      mockTool.state.pointer = vec2.fromValues(100, 200)

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })

  describe('rendering with single point', () => {
    it('renders first point and snap point', () => {
      mockTool.state.points = [vec2.fromValues(100, 100)]
      mockTool.state.pointer = vec2.fromValues(200, 200)

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('renders line to pointer position with valid styling', () => {
      mockTool.state.points = [vec2.fromValues(50, 50)]
      mockTool.state.pointer = vec2.fromValues(150, 150)
      mockTool.state.isCurrentLineValid = true

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('renders line to pointer position with invalid styling', () => {
      mockTool.state.points = [vec2.fromValues(50, 50)]
      mockTool.state.pointer = vec2.fromValues(150, 150)
      mockTool.state.isCurrentLineValid = false

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })

  describe('rendering with multiple points', () => {
    it('renders polygon with connected lines and points', () => {
      mockTool.state.points = [vec2.fromValues(100, 100), vec2.fromValues(200, 100), vec2.fromValues(200, 200)]
      mockTool.state.pointer = vec2.fromValues(100, 200)

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('differentiates first point styling from other points', () => {
      mockTool.state.points = [
        vec2.fromValues(0, 0),
        vec2.fromValues(100, 0),
        vec2.fromValues(100, 100),
        vec2.fromValues(0, 100)
      ]
      mockTool.state.pointer = vec2.fromValues(50, 50)

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })

  describe('closing polygon behavior', () => {
    beforeEach(() => {
      mockTool.state.points = [vec2.fromValues(100, 100), vec2.fromValues(200, 100), vec2.fromValues(200, 200)]
    })

    it('renders closing line when snapping to first point with valid closure', () => {
      vi.spyOn(mockTool, 'isSnappingToFirstPoint').mockReturnValue(true)
      mockTool.state.isClosingLineValid = true

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('renders closing line when snapping to first point with invalid closure', () => {
      vi.spyOn(mockTool, 'isSnappingToFirstPoint').mockReturnValue(true)
      mockTool.state.isClosingLineValid = false

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('does not render closing line when not snapping to first point', () => {
      vi.spyOn(mockTool, 'isSnappingToFirstPoint').mockReturnValue(false)
      mockTool.state.pointer = vec2.fromValues(300, 300)

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })

  describe('snapping behavior', () => {
    it('renders snap position when snap result exists', () => {
      const snapResult: SnapResult = {
        position: vec2.fromValues(125, 125)
      }

      mockTool.state.points = [vec2.fromValues(100, 100)]
      mockTool.state.pointer = vec2.fromValues(120, 120)
      mockTool.state.snapResult = snapResult

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('renders snap lines when snap result has lines', () => {
      const snapResult: SnapResult = {
        position: vec2.fromValues(150, 150),
        lines: [
          {
            point: vec2.fromValues(100, 100),
            direction: vec2.fromValues(1, 0)
          },
          {
            point: vec2.fromValues(200, 200),
            direction: vec2.fromValues(0, 1)
          }
        ]
      }

      mockTool.state.points = [vec2.fromValues(50, 50)]
      mockTool.state.pointer = vec2.fromValues(145, 145)
      mockTool.state.snapResult = snapResult

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('renders snap lines when snap result has lines', () => {
      const snapResult: SnapResult = {
        position: vec2.fromValues(150, 150),
        lines: [
          {
            point: vec2.fromValues(100, 100),
            direction: vec2.fromValues(1, 0)
          },
          {
            point: vec2.fromValues(200, 200),
            direction: vec2.fromValues(0, 1)
          }
        ]
      }

      mockTool.state.points = [vec2.fromValues(50, 50)]
      mockTool.state.pointer = vec2.fromValues(145, 145)
      mockTool.state.snapResult = snapResult

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })

  describe('zoom responsiveness', () => {
    it('scales elements appropriately at high zoom', () => {
      mockUseZoom.mockReturnValue(4.0)

      mockTool.state.points = [vec2.fromValues(100, 100), vec2.fromValues(200, 100)]
      mockTool.state.pointer = vec2.fromValues(200, 200)

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('scales elements appropriately at low zoom', () => {
      mockUseZoom.mockReturnValue(0.25)

      mockTool.state.points = [vec2.fromValues(100, 100), vec2.fromValues(200, 100)]
      mockTool.state.pointer = vec2.fromValues(200, 200)

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('adjusts line extension based on stage dimensions', () => {
      mockUseStageWidth.mockReturnValue(1600)
      mockUseStageHeight.mockReturnValue(1200)
      mockUseZoom.mockReturnValue(2.0)

      const snapResult: SnapResult = {
        position: vec2.fromValues(100, 100),
        lines: [
          {
            point: vec2.fromValues(100, 100),
            direction: vec2.fromValues(1, 0)
          }
        ]
      }

      mockTool.state.snapResult = snapResult

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })

  describe('edge cases', () => {
    it('handles empty points array gracefully', () => {
      mockTool.state.points = []
      mockTool.state.pointer = vec2.fromValues(0, 0)

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('handles exactly two points (minimum for line rendering)', () => {
      mockTool.state.points = [vec2.fromValues(0, 0), vec2.fromValues(100, 100)]
      mockTool.state.pointer = vec2.fromValues(200, 0)

      const { container } = render(<PerimeterToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })
})
