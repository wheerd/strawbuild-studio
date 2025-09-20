import React, { useState, useCallback, useRef } from 'react'
import { AllSidesIcon } from '@radix-ui/react-icons'

interface SVGViewportProps {
  children: React.ReactNode
  baseViewBox: string
  className?: string
  resetButtonPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

interface ViewportState {
  zoom: number
  panX: number
  panY: number
}

const ZOOM_SCALE = 1.1
const MIN_ZOOM = 0.1
const MAX_ZOOM = 100

const getResetButtonPosition = (position: SVGViewportProps['resetButtonPosition']) => {
  switch (position) {
    case 'top-left':
      return 'top-2 left-2'
    case 'bottom-left':
      return 'bottom-2 left-2'
    case 'bottom-right':
      return 'bottom-2 right-2'
    case 'top-right':
    default:
      return 'top-2 right-2'
  }
}

export function SVGViewport({
  children,
  baseViewBox,
  className = 'w-full h-full',
  resetButtonPosition = 'top-right'
}: SVGViewportProps): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    panX: 0,
    panY: 0
  })
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)

  // Reset viewport to initial state
  const resetView = useCallback(() => {
    setViewport({
      zoom: 1,
      panX: 0,
      panY: 0
    })
  }, [])

  // Convert screen coordinates to SVG coordinates using CTM
  const screenToSVGClient = useCallback((screenX: number, screenY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 }

    const ctm = svgRef.current.getScreenCTM()!
    const pt = svgRef.current.createSVGPoint()
    pt.x = screenX
    pt.y = screenY
    const result = pt.matrixTransform(ctm.inverse())
    return { x: result.x, y: result.y }
  }, [])

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()

      const zoomFactor = e.deltaY > 0 ? 1 / ZOOM_SCALE : ZOOM_SCALE
      const mousePos = screenToSVGClient(e.clientX, e.clientY)

      setViewport(prev => {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * zoomFactor))
        const zoomRatio = newZoom / prev.zoom

        // Zoom toward mouse position (same logic as main editor)
        const newPanX = mousePos.x - (mousePos.x - prev.panX) * zoomRatio
        const newPanY = mousePos.y - (mousePos.y - prev.panY) * zoomRatio

        return {
          zoom: newZoom,
          panX: newPanX,
          panY: newPanY
        }
      })
    },
    [screenToSVGClient]
  )

  // Handle pointer down (start pan)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Pan with middle click or shift+left click
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        e.preventDefault()
        const clientPos = screenToSVGClient(e.clientX, e.clientY)
        setDragStart(clientPos)
      }
    },
    [screenToSVGClient]
  )

  // Handle pointer move (continue pan)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart) return

      // Check if still panning (middle button or shift+left)
      if (!(e.buttons === 4 || (e.buttons === 1 && e.shiftKey))) {
        setDragStart(null)
        return
      }

      e.preventDefault()
      const currentPos = screenToSVGClient(e.clientX, e.clientY)

      // Calculate delta and apply pan (same as main editor)
      const deltaX = currentPos.x - dragStart.x
      const deltaY = currentPos.y - dragStart.y

      setViewport(prev => ({
        ...prev,
        panX: prev.panX + deltaX,
        panY: prev.panY + deltaY
      }))

      setDragStart(currentPos)
    },
    [dragStart, screenToSVGClient]
  )

  // Handle pointer up (end pan)
  const handlePointerUp = useCallback(() => {
    if (dragStart) {
      setDragStart(null)
    }
  }, [dragStart])

  // Handle touch gestures for mobile
  const [touches, setTouches] = useState<React.Touch[]>([])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouches(Array.from(e.touches))
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      const currentTouches = Array.from(e.touches)

      if (touches.length === 1 && currentTouches.length === 1) {
        // Single finger pan
        const prevTouch = touches[0]
        const currentTouch = currentTouches[0]

        const prevPos = screenToSVGClient(prevTouch.clientX, prevTouch.clientY)
        const currentPos = screenToSVGClient(currentTouch.clientX, currentTouch.clientY)

        const deltaX = currentPos.x - prevPos.x
        const deltaY = currentPos.y - prevPos.y

        setViewport(prev => ({
          ...prev,
          panX: prev.panX + deltaX,
          panY: prev.panY + deltaY
        }))
      } else if (touches.length === 2 && currentTouches.length === 2) {
        // Two finger pinch zoom
        const prevDistance = Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY
        )
        const currentDistance = Math.hypot(
          currentTouches[0].clientX - currentTouches[1].clientX,
          currentTouches[0].clientY - currentTouches[1].clientY
        )

        if (prevDistance > 0) {
          const zoomFactor = currentDistance / prevDistance
          const centerX = (currentTouches[0].clientX + currentTouches[1].clientX) / 2
          const centerY = (currentTouches[0].clientY + currentTouches[1].clientY) / 2
          const centerPos = screenToSVGClient(centerX, centerY)

          setViewport(prev => {
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * zoomFactor))
            const zoomRatio = newZoom / prev.zoom

            return {
              zoom: newZoom,
              panX: centerPos.x - (centerPos.x - prev.panX) * zoomRatio,
              panY: centerPos.y - (centerPos.y - prev.panY) * zoomRatio
            }
          })
        }
      }

      setTouches(currentTouches)
    },
    [touches, screenToSVGClient]
  )

  const handleTouchEnd = useCallback(() => {
    setTouches([])
  }, [])

  // Generate transform string (same order as main editor: translate then scale)
  const transform = `translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.zoom})`

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        viewBox={baseViewBox}
        className="w-full h-full touch-none"
        preserveAspectRatio="xMidYMid meet"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <g transform={transform}>{children}</g>
      </svg>

      <button
        onClick={resetView}
        className={`absolute ${getResetButtonPosition(resetButtonPosition)} bg-white hover:bg-gray-50 border border-gray-300 rounded-md p-2 shadow-sm transition-colors`}
        title="Reset view"
        type="button"
      >
        <AllSidesIcon className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  )
}
