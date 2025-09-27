import type Konva from 'konva'

import { viewportActions } from '@/editor/hooks/useViewportStore'
import type { CanvasEvent } from '@/editor/tools/system/types'

export class CanvasEventDispatcher {
  private handleToolEvent: (event: CanvasEvent) => boolean

  constructor(handleToolEvent: (event: CanvasEvent) => boolean) {
    this.handleToolEvent = handleToolEvent
  }

  // Convert Konva pointer event to our CanvasEvent format
  private createCanvasEvent(
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    konvaEvent: Konva.KonvaEventObject<PointerEvent>
  ): CanvasEvent {
    const stage = konvaEvent.target.getStage()
    const pointer = stage?.getPointerPosition()

    if (!pointer) {
      throw new Error('Unable to get pointer position from Konva event')
    }

    // Konva's getPointerPosition() gives coordinates relative to the stage canvas
    // Convert to world coordinates by accounting for stage transform
    const stageCoordinates = viewportActions().stageToWorld(pointer)

    return {
      type,
      originalEvent: konvaEvent.evt,
      konvaEvent,
      stageCoordinates,
      pointerCoordinates: pointer // Original pointer coordinates for hit testing
    }
  }

  // Handle pointer down events
  handlePointerDown(konvaEvent: Konva.KonvaEventObject<PointerEvent>): boolean {
    try {
      const canvasEvent = this.createCanvasEvent('pointerdown', konvaEvent)
      return this.handleToolEvent(canvasEvent)
    } catch (error) {
      console.error('Error handling pointer down event:', error)
      return false
    }
  }

  // Handle pointer move events
  handlePointerMove(konvaEvent: Konva.KonvaEventObject<PointerEvent>): boolean {
    try {
      const canvasEvent = this.createCanvasEvent('pointermove', konvaEvent)
      return this.handleToolEvent(canvasEvent)
    } catch (error) {
      console.error('Error handling pointer move event:', error)
      return false
    }
  }

  // Handle pointer up events
  handlePointerUp(konvaEvent: Konva.KonvaEventObject<PointerEvent>): boolean {
    try {
      const canvasEvent = this.createCanvasEvent('pointerup', konvaEvent)
      return this.handleToolEvent(canvasEvent)
    } catch (error) {
      console.error('Error handling pointer up event:', error)
      return false
    }
  }

  // Handle wheel events (for zoom)
  handleWheel(_konvaEvent: Konva.KonvaEventObject<WheelEvent>): boolean {
    // Most wheel events should be handled by the default zoom behavior
    // Tools typically don't need to handle wheel events
    return false
  }
}

// Hook to create and manage the event dispatcher
export function useCanvasEventDispatcher(handleToolEvent: (event: CanvasEvent) => boolean): CanvasEventDispatcher {
  // Create dispatcher instance
  // In a real implementation, this would use useMemo to avoid recreating on every render
  const dispatcher = new CanvasEventDispatcher(handleToolEvent)

  return dispatcher
}
