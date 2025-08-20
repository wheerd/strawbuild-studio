import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'

describe('Drag to Select', () => {
  beforeEach(() => {
    useEditorStore.getState().reset()
  })

  it('should test drag-to-select integration by manually calling the handlers', () => {
    const { selectEntity, startDrag } = useEditorStore.getState()

    // Set to select mode (not wall mode)
    useEditorStore.getState().setActiveTool('select')

    // Simulate starting to drag by selecting an entity (this is what mouseDown does)
    selectEntity('point-1')

    // Verify the point was selected
    expect(useEditorStore.getState().selectedEntityId).toBe('point-1')

    // Simulate starting drag operation
    startDrag('point', { x: 100, y: 200 }, 'point-1')

    // Verify drag state is set
    const dragState = useEditorStore.getState().dragState
    expect(dragState.isDragging).toBe(true)
    expect(dragState.dragType).toBe('point')
    expect(dragState.dragEntityId).toBe('point-1')
  })

  it('should select different entity when starting new drag', () => {
    const { selectEntity } = useEditorStore.getState()

    // Start with one entity selected
    selectEntity('wall-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')

    // Start dragging different entity (simulates mouseDown on different entity)
    selectEntity('point-1')

    // Should replace selection
    expect(useEditorStore.getState().selectedEntityId).toBe('point-1')
  })

  it('should not modify selection when in wall mode', () => {
    useEditorStore.getState().setActiveTool('wall')

    // In wall mode, drag behavior should not select entities
    // This would be handled by the wall creation logic instead
    expect(useEditorStore.getState().selectedEntityId).toBeUndefined()

    // The wall mode behavior is tested in wall-creation.test.tsx
  })

  it('should maintain selection when switching between tools', () => {
    const { selectEntity, setActiveTool } = useEditorStore.getState()

    // Select an entity
    selectEntity('wall-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')

    // Switch to wall tool (selection should persist)
    setActiveTool('wall')
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')

    // Switch back to select tool (selection should still persist)
    setActiveTool('select')
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')
  })

  it('should verify drag state management', () => {
    const { startDrag, endDrag } = useEditorStore.getState()

    // Initially not dragging
    expect(useEditorStore.getState().dragState.isDragging).toBe(false)

    // Start drag
    startDrag('wall', { x: 100, y: 200 }, 'wall-1')
    let dragState = useEditorStore.getState().dragState
    expect(dragState.isDragging).toBe(true)
    expect(dragState.dragType).toBe('wall')
    expect(dragState.dragEntityId).toBe('wall-1')

    // End drag
    endDrag()
    dragState = useEditorStore.getState().dragState
    expect(dragState.isDragging).toBe(false)
  })
})
