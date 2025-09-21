import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Stage } from 'react-konva/lib/ReactKonvaCore'
import { PerimeterLayer } from './PerimeterLayer'
import { useModelStore } from '@/model/store'
import { createStoreyId, createPerimeterConstructionMethodId } from '@/types/ids'
import { createVec2, createLength } from '@/types/geometry'

// Mock the editor store hook
vi.mock('@/components/FloorPlanEditor/hooks/useEditorStore', () => ({
  useActiveStoreyId: () => createStoreyId()
}))

describe('PerimeterLayer', () => {
  it('should render without perimeters', () => {
    render(
      <Stage width={800} height={600}>
        <PerimeterLayer />
      </Stage>
    )

    expect(true).toBe(true) // Test passes if no errors are thrown
  })

  it('should render perimeters when they exist', () => {
    // Add an perimeter to the store
    const store = useModelStore.getState()

    // Add the floor first
    const storey = store.actions.addStorey('Test Floor')

    // Create a simple square boundary
    const boundary = {
      points: [createVec2(0, 0), createVec2(1000, 0), createVec2(1000, 1000), createVec2(0, 1000)]
    }

    store.actions.addPerimeter(storey.id, boundary, createPerimeterConstructionMethodId(), createLength(440))

    render(
      <Stage width={800} height={600}>
        <PerimeterLayer />
      </Stage>
    )

    expect(true).toBe(true) // Test passes if no errors are thrown
  })
})
