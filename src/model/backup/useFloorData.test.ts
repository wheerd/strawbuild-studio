import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePointsOfActiveFloor, useWallsOfActiveFloor, useActiveFloorData } from './useFloorData'
import * as operations from '@/model/operations'
import * as editorStore from './useEditorStore'
import * as modelStore from '@/model/store'

// Mock the dependencies
vi.mock('@/model/operations')
vi.mock('./useEditorStore')
vi.mock('@/model/store')

const mockedOperations = vi.mocked(operations)
const mockedEditorStore = vi.mocked(editorStore)
const mockedModelStore = vi.mocked(modelStore)

describe('Floor Data Hooks', () => {
  const mockFloorId = 'test-floor' as any
  const mockModelState = {
    points: new Map(),
    walls: new Map(),
    floors: new Map(),
    rooms: new Map(),
    corners: new Map(),
    slabs: new Map(),
    roofs: new Map(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
  const mockPoints = [
    { id: 'point1', position: { x: 0, y: 0 } },
    { id: 'point2', position: { x: 100, y: 0 } }
  ] as any[]
  const mockWalls = [
    { id: 'wall1', startPointId: 'point1', endPointId: 'point2' }
  ] as any[]

  beforeEach(() => {
    vi.clearAllMocks()
    mockedEditorStore.useActiveFloorId.mockReturnValue(mockFloorId)
    mockedModelStore.useModelStore.mockReturnValue(mockModelState)
    mockedOperations.getPointsOnFloor.mockReturnValue(mockPoints)
    mockedOperations.getWallsOnFloor.mockReturnValue(mockWalls)
    mockedOperations.getRoomsOnFloor.mockReturnValue([])
  })

  describe('usePointsOfActiveFloor', () => {
    it('should return memoized points from active floor', () => {
      const { result, rerender } = renderHook(() => usePointsOfActiveFloor())

      expect(result.current).toBe(mockPoints)
      expect(mockedOperations.getPointsOnFloor).toHaveBeenCalledWith(mockModelState, mockFloorId)

      // Rerender without changing dependencies should not call operation again
      rerender()
      expect(mockedOperations.getPointsOnFloor).toHaveBeenCalledTimes(1)
    })

    it('should recalculate when dependencies change', () => {
      const { rerender } = renderHook(() => usePointsOfActiveFloor())

      expect(mockedOperations.getPointsOnFloor).toHaveBeenCalledTimes(1)

      // Change the points map reference to trigger memoization invalidation
      const newModelState = {
        ...mockModelState,
        points: new Map(mockModelState.points) // New Map reference
      }
      mockedModelStore.useModelStore.mockReturnValue(newModelState)

      rerender()

      // Should recalculate because points map reference changed
      expect(mockedOperations.getPointsOnFloor).toHaveBeenCalledTimes(2)
    })
  })

  describe('useWallsOfActiveFloor', () => {
    it('should return memoized walls from active floor', () => {
      const { result, rerender } = renderHook(() => useWallsOfActiveFloor())

      expect(result.current).toBe(mockWalls)
      expect(mockedOperations.getWallsOnFloor).toHaveBeenCalledWith(mockModelState, mockFloorId)

      // Rerender without changing dependencies should not call operation again
      rerender()
      expect(mockedOperations.getWallsOnFloor).toHaveBeenCalledTimes(1)
    })
  })

  describe('useActiveFloorData', () => {
    it('should return combined floor data', () => {
      const { result } = renderHook(() => useActiveFloorData())

      expect(result.current).toEqual({
        points: mockPoints,
        walls: mockWalls,
        rooms: []
      })
    })

    it('should memoize combined data', () => {
      const { result, rerender } = renderHook(() => useActiveFloorData())

      const firstResult = result.current
      rerender()
      const secondResult = result.current

      // Should return the same object reference (memoized)
      expect(firstResult).toBe(secondResult)
    })
  })

  describe('Performance characteristics', () => {
    it('should avoid expensive recalculations on every render', () => {
      const { rerender } = renderHook(() => {
        usePointsOfActiveFloor()
        useWallsOfActiveFloor()
      })

      // Initial render
      expect(mockedOperations.getPointsOnFloor).toHaveBeenCalledTimes(1)
      expect(mockedOperations.getWallsOnFloor).toHaveBeenCalledTimes(1)

      // Multiple rerenders without dependency changes
      rerender()
      rerender()
      rerender()

      // Should not have called operations again
      expect(mockedOperations.getPointsOnFloor).toHaveBeenCalledTimes(1)
      expect(mockedOperations.getWallsOnFloor).toHaveBeenCalledTimes(1)
    })
  })
})
