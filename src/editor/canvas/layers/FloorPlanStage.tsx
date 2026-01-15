import { useCallback, useEffect, useRef, useState } from 'react'

import { GridLayer } from '@/editor/canvas/layers/GridLayer'
import { SelectionOverlay } from '@/editor/canvas/layers/SelectionOverlay'
import { stageReference } from '@/editor/canvas/services/StageReference'
import { EditorSvgPatterns } from '@/editor/canvas/utils/patterns'
import { usePointerPositionActions } from '@/editor/hooks/usePointerPosition'
import { usePanX, usePanY, useViewportActions, useZoom } from '@/editor/hooks/useViewportStore'
import { useToolCursor } from '@/editor/tools/system'
import { useSvgEventDispatcher } from '@/editor/tools/system/events/SvgEventDispatcher'
import { handleCanvasEvent } from '@/editor/tools/system/store'
import type { CanvasEvent } from '@/editor/tools/system/types'

import { FloorLayer } from './FloorLayer'
import { PerimeterLayer } from './PerimeterLayer'
import { PlanImageLayer } from './PlanImageLayer'
import { RoofLayer } from './RoofLayer'
import { SvgToolOverlayLayerStub } from './ToolOverlayLayerStub'

interface FloorPlanStageProps {
  width: number
  height: number
}

const ZOOM_SCALE = 1.1

export function FloorPlanStage({ width, height }: FloorPlanStageProps): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const zoom = useZoom()
  const panX = usePanX()
  const panY = usePanY()
  const { setStageDimensions, zoomBy, panBy, setPan, stageToWorld } = useViewportActions()
  const pointerActions = usePointerPositionActions()
  const cursor = useToolCursor()

  // Local state for panning (non-tool related)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)

  // Touch state for mobile gestures
  const [touches, setTouches] = useState<React.Touch[]>([])

  // Update stage dimensions in the store when they change
  useEffect(() => {
    setStageDimensions(width, height)
  }, [width, height, setStageDimensions])

  // Set global SVG reference when ready
  useEffect(() => {
    if (svgRef.current) {
      stageReference.setSvg(svgRef.current)
    }

    return () => {
      // Clean up SVG reference on unmount
      stageReference.clearStage()
    }
  }, [])

  // Apply cursor style to SVG container
  useEffect(() => {
    if (svgRef.current) {
      svgRef.current.style.cursor = cursor
    }
  }, [cursor])

  // Tool event handler
  const handleToolEvent = useCallback((canvasEvent: CanvasEvent) => {
    return handleCanvasEvent(canvasEvent)
  }, [])

  // Event dispatcher for routing events to tools
  const eventDispatcher = useSvgEventDispatcher(svgRef, handleToolEvent)

  // Convert screen coordinates to SVG viewBox coordinates
  const screenToSVG = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!svgRef.current) return null

    const pt = svgRef.current.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svgRef.current.getScreenCTM()
    if (!ctm) return null

    const transformed = pt.matrixTransform(ctm.inverse())
    return { x: transformed.x, y: transformed.y }
  }, [])

  // Handle wheel events (zoom)
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()

      const svgCoords = screenToSVG(e.clientX, e.clientY)
      if (!svgCoords) return

      const zoomFactor = e.deltaY > 0 ? 1 / ZOOM_SCALE : ZOOM_SCALE
      const newZoom = zoomBy(zoomFactor)
      const zoomRatio = newZoom / zoom

      // Zoom toward mouse position
      const newPanX = svgCoords.x - (svgCoords.x - panX) * zoomRatio
      const newPanY = svgCoords.y - (svgCoords.y - panY) * zoomRatio

      setPan(newPanX, newPanY)
    },
    [zoom, panX, panY, zoomBy, setPan, screenToSVG]
  )

  // Attach wheel listener with passive: false to allow preventDefault
  useEffect(() => {
    if (!svgRef.current) return

    const svg = svgRef.current
    svg.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      svg.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Handle pointer down events
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const svgCoords = screenToSVG(e.clientX, e.clientY)
      if (!svgCoords) return

      pointerActions.setPosition(svgCoords, stageToWorld(svgCoords))

      // Handle panning (middle pointer or shift+left click)
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        setDragStart(svgCoords)
        return
      }

      // Route to tool system
      eventDispatcher.handlePointerDown(e)
    },
    [setDragStart, eventDispatcher, pointerActions, stageToWorld, screenToSVG]
  )

  // Handle pointer move events
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const svgCoords = screenToSVG(e.clientX, e.clientY)
      if (!svgCoords) return

      pointerActions.setPosition(svgCoords, stageToWorld(svgCoords))

      // Handle panning
      if (dragStart != null && (e.buttons === 4 || (e.buttons === 1 && e.shiftKey))) {
        const deltaX = svgCoords.x - dragStart.x
        const deltaY = svgCoords.y - dragStart.y

        panBy(deltaX, deltaY)
        setDragStart(svgCoords)
        return
      }

      // Route to tool system
      eventDispatcher.handlePointerMove(e)
    },
    [dragStart, eventDispatcher, pointerActions, stageToWorld, panBy, setDragStart, screenToSVG]
  )

  // Handle pointer up events
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const svgCoords = screenToSVG(e.clientX, e.clientY)
      if (svgCoords) {
        pointerActions.setPosition(svgCoords, stageToWorld(svgCoords))
      }

      // End panning
      if (dragStart != null) {
        setDragStart(null)
        return
      }

      // Route to tool system
      eventDispatcher.handlePointerUp(e)
    },
    [dragStart, eventDispatcher, pointerActions, stageToWorld, setDragStart, screenToSVG]
  )

  const handlePointerLeave = useCallback(() => {
    pointerActions.clear()
  }, [pointerActions])

  // Handle touch start events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      pointerActions.clear()
      setTouches(Array.from(e.touches))
    },
    [pointerActions]
  )

  // Handle touch move events
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

        if (prevCoords && currCoords) {
          const deltaX = currCoords.x - prevCoords.x
          const deltaY = currCoords.y - prevCoords.y
          panBy(deltaX, deltaY)
        }
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
          if (centerCoords) {
            const newZoom = zoomBy(zoomFactor)
            const zoomRatio = newZoom / zoom

            // Zoom toward touch center
            const newPanX = centerCoords.x - (centerCoords.x - panX) * zoomRatio
            const newPanY = centerCoords.y - (centerCoords.y - panY) * zoomRatio

            setPan(newPanX, newPanY)
          }
        }
      }

      setTouches(currentTouches)
    },
    [touches, zoom, panX, panY, zoomBy, panBy, setPan, screenToSVG]
  )

  // Handle touch end events
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      setTouches([])
      pointerActions.clear()
    },
    [pointerActions]
  )

  return (
    <div data-testid="svg-canvas">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="touch-none"
        preserveAspectRatio="none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <defs>
          <EditorSvgPatterns />
        </defs>
        <g transform={`translate(${panX}, ${panY}) scale(${zoom}, ${-zoom})`}>
          <GridLayer width={width} height={height} viewport={{ zoom, panX, panY }} />
          <PlanImageLayer placement="under" />
          <FloorLayer />
          <PerimeterLayer />
          <RoofLayer />
          <PlanImageLayer placement="over" />
          <SelectionOverlay />
          <SvgToolOverlayLayerStub />
        </g>
      </svg>
    </div>
  )
}
