import { AllSidesIcon } from '@radix-ui/react-icons'
import { IconButton } from '@radix-ui/themes'
import React, { type RefAttributes, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

import type { Bounds2D } from '@/shared/geometry'

export interface SVGViewportRef {
  fitToContent: () => void
  zoomToBounds: (bounds: Bounds2D, options?: { padding?: number; animate?: boolean }) => void
}

interface SVGViewportProps extends RefAttributes<SVGViewportRef> {
  children: React.ReactNode
  contentBounds: Bounds2D // Required - defines the content area
  svgSize: { width: number; height: number } // Fixed SVG size
  className?: string
  resetButtonPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  padding?: number // Padding around content (default: 0.1 = 10%)
  minZoom?: number // Minimum zoom level (default: 0.01)
  maxZoom?: number // Maximum zoom level (default: 50)
}

interface ViewportState {
  zoom: number
  panX: number
  panY: number
}

const ZOOM_SCALE = 1.1
const DEFAULT_PADDING = 0.1
const DEFAULT_MIN_ZOOM = 0.00001 // Support very small zoom for large world-space coordinates (mm)
const DEFAULT_MAX_ZOOM = 1000 // Support very large zoom for detailed views

// Utility function to fit bounds to viewport with padding
function fitBoundsToViewport(
  bounds: Bounds2D,
  viewportWidth: number,
  viewportHeight: number,
  padding: number
): ViewportState {
  if (bounds.isEmpty || viewportWidth <= 0 || viewportHeight <= 0 || bounds.width <= 0 || bounds.height <= 0) {
    return { zoom: 1, panX: 0, panY: 0 }
  }

  // Calculate padded dimensions
  const paddedWidth = bounds.width * (1 + padding * 2)
  const paddedHeight = bounds.height * (1 + padding * 2)

  // Calculate zoom to fit content in viewport
  const zoomX = viewportWidth / paddedWidth
  const zoomY = viewportHeight / paddedHeight
  const zoom = Math.min(zoomX, zoomY)

  // Ensure zoom is valid
  if (!isFinite(zoom) || zoom <= 0) {
    return { zoom: 1, panX: 0, panY: 0 }
  }

  // Calculate pan to center content
  // Transform: viewBox = world * zoom + pan (SVG applies transforms right-to-left)
  // We want bounds.center to map to viewport center
  // viewportCenter = boundsCenter * zoom + pan
  // pan = viewportCenter - boundsCenter * zoom
  const [boundsCenterX, boundsCenterY] = bounds.center
  const panX = viewportWidth / 2 - boundsCenterX * zoom
  const panY = viewportHeight / 2 - boundsCenterY * zoom

  return { zoom, panX, panY }
}

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
  contentBounds,
  svgSize,
  ref,
  className = 'w-full h-full',
  resetButtonPosition = 'top-right',
  padding = DEFAULT_PADDING,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM
}: SVGViewportProps): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)

  const [viewport, setViewport] = useState<ViewportState>(() => {
    // Initialize with correct viewport if bounds are available
    if (!contentBounds.isEmpty && svgSize.width > 0 && svgSize.height > 0) {
      return fitBoundsToViewport(contentBounds, svgSize.width, svgSize.height, padding)
    }
    return { zoom: 1, panX: 0, panY: 0 }
  })
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)

  // Reset to initial viewport and recalculate viewBox
  const fitToContent = useCallback(() => {
    if (contentBounds.isEmpty || svgSize.width <= 0 || svgSize.height <= 0) return
    const newViewport = fitBoundsToViewport(contentBounds, svgSize.width, svgSize.height, padding)
    setViewport(newViewport)
  }, [contentBounds, svgSize.width, svgSize.height, padding])

  // Zoom to specific bounds with optional padding
  const zoomToBounds = useCallback(
    (bounds: Bounds2D, options?: { padding?: number; animate?: boolean }) => {
      if (bounds.isEmpty || svgSize.width <= 0 || svgSize.height <= 0) return

      const targetPadding = options?.padding ?? 0.1
      const newViewport = fitBoundsToViewport(bounds, svgSize.width, svgSize.height, targetPadding)

      // Don't clamp zoom for zoomToBounds - allow any zoom level needed to show the content
      setViewport(newViewport)
    },
    [svgSize.width, svgSize.height]
  )

  useImperativeHandle(
    ref,
    () => ({
      fitToContent,
      zoomToBounds
    }),
    [fitToContent, zoomToBounds]
  )

  // Auto-fit when contentBounds or svgSize changes
  useEffect(() => {
    if (contentBounds.isEmpty || svgSize.width <= 0 || svgSize.height <= 0) return
    const newViewport = fitBoundsToViewport(contentBounds, svgSize.width, svgSize.height, padding)
    setViewport(newViewport)
  }, [contentBounds, svgSize.width, svgSize.height, padding])

  // Fixed viewBox based on SVG size
  const viewBox = `0 0 ${svgSize.width || 100} ${svgSize.height || 100}`

  // Convert screen coordinates to SVG viewBox coordinates
  const screenToSVG = useCallback((screenX: number, screenY: number) => {
    if (!svgRef.current) return null

    const pt = svgRef.current.createSVGPoint()
    pt.x = screenX
    pt.y = screenY
    const ctm = svgRef.current.getScreenCTM()
    if (!ctm) return null

    const svgPt = pt.matrixTransform(ctm.inverse())
    return { x: svgPt.x, y: svgPt.y }
  }, [])

  // Handle wheel zoom with constraints
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()

      const svgCoords = screenToSVG(e.clientX, e.clientY)
      if (!svgCoords) return

      const zoomFactor = e.deltaY > 0 ? 1 / ZOOM_SCALE : ZOOM_SCALE

      setViewport(prev => {
        const newZoom = Math.max(minZoom, Math.min(maxZoom, prev.zoom * zoomFactor))

        // Zoom toward mouse position (keep world point under mouse fixed)
        // Transform: viewBox = world * zoom + pan (SVG right-to-left order)
        // Inverse: world = (viewBox - pan) / zoom
        // Keep world point constant: (viewBox - oldPan) / oldZoom = (viewBox - newPan) / newZoom
        // Solving: viewBox - newPan = (viewBox - oldPan) * newZoom / oldZoom
        //          newPan = viewBox - (viewBox - oldPan) * newZoom / oldZoom
        const newPanX = svgCoords.x - ((svgCoords.x - prev.panX) * newZoom) / prev.zoom
        const newPanY = svgCoords.y - ((svgCoords.y - prev.panY) * newZoom) / prev.zoom

        return {
          zoom: newZoom,
          panX: newPanX,
          panY: newPanY
        }
      })
    },
    [screenToSVG, minZoom, maxZoom]
  )

  // Handle pointer down (start pan)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Pan with middle click or shift+left click
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        e.preventDefault()

        const svgCoords = screenToSVG(e.clientX, e.clientY)
        if (!svgCoords) return

        setDragStart(svgCoords)
      }
    },
    [screenToSVG]
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

      const svgCoords = screenToSVG(e.clientX, e.clientY)
      if (!svgCoords) return

      // Calculate viewBox-space delta
      const deltaViewBoxX = svgCoords.x - dragStart.x
      const deltaViewBoxY = svgCoords.y - dragStart.y

      // Apply pan in viewBox space
      // Transform: viewBox = world * zoom + pan
      // To keep same world point: oldViewBox - oldPan = newViewBox - newPan (after dividing by zoom)
      // So: newPan = newViewBox - oldViewBox + oldPan = oldPan + deltaViewBox
      setViewport(prev => ({
        ...prev,
        panX: prev.panX + deltaViewBoxX,
        panY: prev.panY + deltaViewBoxY
      }))

      setDragStart(svgCoords)
    },
    [dragStart, screenToSVG]
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

        const prevCoords = screenToSVG(prevTouch.clientX, prevTouch.clientY)
        const currCoords = screenToSVG(currentTouch.clientX, currentTouch.clientY)
        if (!prevCoords || !currCoords) return

        const deltaViewBoxX = currCoords.x - prevCoords.x
        const deltaViewBoxY = currCoords.y - prevCoords.y

        setViewport(prev => ({
          ...prev,
          panX: prev.panX + deltaViewBoxX,
          panY: prev.panY + deltaViewBoxY
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

          const centerCoords = screenToSVG(centerX, centerY)
          if (!centerCoords) return

          setViewport(prev => {
            const newZoom = Math.max(minZoom, Math.min(maxZoom, prev.zoom * zoomFactor))

            // Keep touch center fixed in world space
            // newPan = viewBox - (viewBox - oldPan) * newZoom / oldZoom
            const newPanX = centerCoords.x - ((centerCoords.x - prev.panX) * newZoom) / prev.zoom
            const newPanY = centerCoords.y - ((centerCoords.y - prev.panY) * newZoom) / prev.zoom

            return {
              zoom: newZoom,
              panX: newPanX,
              panY: newPanY
            }
          })
        }
      }

      setTouches(currentTouches)
    },
    [touches, screenToSVG, minZoom, maxZoom]
  )

  const handleTouchEnd = useCallback(() => {
    setTouches([])
  }, [])

  // Use native event so we can prevent default (react listener is passive)
  useEffect(() => {
    if (svgRef.current) {
      const svg = svgRef.current
      svg.addEventListener('wheel', handleWheel, { passive: false })
      return () => svg.removeEventListener('wheel', handleWheel)
    }
  }, [svgRef.current])

  // Generate transform string (same order as main editor: translate then scale)
  const transform = `translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.zoom})`

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        width={svgSize.width || 100}
        height={svgSize.height || 100}
        className="w-full h-full touch-none block viewport"
        preserveAspectRatio="none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <g transform={transform}>{children}</g>
      </svg>

      <IconButton
        variant="surface"
        onClick={fitToContent}
        className={`absolute ${getResetButtonPosition(resetButtonPosition)}`}
        title="Fit to content"
      >
        <AllSidesIcon />
      </IconButton>
    </div>
  )
}
