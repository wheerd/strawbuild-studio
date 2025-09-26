import { act, renderHook } from '@testing-library/react'

import {
  usePanX,
  usePanY,
  useStageHeight,
  useStageWidth,
  useViewportActions,
  useViewportState,
  useZoom,
  viewportActions
} from './useViewportStore'

describe('Viewport Store', () => {
  beforeEach(() => {
    viewportActions().reset()
  })

  describe('useViewportState', () => {
    it('should return complete viewport state', () => {
      const { result } = renderHook(() => useViewportState())

      expect(result.current.zoom).toBe(0.15)
      expect(result.current.panX).toBe(100)
      expect(result.current.panY).toBe(100)
      expect(result.current.stageWidth).toBe(800)
      expect(result.current.stageHeight).toBe(600)
    })
  })

  describe('useViewportActions', () => {
    it('should provide all viewport actions', () => {
      const { result } = renderHook(() => useViewportActions())

      expect(typeof result.current.setViewport).toBe('function')
      expect(typeof result.current.setStageDimensions).toBe('function')
      expect(typeof result.current.setZoom).toBe('function')
      expect(typeof result.current.setPan).toBe('function')
      expect(typeof result.current.zoomBy).toBe('function')
      expect(typeof result.current.panBy).toBe('function')
      expect(typeof result.current.reset).toBe('function')
    })

    it('should update viewport with partial values', () => {
      const { result: actions } = renderHook(() => useViewportActions())
      const { result: state } = renderHook(() => useViewportState())

      act(() => {
        actions.current.setViewport({ zoom: 0.5, panX: 200 })
      })

      expect(state.current.zoom).toBe(0.5)
      expect(state.current.panX).toBe(200)
      expect(state.current.panY).toBe(100) // unchanged
      expect(state.current.stageWidth).toBe(800) // unchanged
      expect(state.current.stageHeight).toBe(600) // unchanged
    })

    it('should update stage dimensions', () => {
      const { result: actions } = renderHook(() => useViewportActions())
      const { result: state } = renderHook(() => useViewportState())

      act(() => {
        actions.current.setStageDimensions(1024, 768)
      })

      expect(state.current.stageWidth).toBe(1024)
      expect(state.current.stageHeight).toBe(768)
      expect(state.current.zoom).toBe(0.15) // unchanged
    })

    it('should set zoom value with clamping', () => {
      const { result: actions } = renderHook(() => useViewportActions())
      const { result: state } = renderHook(() => useViewportState())

      act(() => {
        actions.current.setZoom(0.5)
      })
      expect(state.current.zoom).toBe(0.5)

      // Test minimum clamping
      act(() => {
        actions.current.setZoom(-1)
      })
      expect(state.current.zoom).toBe(0.001)

      // Test maximum clamping
      act(() => {
        actions.current.setZoom(20)
      })
      expect(state.current.zoom).toBe(2)
    })

    it('should set pan values', () => {
      const { result: actions } = renderHook(() => useViewportActions())
      const { result: state } = renderHook(() => useViewportState())

      act(() => {
        actions.current.setPan(250, 350)
      })

      expect(state.current.panX).toBe(250)
      expect(state.current.panY).toBe(350)
    })

    it('should zoom by factor with clamping', () => {
      const { result: actions } = renderHook(() => useViewportActions())
      const { result: state } = renderHook(() => useViewportState())

      // Set initial zoom to known value
      act(() => {
        actions.current.setZoom(0.2)
      })

      act(() => {
        actions.current.zoomBy(2)
      })
      expect(state.current.zoom).toBe(0.4)

      // Test minimum clamping
      act(() => {
        actions.current.setZoom(0.002)
        actions.current.zoomBy(0.1)
      })
      expect(state.current.zoom).toBe(0.001)

      // Test maximum clamping
      act(() => {
        actions.current.setZoom(1.5)
        actions.current.zoomBy(5)
      })
      expect(state.current.zoom).toBe(2)
    })

    it('should pan by delta values', () => {
      const { result: actions } = renderHook(() => useViewportActions())
      const { result: state } = renderHook(() => useViewportState())

      // Set initial pan to known values
      act(() => {
        actions.current.setPan(100, 200)
      })

      act(() => {
        actions.current.panBy(50, -30)
      })

      expect(state.current.panX).toBe(150)
      expect(state.current.panY).toBe(170)
    })

    it('should reset to initial state', () => {
      const { result: actions } = renderHook(() => useViewportActions())
      const { result: state } = renderHook(() => useViewportState())

      // Change all values
      act(() => {
        actions.current.setViewport({
          zoom: 0.8,
          panX: 500,
          panY: 600,
          stageWidth: 1200,
          stageHeight: 900
        })
      })

      // Reset
      act(() => {
        actions.current.reset()
      })

      expect(state.current.zoom).toBe(0.15)
      expect(state.current.panX).toBe(100)
      expect(state.current.panY).toBe(100)
      expect(state.current.stageWidth).toBe(800)
      expect(state.current.stageHeight).toBe(600)
    })
  })

  describe('useZoom', () => {
    it('should return only zoom value', () => {
      const { result } = renderHook(() => useZoom())

      expect(result.current).toBe(0.15)
    })

    it('should update when zoom changes', () => {
      const { result: zoom } = renderHook(() => useZoom())
      const { result: actions } = renderHook(() => useViewportActions())

      act(() => {
        actions.current.setZoom(0.3)
      })

      expect(zoom.current).toBe(0.3)
    })
  })

  describe('individual selectors', () => {
    it('should return individual values', () => {
      const { result: panX } = renderHook(() => usePanX())
      const { result: panY } = renderHook(() => usePanY())
      const { result: stageWidth } = renderHook(() => useStageWidth())
      const { result: stageHeight } = renderHook(() => useStageHeight())

      expect(panX.current).toBe(100)
      expect(panY.current).toBe(100)
      expect(stageWidth.current).toBe(800)
      expect(stageHeight.current).toBe(600)
    })
  })

  describe('store integration', () => {
    it('should maintain state consistency across multiple hook instances', () => {
      const { result: state } = renderHook(() => useViewportState())
      const { result: zoom } = renderHook(() => useZoom())
      const { result: panX } = renderHook(() => usePanX())
      const { result: panY } = renderHook(() => usePanY())
      const { result: actions } = renderHook(() => useViewportActions())

      act(() => {
        actions.current.setZoom(0.3)
        actions.current.setPan(200, 250)
      })

      expect(state.current.zoom).toBe(0.3)
      expect(state.current.panX).toBe(200)
      expect(state.current.panY).toBe(250)
      expect(zoom.current).toBe(0.3)
      expect(panX.current).toBe(200)
      expect(panY.current).toBe(250)
    })
  })
})
