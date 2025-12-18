import { render } from '@testing-library/react'
import { vi } from 'vitest'

import { createWallAssemblyId } from '@/building/model/ids'
import type { SnapResult } from '@/editor/services/snapping/types'
import { PerimeterTool } from '@/editor/tools/perimeter/add/PerimeterTool'
import { newVec2 } from '@/shared/geometry'

import { PolygonToolOverlay } from './PolygonToolOverlay'

// Mock the viewport store
const mockUseZoom = vi.fn()
const mockUseStageWidth = vi.fn()
const mockUseStageHeight = vi.fn()

vi.mock('@/editor/hooks/useViewportStore', () => ({
  useZoom: () => mockUseZoom(),
  useStageWidth: () => mockUseStageWidth(),
  useStageHeight: () => mockUseStageHeight()
}))

describe('PolygonToolOverlay', () => {
  let mockTool: PerimeterTool

  beforeEach(() => {
    mockUseZoom.mockReturnValue(1.0)
    mockUseStageWidth.mockReturnValue(800)
    mockUseStageHeight.mockReturnValue(600)

    mockTool = new PerimeterTool()

    // Reset tool state
    mockTool.state = {
      points: [],
      pointer: newVec2(0, 0),
      snapResult: undefined,
      snapContext: {
        snapPoints: [],
        alignPoints: [],
        referenceLineSegments: []
      },
      isCurrentSegmentValid: true,
      isClosingSegmentValid: true,
      wallAssemblyId: createWallAssemblyId(),
      wallThickness: 420,
      lengthOverride: null,
      baseRingBeamAssemblyId: undefined,
      topRingBeamAssemblyId: undefined,
      referenceSide: 'inside'
    }

    // Mock the getPreviewPosition method to return pointer position by default
    mockTool.getPreviewPosition = vi.fn().mockImplementation(() => mockTool.state.pointer)
  })

  describe('rendering with no points', () => {
    it('renders only snap point when no polygon points exist', () => {
      mockTool.state.pointer = newVec2(100, 200)

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })

  describe('rendering with single point', () => {
    it('renders first point and snap point', () => {
      mockTool.state.points = [newVec2(100, 100)]
      mockTool.state.pointer = newVec2(200, 200)

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('renders line to pointer position with valid styling', () => {
      mockTool.state.points = [newVec2(50, 50)]
      mockTool.state.pointer = newVec2(150, 150)
      mockTool.state.isCurrentSegmentValid = true

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('renders line to pointer position with invalid styling', () => {
      mockTool.state.points = [newVec2(50, 50)]
      mockTool.state.pointer = newVec2(150, 150)
      mockTool.state.isCurrentSegmentValid = false

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })

  describe('rendering with multiple points', () => {
    it('renders polygon with connected lines and points', () => {
      mockTool.state.points = [newVec2(100, 100), newVec2(200, 100), newVec2(200, 200)]
      mockTool.state.pointer = newVec2(100, 200)

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('differentiates first point styling from other points', () => {
      mockTool.state.points = [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100), newVec2(0, 100)]
      mockTool.state.pointer = newVec2(50, 50)

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })

  describe('closing polygon behavior', () => {
    beforeEach(() => {
      mockTool.state.points = [newVec2(100, 100), newVec2(200, 100), newVec2(200, 200)]
    })

    it('renders closing line when snapping to first point with valid closure', () => {
      vi.spyOn(mockTool, 'isSnappingToFirstPoint').mockReturnValue(true)
      mockTool.state.isClosingSegmentValid = true

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('renders closing line when snapping to first point with invalid closure', () => {
      vi.spyOn(mockTool, 'isSnappingToFirstPoint').mockReturnValue(true)
      mockTool.state.isClosingSegmentValid = false

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('does not render closing line when not snapping to first point', () => {
      vi.spyOn(mockTool, 'isSnappingToFirstPoint').mockReturnValue(false)
      mockTool.state.pointer = newVec2(300, 300)

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })

  describe('snapping behavior', () => {
    it('renders snap position when snap result exists', () => {
      const snapResult: SnapResult = {
        position: newVec2(125, 125)
      }

      mockTool.state.points = [newVec2(100, 100)]
      mockTool.state.pointer = newVec2(120, 120)
      mockTool.state.snapResult = snapResult

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('renders snap lines when snap result has lines', () => {
      const snapResult: SnapResult = {
        position: newVec2(150, 150),
        lines: [
          {
            point: newVec2(100, 100),
            direction: newVec2(1, 0)
          },
          {
            point: newVec2(200, 200),
            direction: newVec2(0, 1)
          }
        ]
      }

      mockTool.state.points = [newVec2(50, 50)]
      mockTool.state.pointer = newVec2(145, 145)
      mockTool.state.snapResult = snapResult

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('renders snap lines when snap result has lines', () => {
      const snapResult: SnapResult = {
        position: newVec2(150, 150),
        lines: [
          {
            point: newVec2(100, 100),
            direction: newVec2(1, 0)
          },
          {
            point: newVec2(200, 200),
            direction: newVec2(0, 1)
          }
        ]
      }

      mockTool.state.points = [newVec2(50, 50)]
      mockTool.state.pointer = newVec2(145, 145)
      mockTool.state.snapResult = snapResult

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })

  describe('zoom responsiveness', () => {
    it('scales elements appropriately at high zoom', () => {
      mockUseZoom.mockReturnValue(4.0)

      mockTool.state.points = [newVec2(100, 100), newVec2(200, 100)]
      mockTool.state.pointer = newVec2(200, 200)

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('scales elements appropriately at low zoom', () => {
      mockUseZoom.mockReturnValue(0.25)

      mockTool.state.points = [newVec2(100, 100), newVec2(200, 100)]
      mockTool.state.pointer = newVec2(200, 200)

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('adjusts line extension based on stage dimensions', () => {
      mockUseStageWidth.mockReturnValue(1600)
      mockUseStageHeight.mockReturnValue(1200)
      mockUseZoom.mockReturnValue(2.0)

      const snapResult: SnapResult = {
        position: newVec2(100, 100),
        lines: [
          {
            point: newVec2(100, 100),
            direction: newVec2(1, 0)
          }
        ]
      }

      mockTool.state.snapResult = snapResult

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })

  describe('edge cases', () => {
    it('handles empty points array gracefully', () => {
      mockTool.state.points = []
      mockTool.state.pointer = newVec2(0, 0)

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })

    it('handles exactly two points (minimum for line rendering)', () => {
      mockTool.state.points = [newVec2(0, 0), newVec2(100, 100)]
      mockTool.state.pointer = newVec2(200, 0)

      const { container } = render(<PolygonToolOverlay tool={mockTool} />)

      expect(container).toMatchSnapshot()
    })
  })
})
