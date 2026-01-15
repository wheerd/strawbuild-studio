import { useCallback, useEffect, useRef, useState } from 'react'

import { usePointerPositionActions } from '@/editor/hooks/usePointerPosition'
import { usePanX, usePanY, useViewportActions, useZoom } from '@/editor/hooks/useViewportStore'
import { GridLayer } from '@/editor/layers/GridLayer'
import { SelectionOverlay } from '@/editor/layers/SelectionOverlay'
import { ToolOverlayLayer } from '@/editor/layers/ToolOverlayLayer'
import { useToolCursor } from '@/editor/tools/system'
import { useSvgMouseTransform } from '@/editor/tools/system/hooks/useSvgMouseTransform'
import { handleEditorEvent } from '@/editor/tools/system/store'
import { EditorSvgPatterns } from '@/editor/utils/patterns'
import type { Vec2 } from '@/shared/geometry'

import { FloorLayer } from './FloorLayer'
import { PerimeterLayer } from './PerimeterLayer'
import { PlanImageLayer } from './PlanImageLayer'
import { RoofLayer } from './RoofLayer'

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
  const [dragStart, setDragStart] = useState<Vec2 | null>(null)

  // Touch state for mobile gestures
  const [touches, setTouches] = useState<React.Touch[]>([])

  // Update stage dimensions in the store when they change
  useEffect(() => {
    setStageDimensions(width, height)
  }, [width, height, setStageDimensions])

  // Apply cursor style to SVG container
  useEffect(() => {
    if (svgRef.current) {
      svgRef.current.style.cursor = cursor
    }
  }, [cursor])

  // Event dispatcher for routing events to tools
  const mouseTransform = useSvgMouseTransform(svgRef)

  // Handle wheel events (zoom)
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()

      const svgCoords = mouseTransform(e)

      const zoomFactor = e.deltaY > 0 ? 1 / ZOOM_SCALE : ZOOM_SCALE
      const newZoom = zoomBy(zoomFactor)
      const zoomRatio = newZoom / zoom

      // Zoom toward mouse position
      const newPanX = svgCoords[0] - (svgCoords[0] - panX) * zoomRatio
      const newPanY = svgCoords[1] - (svgCoords[1] - panY) * zoomRatio

      setPan(newPanX, newPanY)
    },
    [zoom, panX, panY, zoomBy, setPan, mouseTransform]
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
      const svgCoords = mouseTransform(e)
      const worldCoords = stageToWorld(svgCoords)

      pointerActions.setPosition(svgCoords, worldCoords)

      // Handle panning (middle pointer or shift+left click)
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        setDragStart(svgCoords)
        return
      }

      // Route to tool system
      handleEditorEvent({
        type: 'pointerdown',
        originalEvent: e.nativeEvent,
        stageCoordinates: svgCoords,
        worldCoordinates: worldCoords
      })
    },
    [setDragStart, pointerActions, stageToWorld, mouseTransform]
  )

  // Handle pointer move events
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const svgCoords = mouseTransform(e)
      const worldCoords = stageToWorld(svgCoords)

      pointerActions.setPosition(svgCoords, worldCoords)

      // Handle panning
      if (dragStart != null && (e.buttons === 4 || (e.buttons === 1 && e.shiftKey))) {
        const deltaX = svgCoords[0] - dragStart[0]
        const deltaY = svgCoords[1] - dragStart[1]

        panBy(deltaX, deltaY)
        setDragStart(svgCoords)
        return
      }

      // Route to tool system
      handleEditorEvent({
        type: 'pointermove',
        originalEvent: e.nativeEvent,
        stageCoordinates: svgCoords,
        worldCoordinates: worldCoords
      })
    },
    [dragStart, pointerActions, stageToWorld, panBy, setDragStart, mouseTransform]
  )

  // Handle pointer up events
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const svgCoords = mouseTransform(e)
      const worldCoords = stageToWorld(svgCoords)

      pointerActions.setPosition(svgCoords, worldCoords)

      // End panning
      if (dragStart != null) {
        setDragStart(null)
        return
      }

      // Route to tool system
      handleEditorEvent({
        type: 'pointerup',
        originalEvent: e.nativeEvent,
        stageCoordinates: svgCoords,
        worldCoordinates: worldCoords
      })
    },
    [dragStart, pointerActions, stageToWorld, setDragStart, mouseTransform]
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

        const prevCoords = mouseTransform(prevTouch)
        const currCoords = mouseTransform(currentTouch)

        const deltaX = currCoords[0] - prevCoords[0]
        const deltaY = currCoords[1] - prevCoords[1]
        panBy(deltaX, deltaY)
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

          const centerCoords = mouseTransform({ clientX: centerX, clientY: centerY })
          const newZoom = zoomBy(zoomFactor)
          const zoomRatio = newZoom / zoom

          // Zoom toward touch center
          const newPanX = centerCoords[0] - (centerCoords[0] - panX) * zoomRatio
          const newPanY = centerCoords[1] - (centerCoords[1] - panY) * zoomRatio

          setPan(newPanX, newPanY)
        }
      }

      setTouches(currentTouches)
    },
    [touches, zoom, panX, panY, zoomBy, panBy, setPan, mouseTransform]
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
    <div data-testid="editor-svg">
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
          <ToolOverlayLayer />
        </g>
      </svg>
    </div>
  )
}
