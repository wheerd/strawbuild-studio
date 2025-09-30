import { AllSidesIcon } from '@radix-ui/react-icons'
import React, {
  type RefAttributes,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react'

import type { Bounds2D } from '@/shared/geometry'

import './SVGViewport.css'

export interface SVGViewportRef {
  fitToContent: () => void
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
  flipY?: boolean
  flipX?: boolean
}

interface ViewportState {
  zoom: number
  panX: number
  panY: number
}

const ZOOM_SCALE = 1.1
const DEFAULT_PADDING = 0.1
const DEFAULT_MIN_ZOOM = 0.01
const DEFAULT_MAX_ZOOM = 50

// Utility functions
function calculateInitialViewport(): ViewportState {
  // Start with identity transform - viewBox handles the initial fitting
  return { zoom: 1, panX: 0, panY: 0 }
}

function generateViewBoxFromBounds(
  bounds: Bounds2D,
  padding: number,
  containerWidth: number,
  containerHeight: number,
  flipX: boolean = false,
  flipY: boolean = false
): string {
  const contentWidth = bounds.max[0] - bounds.min[0]
  const contentHeight = bounds.max[1] - bounds.min[1]

  // Calculate content center
  const contentCenterX = (bounds.min[0] + bounds.max[0]) / 2
  const contentCenterY = (bounds.min[1] + bounds.max[1]) / 2

  // Add padding to content dimensions
  const paddedContentWidth = contentWidth * (1 + padding * 2)
  const paddedContentHeight = contentHeight * (1 + padding * 2)

  // Calculate container aspect ratio
  const containerAspectRatio = containerWidth / containerHeight

  // Create viewBox that matches container aspect ratio exactly
  // Determine which dimension constrains us more
  let viewBoxWidth: number
  let viewBoxHeight: number

  if (paddedContentWidth / paddedContentHeight > containerAspectRatio) {
    // Content is wider relative to container - fit width, expand height
    viewBoxWidth = paddedContentWidth
    viewBoxHeight = paddedContentWidth / containerAspectRatio
  } else {
    // Content is taller relative to container - fit height, expand width
    viewBoxHeight = paddedContentHeight
    viewBoxWidth = paddedContentHeight * containerAspectRatio
  }

  // With transform-origin: 0 0, flips happen around the origin
  // So we need to adjust the content bounds before calculating the viewBox
  let adjustedContentCenterX = contentCenterX
  let adjustedContentCenterY = contentCenterY

  if (flipX) {
    // X coordinates get negated: x' = -x
    adjustedContentCenterX = -contentCenterX
  }
  if (flipY) {
    // Y coordinates get negated: y' = -y
    adjustedContentCenterY = -contentCenterY
  }

  // Center the viewBox on the adjusted content center
  const viewBoxX = adjustedContentCenterX - viewBoxWidth / 2
  const viewBoxY = adjustedContentCenterY - viewBoxHeight / 2

  return `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`
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
  maxZoom = DEFAULT_MAX_ZOOM,
  flipX = false,
  flipY = true
}: SVGViewportProps): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)

  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    panX: 0,
    panY: 0
  })
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)

  // Reset to initial viewport and recalculate viewBox
  const fitToContent = useCallback(() => {
    const initialViewport = calculateInitialViewport()
    setViewport(initialViewport)
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      fitToContent
    }),
    []
  )

  // Reset viewport when container size changes significantly
  useEffect(() => {
    if (svgSize.width <= 0 || svgSize.height <= 0) return
    // Reset to initial viewport when container changes to ensure proper fit
    const initialViewport = calculateInitialViewport()
    setViewport(initialViewport)
  }, [svgSize])

  // Initialize with default viewport
  useEffect(() => {
    fitToContent()
  }, [fitToContent])

  // Generate dynamic viewBox from content bounds
  const viewBox = useMemo(
    () =>
      svgSize.width > 0 && svgSize.height > 0
        ? generateViewBoxFromBounds(contentBounds, padding, svgSize.width, svgSize.height, flipX, flipY)
        : '0 0 100 100', // Fallback viewBox
    [contentBounds, padding, svgSize, flipX, flipY]
  )

  // Convert screen coordinates to SVG coordinates using CTM
  const screenToSVGClient = useCallback((screenX: number, screenY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 }

    const ctm = svgRef.current.getScreenCTM()
    if (!ctm) {
      console.warn('Cannot get SVG screen CTM, returning fallback coordinates')
      return { x: 0, y: 0 }
    }

    const pt = svgRef.current.createSVGPoint()
    pt.x = screenX
    pt.y = screenY
    const result = pt.matrixTransform(ctm.inverse())
    return { x: result.x, y: result.y }
  }, [])

  // Handle wheel zoom with constraints
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()

      const zoomFactor = e.deltaY > 0 ? 1 / ZOOM_SCALE : ZOOM_SCALE
      const mousePos = screenToSVGClient(e.clientX, e.clientY)

      setViewport(prev => {
        const newZoom = Math.max(minZoom, Math.min(maxZoom, prev.zoom * zoomFactor))
        const zoomRatio = newZoom / prev.zoom

        // Zoom toward mouse position
        const newPanX = mousePos.x - (mousePos.x - prev.panX) * zoomRatio
        const newPanY = mousePos.y - (mousePos.y - prev.panY) * zoomRatio

        return {
          zoom: newZoom,
          panX: newPanX,
          panY: newPanY
        }
      })
    },
    [screenToSVGClient, minZoom, maxZoom]
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
            const newZoom = Math.max(minZoom, Math.min(maxZoom, prev.zoom * zoomFactor))
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
        viewBox={viewBox}
        width={svgSize.width || 100}
        height={svgSize.height || 100}
        className="w-full h-full touch-none block viewport"
        preserveAspectRatio="none"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <g transform={transform}>
          <g className={`${flipY ? 'flipY' : 'normalY'} ${flipX ? 'flipX' : 'normalX'}`}>{children}</g>
        </g>
      </svg>

      <button
        onClick={fitToContent}
        className={`absolute ${getResetButtonPosition(resetButtonPosition)} bg-white hover:bg-gray-50 border border-gray-300 rounded-md p-2 shadow-sm transition-colors`}
        title="Fit to content"
        type="button"
      >
        <AllSidesIcon className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  )
}
