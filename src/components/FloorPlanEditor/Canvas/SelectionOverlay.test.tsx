import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { SelectionOverlay } from './SelectionOverlay'
import { createVec2 } from '@/types/geometry'
import type { Perimeter } from '@/types/model'

// Mock the required hooks and stores
const mockUseSelectionPath = vi.fn()
const mockUseCurrentSelection = vi.fn()
const mockUseModelStore = vi.fn()

vi.mock('@/components/FloorPlanEditor/hooks/useSelectionStore', () => ({
  useSelectionPath: () => mockUseSelectionPath(),
  useCurrentSelection: () => mockUseCurrentSelection()
}))

vi.mock('@/model/store', () => ({
  useModelStore: () => mockUseModelStore()
}))

// Mock SelectionOutline component
vi.mock('../components/SelectionOutline', () => ({
  SelectionOutline: ({ points }: { points: any[] }) => (
    <div data-testid="selection-outline" data-points={points.length} />
  )
}))

describe('SelectionOverlay', () => {
  beforeEach(() => {
    // Reset mocks
    mockUseSelectionPath.mockReturnValue([])
    mockUseCurrentSelection.mockReturnValue(null)
    mockUseModelStore.mockReturnValue({
      getPerimeterById: vi.fn().mockReturnValue(null)
    })
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
        { outsidePoint: createVec2(0, 0) },
        { outsidePoint: createVec2(100, 0) },
        { outsidePoint: createVec2(100, 100) },
        { outsidePoint: createVec2(0, 100) }
      ] as any
    }

    mockUseSelectionPath.mockReturnValue([wallId])
    mockUseCurrentSelection.mockReturnValue(wallId)
    mockUseModelStore.mockReturnValue({
      getPerimeterById: vi.fn().mockReturnValue(mockWall)
    })

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
          insideLine: { start: createVec2(0, 0), end: createVec2(100, 0) },
          outsideLine: { start: createVec2(0, 50), end: createVec2(100, 50) }
        }
      ]
    }

    mockUseSelectionPath.mockReturnValue([perimeterId, wallId])
    mockUseCurrentSelection.mockReturnValue(wallId)
    mockUseModelStore.mockReturnValue({
      getPerimeterById: vi.fn().mockReturnValue(mockWall)
    })

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
          insideLine: { start: createVec2(0, 0), end: createVec2(100, 0) },
          outsideLine: { start: createVec2(0, 50), end: createVec2(100, 50) },
          direction: createVec2(1, 0),
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
    mockUseModelStore.mockReturnValue({
      getPerimeterById: vi.fn().mockReturnValue(mockWall)
    })

    const { getByTestId } = render(<SelectionOverlay />)
    const outline = getByTestId('selection-outline')
    expect(outline).toBeInTheDocument()
    expect(outline).toHaveAttribute('data-points', '4') // Opening rectangle
  })

  it('handles missing wall gracefully', () => {
    const wallId = 'perimeter_123'

    mockUseSelectionPath.mockReturnValue([wallId])
    mockUseCurrentSelection.mockReturnValue(wallId)
    mockUseModelStore.mockReturnValue({
      getPerimeterById: vi.fn().mockReturnValue(null)
    })

    const { container } = render(<SelectionOverlay />)
    expect(container.firstChild).toBeNull()
  })
})
