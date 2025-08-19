import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { SelectionLayer } from '../Canvas/SelectionLayer'
import { useEditorStore } from '../hooks/useEditorStore'

// Mock Konva components
vi.mock('react-konva', () => ({
  Layer: ({ children, name }: any) => <div data-testid={name}>{children}</div>,
  Circle: ({ x, y, radius }: any) => <div data-testid="snap-preview-circle" data-x={x} data-y={y} data-radius={radius} />
}))

describe('Snap Preview Visibility', () => {
  beforeEach(() => {
    useEditorStore.getState().reset()
  })

  it('should show snap preview circle when wall tool is active', () => {
    // Set up wall tool with snap preview
    useEditorStore.getState().setActiveTool('wall')
    useEditorStore.getState().setSnapPreview({ x: 100, y: 200 })

    const { queryByTestId } = render(<SelectionLayer />)
    
    // Should show the snap preview circle
    const circle = queryByTestId('snap-preview-circle')
    expect(circle).toBeTruthy()
    expect(circle?.getAttribute('data-x')).toBe('100')
    expect(circle?.getAttribute('data-y')).toBe('200')
  })

  it('should hide snap preview circle when select tool is active', () => {
    // Set up select tool with snap preview (should not show)
    useEditorStore.getState().setActiveTool('select')
    useEditorStore.getState().setSnapPreview({ x: 100, y: 200 })

    const { queryByTestId } = render(<SelectionLayer />)
    
    // Should not show the snap preview circle
    const circle = queryByTestId('snap-preview-circle')
    expect(circle).toBeFalsy()
  })

  it('should hide snap preview circle when room tool is active', () => {
    // Set up room tool with snap preview (should not show)
    useEditorStore.getState().setActiveTool('room')
    useEditorStore.getState().setSnapPreview({ x: 100, y: 200 })

    const { queryByTestId } = render(<SelectionLayer />)
    
    // Should not show the snap preview circle
    const circle = queryByTestId('snap-preview-circle')
    expect(circle).toBeFalsy()
  })

  it('should clear snap preview when switching away from wall tool', () => {
    // Start with wall tool and snap preview
    useEditorStore.getState().setActiveTool('wall')
    useEditorStore.getState().setSnapPreview({ x: 100, y: 200 })

    // Verify snap preview is set
    expect(useEditorStore.getState().showSnapPreview).toBe(true)
    expect(useEditorStore.getState().snapPreviewPoint).toEqual({ x: 100, y: 200 })

    // Switch to select tool
    useEditorStore.getState().setActiveTool('select')

    // Verify snap preview is cleared
    expect(useEditorStore.getState().showSnapPreview).toBe(false)
    expect(useEditorStore.getState().snapPreviewPoint).toBeUndefined()
  })
})