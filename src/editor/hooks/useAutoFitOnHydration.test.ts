import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAutoFitOnHydration } from './useAutoFitOnHydration'

// Mock dependencies
vi.mock('@/building/store', () => ({
  getModelActions: vi.fn(() => ({
    getActiveStoreyId: vi.fn(() => 'storey-1'),
    getPerimetersByStorey: vi.fn(() => [])
  }))
}))

vi.mock('@/building/store/persistenceStore', () => ({
  useIsHydrated: vi.fn(() => false)
}))

vi.mock('@/editor/hooks/useViewportStore', () => ({
  viewportActions: vi.fn(() => ({
    fitToView: vi.fn()
  }))
}))

describe('useAutoFitOnHydration', () => {
  it('should not crash when called', () => {
    expect(() => {
      renderHook(() => {
        useAutoFitOnHydration()
      })
    }).not.toThrow()
  })

  it('should be callable without parameters', () => {
    const { result } = renderHook(() => {
      useAutoFitOnHydration()
    })
    expect(result.current).toBeUndefined()
  })
})
