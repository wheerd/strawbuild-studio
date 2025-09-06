import type Konva from 'konva'
import type { CanvasEvent, ToolContext } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { createVec2 } from '@/types/geometry'

export class CanvasEventDispatcher {
  private toolContext: ToolContext
  private handleToolEvent: (event: CanvasEvent) => boolean

  constructor(toolContext: ToolContext, handleToolEvent: (event: CanvasEvent) => boolean) {
    this.toolContext = toolContext
    this.handleToolEvent = handleToolEvent
  }

  // Convert Konva mouse event to our CanvasEvent format
  private createCanvasEvent(
    type: 'mousedown' | 'mousemove' | 'mouseup',
    konvaEvent: Konva.KonvaEventObject<MouseEvent>
  ): CanvasEvent {
    const stage = konvaEvent.target.getStage()
    const pointer = stage?.getPointerPosition()

    if (!pointer) {
      throw new Error('Unable to get pointer position from Konva event')
    }

    // Konva's getPointerPosition() gives coordinates relative to the stage canvas
    // Convert to world coordinates by accounting for stage transform
    const stageCoordinates = this.toolContext.getStageCoordinates(pointer)

    return {
      type,
      originalEvent: konvaEvent.evt,
      konvaEvent,
      stageCoordinates,
      pointerCoordinates: pointer, // Original pointer coordinates for hit testing
      target: konvaEvent.target,
      context: this.toolContext
    }
  }

  // Convert keyboard event to our CanvasEvent format
  private createKeyboardCanvasEvent(type: 'keydown' | 'keyup', keyboardEvent: KeyboardEvent): CanvasEvent {
    return {
      type,
      originalEvent: keyboardEvent,
      konvaEvent: null as any, // Not applicable for keyboard events
      stageCoordinates: createVec2(0, 0), // Not applicable for keyboard events
      pointerCoordinates: undefined, // Not applicable for keyboard events
      target: null,
      context: this.toolContext
    }
  }

  // Handle mouse down events
  handleMouseDown(konvaEvent: Konva.KonvaEventObject<MouseEvent>): boolean {
    try {
      const canvasEvent = this.createCanvasEvent('mousedown', konvaEvent)
      return this.handleToolEvent(canvasEvent)
    } catch (error) {
      console.error('Error handling mouse down event:', error)
      return false
    }
  }

  // Handle mouse move events
  handleMouseMove(konvaEvent: Konva.KonvaEventObject<MouseEvent>): boolean {
    try {
      const canvasEvent = this.createCanvasEvent('mousemove', konvaEvent)
      return this.handleToolEvent(canvasEvent)
    } catch (error) {
      console.error('Error handling mouse move event:', error)
      return false
    }
  }

  // Handle mouse up events
  handleMouseUp(konvaEvent: Konva.KonvaEventObject<MouseEvent>): boolean {
    try {
      const canvasEvent = this.createCanvasEvent('mouseup', konvaEvent)
      return this.handleToolEvent(canvasEvent)
    } catch (error) {
      console.error('Error handling mouse up event:', error)
      return false
    }
  }

  // Handle wheel events (for zoom)
  handleWheel(_konvaEvent: Konva.KonvaEventObject<WheelEvent>): boolean {
    // Most wheel events should be handled by the default zoom behavior
    // Tools typically don't need to handle wheel events
    return false
  }

  // Handle keyboard events
  handleKeyDown(keyboardEvent: KeyboardEvent): boolean {
    try {
      const canvasEvent = this.createKeyboardCanvasEvent('keydown', keyboardEvent)
      return this.handleToolEvent(canvasEvent)
    } catch (error) {
      console.error('Error handling key down event:', error)
      return false
    }
  }

  // Handle key up events
  handleKeyUp(keyboardEvent: KeyboardEvent): boolean {
    try {
      const canvasEvent = this.createKeyboardCanvasEvent('keyup', keyboardEvent)
      return this.handleToolEvent(canvasEvent)
    } catch (error) {
      console.error('Error handling key up event:', error)
      return false
    }
  }

  // Update tool context reference
  updateToolContext(toolContext: ToolContext): void {
    this.toolContext = toolContext
  }
}

// Hook to create and manage the event dispatcher
export function useCanvasEventDispatcher(
  toolContext: ToolContext,
  handleToolEvent: (event: CanvasEvent) => boolean
): CanvasEventDispatcher {
  // Create dispatcher instance
  // In a real implementation, this would use useMemo to avoid recreating on every render
  const dispatcher = new CanvasEventDispatcher(toolContext, handleToolEvent)

  return dispatcher
}
