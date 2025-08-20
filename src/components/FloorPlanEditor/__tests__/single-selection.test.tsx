import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'

describe('Single Selection', () => {
  beforeEach(() => {
    useEditorStore.getState().reset()
  })

  it('should allow selecting a single entity', () => {
    const { selectEntity, selectedEntityId } = useEditorStore.getState()

    // Initially nothing selected
    expect(selectedEntityId).toBeUndefined()

    // Select an entity
    selectEntity('wall-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')
  })

  it('should deselect entity when clicking the same entity again', () => {
    const { selectEntity } = useEditorStore.getState()

    // Select an entity
    selectEntity('wall-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')

    // Click same entity again - should deselect
    selectEntity('wall-1')
    expect(useEditorStore.getState().selectedEntityId).toBeUndefined()
  })

  it('should replace selection when selecting a different entity', () => {
    const { selectEntity } = useEditorStore.getState()

    // Select first entity
    selectEntity('wall-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')

    // Select different entity - should replace selection
    selectEntity('point-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('point-1')
  })

  it('should clear selection when setSelectedEntity is called with undefined', () => {
    const { selectEntity, setSelectedEntity } = useEditorStore.getState()

    // Select an entity
    selectEntity('wall-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')

    // Clear selection
    setSelectedEntity(undefined)
    expect(useEditorStore.getState().selectedEntityId).toBeUndefined()
  })

  it('should clear selection when clearSelection is called', () => {
    const { selectEntity, clearSelection } = useEditorStore.getState()

    // Select an entity
    selectEntity('room-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('room-1')

    // Clear selection
    clearSelection()
    expect(useEditorStore.getState().selectedEntityId).toBeUndefined()
  })

  it('should clear selection when changing active floor', () => {
    const { selectEntity, setActiveFloor } = useEditorStore.getState()

    // Select an entity
    selectEntity('wall-1')
    expect(useEditorStore.getState().selectedEntityId).toBe('wall-1')

    // Change floor - should clear selection
    setActiveFloor('second-floor' as any)
    expect(useEditorStore.getState().selectedEntityId).toBeUndefined()
  })
})
