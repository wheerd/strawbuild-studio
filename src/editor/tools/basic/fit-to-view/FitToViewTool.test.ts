import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StoreyId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { Bounds2D, newVec2 } from '@/shared/geometry'

import { FitToViewTool } from './FitToViewTool'

// Mock the store hooks
vi.mock('@/editor/hooks/useViewportStore')
vi.mock('@/building/store')
vi.mock('@/editor/tools/system', () => ({
  getToolActions: vi.fn(() => ({
    popTool: vi.fn(),
    pushTool: vi.fn(),
    replaceTool: vi.fn(),
    clearToDefault: vi.fn()
  }))
}))

describe('FitToViewTool', () => {
  let fitToViewTool: FitToViewTool
  let mockGetBounds: ReturnType<typeof vi.fn>
  let mockFitToView: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fitToViewTool = new FitToViewTool()

    // Create only the specific mocks we need for these tests
    mockGetBounds = vi.fn()
    mockFitToView = vi.fn()

    // Mock model actions accessor
    const mockedGetModelActions = vi.mocked(getModelActions)
    mockedGetModelActions.mockReturnValue({
      getActiveStoreyId: () => 'floor1' as StoreyId,
      getBounds: mockGetBounds
    } as any)

    // Mock viewport actions
    const mockedViewportActions = vi.mocked(viewportActions)
    mockedViewportActions.mockReturnValue({
      fitToView: mockFitToView
    } as any)
  })

  it('should have correct id', () => {
    expect(fitToViewTool.id).toBe('basic.fit-to-view')
  })

  it('should perform fit to view', () => {
    const bounds = Bounds2D.fromMinMax(newVec2(0, 0), newVec2(100, 100))
    mockGetBounds.mockReturnValue(bounds)

    fitToViewTool.onActivate()

    expect(mockGetBounds).toHaveBeenCalledWith('floor1')
    expect(mockFitToView).toHaveBeenCalledWith(bounds)
  })

  it('should handle empty bounds gracefully', () => {
    mockGetBounds.mockReturnValue(Bounds2D.EMPTY)

    const consoleSpy = vi.spyOn(console, 'log')

    fitToViewTool.onActivate()

    expect(consoleSpy).toHaveBeenCalledWith('No entities to fit - no bounds available')
    expect(mockFitToView).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
