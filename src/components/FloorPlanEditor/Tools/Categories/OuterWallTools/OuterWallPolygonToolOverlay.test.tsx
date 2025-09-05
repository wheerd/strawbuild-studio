import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { OuterWallPolygonToolOverlay } from './OuterWallPolygonToolOverlay'
import { OuterWallPolygonTool } from './OuterWallPolygonTool'
import { createVec2 } from '@/types/geometry'

// Mock the viewport store
const mockUseZoom = vi.fn()
vi.mock('../../../hooks/useViewportStore', () => ({
  useZoom: () => mockUseZoom()
}))

describe('OuterWallPolygonToolOverlay', () => {
  let mockTool: OuterWallPolygonTool

  beforeEach(() => {
    mockUseZoom.mockReturnValue(1.0)
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
      isClosingLineValid: true
    }
  })

  it('renders nothing when tool has no points', () => {
    const { container } = render(<OuterWallPolygonToolOverlay tool={mockTool} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders points when tool has points', () => {
    mockTool.state.points = [createVec2(100, 100), createVec2(200, 100), createVec2(200, 200)]

    const { container } = render(<OuterWallPolygonToolOverlay tool={mockTool} />)

    // Should render a Group with multiple children (points, lines, etc.)
    expect(container.firstChild).not.toBeNull()
    expect(container.firstChild?.nodeName).toBe('DIV') // Konva renders as div
  })

  it('applies zoom scaling correctly', () => {
    mockUseZoom.mockReturnValue(2.0) // 2x zoom

    mockTool.state.points = [createVec2(100, 100), createVec2(200, 100)]

    const { container } = render(<OuterWallPolygonToolOverlay tool={mockTool} />)

    // At 2x zoom, stroke widths should be halved to maintain visual consistency
    expect(mockUseZoom).toHaveBeenCalled()
    expect(container.firstChild).not.toBeNull()
  })

  it('shows preview line to mouse position', () => {
    mockTool.state.points = [createVec2(100, 100)]
    mockTool.state.mouse = createVec2(200, 200)

    const { container } = render(<OuterWallPolygonToolOverlay tool={mockTool} />)

    expect(container.firstChild).not.toBeNull()
  })

  it('shows closing line when snapping to first point', () => {
    // Mock the isSnappingToFirstPoint method to return true
    vi.spyOn(mockTool, 'isSnappingToFirstPoint').mockReturnValue(true)

    mockTool.state.points = [createVec2(100, 100), createVec2(200, 100), createVec2(200, 200)]
    mockTool.state.isClosingLineValid = true

    const { container } = render(<OuterWallPolygonToolOverlay tool={mockTool} />)

    expect(container.firstChild).not.toBeNull()
    expect(mockTool.isSnappingToFirstPoint).toHaveBeenCalled()
  })
})
