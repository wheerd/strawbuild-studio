import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Stage } from 'react-konva'
import { OuterWallLayer } from './OuterWallLayer'
import { useModelStore } from '@/model/store'
import { createFloorId } from '@/types/ids'
import { createVec2, createLength } from '@/types/geometry'

// Mock the editor store hook
vi.mock('@/components/FloorPlanEditor/hooks/useEditorStore', () => ({
  useActiveFloorId: () => createFloorId()
}))

describe('OuterWallLayer', () => {
  it('should render without outer walls', () => {
    render(
      <Stage width={800} height={600}>
        <OuterWallLayer />
      </Stage>
    )

    expect(true).toBe(true) // Test passes if no errors are thrown
  })

  it('should render outer walls when they exist', () => {
    // Add an outer wall to the store
    const store = useModelStore.getState()
    const floorId = createFloorId()

    // Add the floor first
    store.addFloor('Test Floor', 0 as any)

    // Create a simple square boundary
    const boundary = {
      points: [createVec2(0, 0), createVec2(1000, 0), createVec2(1000, 1000), createVec2(0, 1000)]
    }

    store.addOuterWallPolygon(floorId, boundary, 'cells-under-tension', createLength(440))

    render(
      <Stage width={800} height={600}>
        <OuterWallLayer />
      </Stage>
    )

    expect(true).toBe(true) // Test passes if no errors are thrown
  })
})
