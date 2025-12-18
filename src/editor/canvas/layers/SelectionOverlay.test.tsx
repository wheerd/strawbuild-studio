import { render } from '@testing-library/react'
import { vi } from 'vitest'

import type { Perimeter } from '@/building/model/model'
import { useFloorAreaById, useFloorOpeningById, usePerimeterById, useRoofById } from '@/building/store'
import { newVec2 } from '@/shared/geometry'

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
  useFloorOpeningById: vi.fn(),
  useRoofById: vi.fn()
}))

const mockUsePerimeterById = vi.mocked(usePerimeterById)
const mockUseFloorAreaById = vi.mocked(useFloorAreaById)
const mockUseFloorOpeningById = vi.mocked(useFloorOpeningById)
const mockUseRoofById = vi.mocked(useRoofById)

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
    mockUseRoofById.mockReturnValue(null)
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
        { outsidePoint: newVec2(0, 0) },
        { outsidePoint: newVec2(100, 0) },
        { outsidePoint: newVec2(100, 100) },
        { outsidePoint: newVec2(0, 100) }
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
          insideLine: { start: newVec2(0, 0), end: newVec2(100, 0) },
          outsideLine: { start: newVec2(0, 50), end: newVec2(100, 50) }
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
          insideLine: { start: newVec2(0, 0), end: newVec2(100, 0) },
          outsideLine: { start: newVec2(0, 50), end: newVec2(100, 50) },
          direction: newVec2(1, 0),
          openings: [
            {
              id: openingId,
              centerOffsetFromWallStart: 1000,
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
      area: { points: [newVec2(0, 0), newVec2(200, 0), newVec2(200, 200)] }
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
        points: [newVec2(10, 10), newVec2(20, 10), newVec2(20, 20), newVec2(10, 20)]
      }
    } as any)

    const { getByTestId } = render(<SelectionOverlay />)
    const outline = getByTestId('selection-outline')
    expect(outline).toBeInTheDocument()
    expect(outline).toHaveAttribute('data-points', '4')
  })
})
