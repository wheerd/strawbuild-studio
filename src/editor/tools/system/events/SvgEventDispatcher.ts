import { useMemo, type RefObject } from 'react'

import { viewportActions } from '@/editor/hooks/useViewportStore'
import { newVec2, type Vec2 } from '@/shared/geometry'
import type { CanvasEvent } from '@/editor/tools/system/types'

export class SvgEventDispatcher {
  private svgRef: RefObject<SVGSVGElement | null>
  private handleToolEvent: (event: CanvasEvent) => boolean

  constructor(svgRef: RefObject<SVGSVGElement | null>, handleToolEvent: (event: CanvasEvent) => boolean) {
    this.svgRef = svgRef
    this.handleToolEvent = handleToolEvent
  }

  // Convert screen coordinates to SVG viewBox coordinates
  private screenToSVG(clientX: number, clientY: number): Vec2 | null {
    if (!this.svgRef.current) return null

    const pt = this.svgRef.current.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = this.svgRef.current.getScreenCTM()
    if (!ctm) return null

    const transformed = pt.matrixTransform(ctm.inverse())
    return newVec2(transformed.x, transformed.y)
  }

  // Convert SVG pointer event to our CanvasEvent format
  private createCanvasEvent(
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    nativeEvent: React.PointerEvent
  ): CanvasEvent {
    const clientCoords = { x: nativeEvent.clientX, y: nativeEvent.clientY }
    const svgCoords = this.screenToSVG(clientCoords.x, clientCoords.y)

    if (!svgCoords) {
      throw new Error('Unable to convert screen coordinates to SVG coordinates')
    }

    // Convert from SVG viewBox coordinates to world coordinates
    const worldCoords = viewportActions().stageToWorld({
      x: svgCoords[0],
      y: svgCoords[1]
    })

    return {
      type,
      originalEvent: nativeEvent.nativeEvent,
      svgEvent: nativeEvent,
      stageCoordinates: worldCoords,
      pointerCoordinates: { x: svgCoords[0], y: svgCoords[1] }
    }
  }

  // Handle pointer down events
  handlePointerDown(nativeEvent: React.PointerEvent): boolean {
    try {
      const canvasEvent = this.createCanvasEvent('pointerdown', nativeEvent)
      return this.handleToolEvent(canvasEvent)
    } catch (error) {
      console.error('Error handling pointer down event:', error)
      return false
    }
  }

  // Handle pointer move events
  handlePointerMove(nativeEvent: React.PointerEvent): boolean {
    try {
      const canvasEvent = this.createCanvasEvent('pointermove', nativeEvent)
      return this.handleToolEvent(canvasEvent)
    } catch (error) {
      console.error('Error handling pointer move event:', error)
      return false
    }
  }

  // Handle pointer up events
  handlePointerUp(nativeEvent: React.PointerEvent): boolean {
    try {
      const canvasEvent = this.createCanvasEvent('pointerup', nativeEvent)
      return this.handleToolEvent(canvasEvent)
    } catch (error) {
      console.error('Error handling pointer up event:', error)
      return false
    }
  }
}

// Hook to create and manage the event dispatcher
export function useSvgEventDispatcher(
  svgRef: RefObject<SVGSVGElement | null>,
  handleToolEvent: (event: CanvasEvent) => boolean
): SvgEventDispatcher {
  return useMemo(() => new SvgEventDispatcher(svgRef, handleToolEvent), [svgRef, handleToolEvent])
}
