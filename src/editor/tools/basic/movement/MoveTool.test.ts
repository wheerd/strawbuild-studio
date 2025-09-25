import { describe, expect, it, vi } from 'vitest'

import type { CanvasEvent } from '@/editor/tools/system/types'

import { MoveTool } from './MoveTool'

describe('MoveTool', () => {
  const createMockKeydownEvent = (key: string): CanvasEvent => ({
    type: 'keydown',
    originalEvent: new KeyboardEvent('keydown', { key }),
    konvaEvent: {} as any,
    stageCoordinates: [0, 0],
    context: {} as any
  })

  it('should handle escape key to cancel movement when waiting for movement', () => {
    const tool = new MoveTool()
    const mockTriggerRender = vi.spyOn(tool as any, 'triggerRender')

    // Manually set tool state to waiting for movement (simulating pointerdown)
    ;(tool as any).toolState.isWaitingForMovement = true
    ;(tool as any).toolState.downPosition = [100, 100]
    ;(tool as any).toolState.behavior = { mockBehavior: true }

    // Press escape key
    const escapeEvent = createMockKeydownEvent('Escape')
    const handled = tool.handleKeyDown(escapeEvent)

    // Verify escape key was handled and state was reset
    expect(handled).toBe(true)
    expect((tool as any).toolState.isWaitingForMovement).toBe(false)
    expect((tool as any).toolState.behavior).toBe(null)
    expect(mockTriggerRender).toHaveBeenCalled()
  })

  it('should handle escape key to cancel movement when actively moving', () => {
    const tool = new MoveTool()
    const mockTriggerRender = vi.spyOn(tool as any, 'triggerRender')

    // Manually set tool state to moving (simulating active movement)
    ;(tool as any).toolState = {
      isWaitingForMovement: false,
      downPosition: null,
      isMoving: true,
      behavior: { initializeState: vi.fn() },
      context: {},
      pointerState: { startPosition: [100, 100], currentPosition: [100, 100], delta: [0, 0] },
      currentMovementState: {},
      isValid: true
    }

    // Press escape key
    const escapeEvent = createMockKeydownEvent('Escape')
    const handled = tool.handleKeyDown(escapeEvent)

    // Verify escape key was handled and state was reset
    expect(handled).toBe(true)
    expect((tool as any).toolState.isMoving).toBe(false)
    expect((tool as any).toolState.behavior).toBe(null)
    expect(mockTriggerRender).toHaveBeenCalled()
  })

  it('should not handle escape key when not moving', () => {
    const tool = new MoveTool()
    const mockTriggerRender = vi.spyOn(tool as any, 'triggerRender')

    // Press escape key without any movement state
    const escapeEvent = createMockKeydownEvent('Escape')
    const handled = tool.handleKeyDown(escapeEvent)

    // Verify escape key was not handled
    expect(handled).toBe(false)
    expect(mockTriggerRender).not.toHaveBeenCalled()
  })

  it('should not handle non-escape keys', () => {
    const tool = new MoveTool()

    // Manually set tool state to moving
    ;(tool as any).toolState.isMoving = true

    // Press a non-escape key
    const otherKeyEvent = createMockKeydownEvent('a')
    const handled = tool.handleKeyDown(otherKeyEvent)

    // Verify other keys are not handled
    expect(handled).toBe(false)
    expect((tool as any).toolState.isMoving).toBe(true) // State should remain unchanged
  })
})
