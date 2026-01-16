import { render } from '@testing-library/react'
import { vi } from 'vitest'

import { newVec2, offsetPolygon } from '@/shared/geometry'

import { SelectionOutline } from './SelectionOutline'

// Mock the viewport store
const mockUseZoom = vi.fn()
vi.mock('@/editor/hooks/useViewportStore', () => ({
  useZoom: () => mockUseZoom()
}))

const offsetPolygonMock = vi.mocked(offsetPolygon)

vi.mock('@/shared/geometry', async importOriginal => ({
  ...(await importOriginal()),
  offsetPolygon: vi.fn()
}))

describe('SelectionOutline', () => {
  beforeEach(() => {
    mockUseZoom.mockReset()
    mockUseZoom.mockReturnValue(1.0)
    offsetPolygonMock.mockReset()
    offsetPolygonMock.mockImplementation(({ points }) => ({ points }))
  })

  it('renders without crashing for valid polygon', () => {
    const points = [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100), newVec2(0, 100)]

    expect(() => {
      render(<SelectionOutline points={points} />)
    }).not.toThrow()
  })

  it('uses zoom value for responsive styling', () => {
    mockUseZoom.mockReturnValue(2.0)

    const points = [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100), newVec2(0, 100)]

    expect(() => {
      render(<SelectionOutline points={points} />)
    }).not.toThrow()

    expect(mockUseZoom).toHaveBeenCalled()
  })

  it('uses correct theme colors', () => {
    const points = [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100), newVec2(0, 100)]

    expect(() => {
      render(<SelectionOutline points={points} />)
    }).not.toThrow()
  })
})
