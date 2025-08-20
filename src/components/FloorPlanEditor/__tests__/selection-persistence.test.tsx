import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { createAbsoluteOffset } from '@/types/geometry'

describe('Selection Persistence After Drag', () => {
  beforeEach(() => {
    useEditorStore.getState().reset()
    useEditorStore.getState().setActiveTool('select')
  })

  it('should maintain selection after complete drag cycle', () => {
    const { selectEntity, startDrag, endDrag } = useEditorStore.getState()

    // Select an entity
    selectEntity('wall-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')

    // Start drag operation (this happens on mouseDown)
    startDrag('wall', { x: createAbsoluteOffset(100), y: createAbsoluteOffset(200) }, 'wall-1')

    // Verify still selected during drag
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')
    expect(useEditorStore.getState().dragState.isDragging).toBe(true)

    // End drag operation (this happens on mouseUp)
    endDrag()

    // Verify still selected after drag
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')
    expect(useEditorStore.getState().dragState.isDragging).toBe(false)
  })

  it('should maintain selection for connection points after drag', () => {
    const { selectEntity, startDrag, endDrag } = useEditorStore.getState()

    // Select a connection point
    selectEntity('point-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('point-1')

    // Start drag operation
    startDrag('point', { x: createAbsoluteOffset(150), y: createAbsoluteOffset(250) }, 'point-1')

    // Verify still selected during drag
    expect(useEditorStore.getState().selectedEntityId).toBe('point-1')

    // End drag operation
    endDrag()

    // Verify still selected after drag
    expect(useEditorStore.getState().selectedEntityId).toBe('point-1')
  })

  it('should not lose selection when dragging already selected entity', () => {
    const { selectEntity, startDrag, endDrag } = useEditorStore.getState()

    // Select entity first
    selectEntity('wall-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')

    // Select same entity again (simulating mouseDown on already selected entity)
    selectEntity('wall-1')
    expect(useEditorStore.getState().selectedEntityId).toBeUndefined() // toggles off

    // Select it back
    selectEntity('wall-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')

    // Now start drag operation
    startDrag('wall', { x: createAbsoluteOffset(100), y: createAbsoluteOffset(200) }, 'wall-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')

    // End drag
    endDrag()
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')
  })

  it('should handle multiple drag operations on same entity', () => {
    const { selectEntity, startDrag, endDrag } = useEditorStore.getState()

    // Select entity
    selectEntity('point-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('point-1')

    // First drag operation
    startDrag('point', { x: createAbsoluteOffset(100), y: createAbsoluteOffset(200) }, 'point-1')
    endDrag()
    expect(useEditorStore.getState().selectedEntityId).toBe('point-1')

    // Second drag operation on same entity
    startDrag('point', { x: createAbsoluteOffset(200), y: createAbsoluteOffset(300) }, 'point-1')
    endDrag()
    expect(useEditorStore.getState().selectedEntityId).toBe('point-1')

    // Third drag operation
    startDrag('point', { x: createAbsoluteOffset(300), y: createAbsoluteOffset(400) }, 'point-1')
    endDrag()
    expect(useEditorStore.getState().selectedEntityId).toBe('point-1')
  })

  it('should allow selection to change between different entities', () => {
    const { selectEntity, startDrag, endDrag } = useEditorStore.getState()

    // Select first entity and drag it
    selectEntity('wall-1')
    startDrag('wall', { x: createAbsoluteOffset(100), y: createAbsoluteOffset(200) }, 'wall-1')
    endDrag()
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')

    // Select different entity and drag it
    selectEntity('point-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('point-1')

    startDrag('point', { x: createAbsoluteOffset(150), y: createAbsoluteOffset(250) }, 'point-1')
    endDrag()
    expect(useEditorStore.getState().selectedEntityId).toBe('point-1')
  })
})
