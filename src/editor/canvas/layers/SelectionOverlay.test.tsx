import { render } from '@testing-library/react'
import { vec2 } from 'gl-matrix'
import { vi } from 'vitest'

import type { Perimeter } from '@/building/model/model'
import { useFloorAreaById, useFloorOpeningById, usePerimeterById } from '@/building/store'
import '@/shared/geometry'

import { SelectionOverlay } from './SelectionOverlay'

// Mock the required hooks and stores
const mockUseSelectionPath = vi.fn()
const mockUseCurrentSelection = vi.fn()

vi.mock('@/editor/hooks/useSelectionStore', () => ({
  useSelectionPath: () => mockUseSelectionPath(),
  useCurrentSelection: () => mockUseCurrentSelection()
}))

vi.mock('@/building/store', () => ({
  usePerimeterById: vi.fn(),
  useFloorAreaById: vi.fn(),
  useFloorOpeningById: vi.fn()
}))

const mockUsePerimeterById = vi.mocked(usePerimeterById)
const mockUseFloorAreaById = vi.mocked(useFloorAreaById)
const mockUseFloorOpeningById = vi.mocked(useFloorOpeningById)

// Mock SelectionOutline component
vi.mock('@/editor/canvas/utils/SelectionOutline', () => ({
  SelectionOutline: ({ points }: { points: any[] }) => (
    <div data-testid="selection-outline" data-points={points.length} />
  )
}))

describe('SelectionOverlay', () => {
  beforeEach(() => {
    // Reset mocks
    mockUseSelectionPath.mockReturnValue([])
    mockUseCurrentSelection.mockReturnValue(null)
    mockUsePerimeterById.mockReturnValue(null)
    mockUseFloorAreaById.mockReturnValue(null)
    mockUseFloorOpeningById.mockReturnValue(null)
  })

  it('renders nothing when no selection', () => {
    const { container } = render(<SelectionOverlay />)
    expect(container.firstChild).toBeNull()
  })

  it('renders OuterWall selection outline', () => {
    const wallId = 'perimeter_123'
    const mockWall: Partial<Perimeter> = {
      id: wallId as any,
      corners: [
        { outsidePoint: vec2.fromValues(0, 0) },
        { outsidePoint: vec2.fromValues(100, 0) },
        { outsidePoint: vec2.fromValues(100, 100) },
        { outsidePoint: vec2.fromValues(0, 100) }
      ] as any
    }

    mockUseSelectionPath.mockReturnValue([wallId])
    mockUseCurrentSelection.mockReturnValue(wallId)
    mockUsePerimeterById.mockReturnValue(mockWall as Perimeter)

    const { getByTestId } = render(<SelectionOverlay />)
    const outline = getByTestId('selection-outline')
    expect(outline).toBeInTheDocument()
    expect(outline).toHaveAttribute('data-points', '4') // 4 corner points
  })

  it('renders PerimeterWall selection outline', () => {
    const perimeterId = 'perimeter_123'
    const wallId = 'outwall_456'
    const mockWall = {
      id: perimeterId,
      walls: [
        {
          id: wallId,
          insideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(100, 0) },
          outsideLine: { start: vec2.fromValues(0, 50), end: vec2.fromValues(100, 50) }
        }
      ]
    }

    mockUseSelectionPath.mockReturnValue([perimeterId, wallId])
    mockUseCurrentSelection.mockReturnValue(wallId)
    mockUsePerimeterById.mockReturnValue(mockWall as Perimeter)

    const { getByTestId } = render(<SelectionOverlay />)
    const outline = getByTestId('selection-outline')
    expect(outline).toBeInTheDocument()
    expect(outline).toHaveAttribute('data-points', '4') // Wall rectangle
  })

  it('renders Opening selection outline', () => {
    const perimeterId = 'perimeter_123'
    const wallId = 'outwall_456'
    const openingId = 'opening_789'
    const mockWall = {
      id: perimeterId,
      walls: [
        {
          id: wallId,
          insideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(100, 0) },
          outsideLine: { start: vec2.fromValues(0, 50), end: vec2.fromValues(100, 50) },
          direction: vec2.fromValues(1, 0),
          openings: [
            {
              id: openingId,
              offsetFromStart: 1000,
              width: 800
            }
          ]
        }
      ]
    }

    mockUseSelectionPath.mockReturnValue([perimeterId, wallId, openingId])
    mockUseCurrentSelection.mockReturnValue(openingId)
    mockUsePerimeterById.mockReturnValue(mockWall as Perimeter)

    const { getByTestId } = render(<SelectionOverlay />)
    const outline = getByTestId('selection-outline')
    expect(outline).toBeInTheDocument()
    expect(outline).toHaveAttribute('data-points', '4') // Opening rectangle
  })

  it('handles missing wall gracefully', () => {
    const wallId = 'perimeter_123'

    mockUseSelectionPath.mockReturnValue([wallId])
    mockUseCurrentSelection.mockReturnValue(wallId)
    mockUsePerimeterById.mockReturnValue(null)

    const { container } = render(<SelectionOverlay />)
    expect(container.firstChild).toBeNull()
  })

  it('renders floor area selection outline', () => {
    const storeyId = 'storey_1'
    const floorAreaId = 'floorarea_1'
    mockUseSelectionPath.mockReturnValue([storeyId, floorAreaId])
    mockUseCurrentSelection.mockReturnValue(floorAreaId)
    mockUseFloorAreaById.mockReturnValue({
      id: floorAreaId,
      storeyId,
      area: { points: [vec2.fromValues(0, 0), vec2.fromValues(200, 0), vec2.fromValues(200, 200)] }
    } as any)

    const { getByTestId } = render(<SelectionOverlay />)
    const outline = getByTestId('selection-outline')
    expect(outline).toBeInTheDocument()
    expect(outline).toHaveAttribute('data-points', '3')
  })

  it('renders floor opening selection outline', () => {
    const storeyId = 'storey_1'
    const openingId = 'flooropening_1'
    mockUseSelectionPath.mockReturnValue([storeyId, openingId])
    mockUseCurrentSelection.mockReturnValue(openingId)
    mockUseFloorOpeningById.mockReturnValue({
      id: openingId,
      storeyId,
      area: {
        points: [vec2.fromValues(10, 10), vec2.fromValues(20, 10), vec2.fromValues(20, 20), vec2.fromValues(10, 20)]
      }
    } as any)

    const { getByTestId } = render(<SelectionOverlay />)
    const outline = getByTestId('selection-outline')
    expect(outline).toBeInTheDocument()
    expect(outline).toHaveAttribute('data-points', '4')
  })
})
