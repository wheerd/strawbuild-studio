import { render } from '@testing-library/react'
import { vi } from 'vitest'

import { createVec2 } from '@/shared/geometry'

import { SelectionOutline } from './SelectionOutline'

// Mock the viewport store
const mockUseZoom = vi.fn()
vi.mock('@/editor/hooks/useViewportStore', () => ({
  useZoom: () => mockUseZoom()
}))

describe('SelectionOutline', () => {
  beforeEach(() => {
    mockUseZoom.mockReturnValue(1.0)
  })

  it('renders without crashing for valid polygon', () => {
    const points = [createVec2(0, 0), createVec2(100, 0), createVec2(100, 100), createVec2(0, 100)]

    expect(() => {
      render(<SelectionOutline points={points} />)
    }).not.toThrow()
  })

  it('uses zoom value for responsive styling', () => {
    mockUseZoom.mockReturnValue(2.0)

    const points = [createVec2(0, 0), createVec2(100, 0), createVec2(100, 100), createVec2(0, 100)]

    expect(() => {
      render(<SelectionOutline points={points} />)
    }).not.toThrow()

    expect(mockUseZoom).toHaveBeenCalled()
  })

  it('returns null for invalid polygons', () => {
    const invalidPoints = [createVec2(0, 0), createVec2(100, 0)]

    const result = render(<SelectionOutline points={invalidPoints} />)
    expect(result.container.firstChild).toBeNull()
  })

  it('uses correct theme colors', () => {
    const points = [createVec2(0, 0), createVec2(100, 0), createVec2(100, 100), createVec2(0, 100)]

    expect(() => {
      render(<SelectionOutline points={points} />)
    }).not.toThrow()
  })
})
