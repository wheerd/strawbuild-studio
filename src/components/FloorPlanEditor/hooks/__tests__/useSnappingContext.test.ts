import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSnappingContext } from '../useSnappingContext'
import * as floorDataHooks from '../useFloorData'
import * as modelStore from '@/model/store'

// Mock the dependencies
vi.mock('../useFloorData')
vi.mock('@/model/store')

const mockedFloorDataHooks = vi.mocked(floorDataHooks)
const mockedModelStore = vi.mocked(modelStore)

describe('useSnappingContext Optimization', () => {
  const mockModelState = {
    points: new Map([
      ['point1', { id: 'point1', position: { x: 0, y: 0 } }],
      ['point2', { id: 'point2', position: { x: 100, y: 0 } }]
    ]),
    walls: new Map(),
    floors: new Map(),
    rooms: new Map(),
    corners: new Map(),
    slabs: new Map(),
    roofs: new Map(),
    createdAt: new Date(),
    updatedAt: new Date()
  } as any

  const mockPoints = [
    { id: 'point1', position: { x: 0, y: 0 } },
    { id: 'point2', position: { x: 100, y: 0 } }
  ] as any[]

  const mockWalls = [
    { id: 'wall1', startPointId: 'point1', endPointId: 'point2' }
  ] as any[]

  beforeEach(() => {
    vi.clearAllMocks()
    mockedFloorDataHooks.usePointsOfActiveFloor.mockReturnValue(mockPoints)
    mockedFloorDataHooks.useWallsOfActiveFloor.mockReturnValue(mockWalls)
    mockedModelStore.useModelStore.mockReturnValue(mockModelState)
  })

  describe('ReferencePointId Optimization', () => {
    it('should use provided referencePointId without expensive coordinate lookup', () => {
      const referencePoint = { x: 0, y: 0 } as any
      const referencePointId = 'point1' as any

      const { result } = renderHook(() =>
        useSnappingContext(referencePoint, referencePointId)
      )

      // Should use the provided ID directly
      expect(result.current.referencePointId).toBe('point1')
      expect(result.current.referencePoint).toBe(referencePoint)

      // Should have reference line segments since we have a valid point ID
      expect(result.current.referenceLineSegments).toBeDefined()
      expect(result.current.referenceLineSegments).toHaveLength(1)
    })

    it('should fall back to coordinate lookup when referencePointId is not provided', () => {
      const referencePoint = { x: 0, y: 0 } as any // Matches point1 position

      const { result } = renderHook(() =>
        useSnappingContext(referencePoint)
      )

      // Should find the point by coordinates
      expect(result.current.referencePointId).toBe('point1')
      expect(result.current.referencePoint).toBe(referencePoint)
    })

    it('should handle case where coordinates dont match any existing point', () => {
      const referencePoint = { x: 999, y: 999 } as any // No matching point

      const { result } = renderHook(() =>
        useSnappingContext(referencePoint)
      )

      // Should not find any point ID
      expect(result.current.referencePointId).toBeUndefined()
      expect(result.current.referencePoint).toBe(referencePoint)
      expect(result.current.referenceLineSegments).toBeUndefined()
    })

    it('should prefer provided referencePointId over coordinate lookup', () => {
      const referencePoint = { x: 100, y: 0 } as any // Matches point2 position
      const referencePointId = 'point1' as any // But we explicitly provide point1 ID

      const { result } = renderHook(() =>
        useSnappingContext(referencePoint, referencePointId)
      )

      // Should use the explicitly provided ID, not the coordinate match
      expect(result.current.referencePointId).toBe('point1')
      expect(result.current.referencePoint).toBe(referencePoint)
    })

    it('should memoize result and include referencePointId in dependencies', () => {
      const referencePoint = { x: 0, y: 0 } as any
      const referencePointId = 'point1' as any

      const { result, rerender } = renderHook(
        ({ refPoint, refPointId }) => useSnappingContext(refPoint, refPointId),
        { initialProps: { refPoint: referencePoint, refPointId: referencePointId } }
      )

      const firstResult = result.current

      // Rerender with same props should return memoized result
      rerender({ refPoint: referencePoint, refPointId: referencePointId })
      expect(result.current).toBe(firstResult)

      // Change referencePointId should trigger recalculation
      rerender({ refPoint: referencePoint, refPointId: 'point2' as any })
      expect(result.current).not.toBe(firstResult)
      expect(result.current.referencePointId).toBe('point2')
    })
  })

  describe('Performance Characteristics', () => {
    it('should be more efficient with referencePointId provided', () => {
      const referencePoint = { x: 0, y: 0 } as any
      const referencePointId = 'point1' as any

      // Mock points.find to track if expensive lookup is called
      const findSpy = vi.spyOn(mockPoints, 'find')

      renderHook(() => useSnappingContext(referencePoint, referencePointId))

      // When referencePointId is provided, coordinate lookup should be skipped
      expect(findSpy).not.toHaveBeenCalled()

      findSpy.mockRestore()
    })

    it('should call expensive coordinate lookup only when necessary', () => {
      const referencePoint = { x: 0, y: 0 } as any

      // Mock points.find to track expensive lookup calls
      const findSpy = vi.spyOn(mockPoints, 'find')

      renderHook(() => useSnappingContext(referencePoint)) // No referencePointId provided

      // Should call expensive lookup when referencePointId is not provided
      expect(findSpy).toHaveBeenCalled()

      findSpy.mockRestore()
    })
  })
})
