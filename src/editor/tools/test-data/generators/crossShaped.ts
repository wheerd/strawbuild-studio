import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config/store'
import { getSelectionActions } from '@/editor/hooks/useSelectionStore'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { Bounds2D, newVec2, polygonIsClockwise } from '@/shared/geometry'

import { type DoorSpec, type WindowSpec, addDoors, addWindows } from './openings'

/**
 * Creates a complex T-shaped (cross-shaped) perimeter with extensive openings
 * This demonstrates various window types and door placement
 */
export function createCrossShapedPerimeter(): void {
  const modelStore = getModelActions()
  const activeStoreyId = modelStore.getActiveStoreyId()

  // Create a T-shaped perimeter (realistic building scale)
  let points = [
    newVec2(2000, 12000), // Top-left of vertical bar
    newVec2(8000, 12000), // Top-right of vertical bar
    newVec2(8000, 8000), // Inner corner (right of horizontal bar)
    newVec2(15000, 8000), // Top-right of horizontal bar
    newVec2(15000, 3000), // Bottom-right of horizontal bar
    newVec2(8000, 3000), // Inner corner (right of vertical bar)
    newVec2(8000, 1000), // Bottom-right of vertical bar
    newVec2(2000, 1000), // Bottom-left of vertical bar
    newVec2(2000, 3000), // Inner corner (left of vertical bar)
    newVec2(500, 3000), // Bottom-left of horizontal bar
    newVec2(500, 8000), // Top-left of horizontal bar
    newVec2(2000, 8000) // Inner corner (left of horizontal bar)
  ]

  // Ensure clockwise order for perimeter creation
  const testPolygon = { points }
  if (!polygonIsClockwise(testPolygon)) {
    points = [...points].reverse()
  }

  const boundary = { points }

  try {
    // Get default assemblies from config store
    const configStore = getConfigActions()
    const defaultBaseId = configStore.getDefaultBaseRingBeamAssemblyId()
    const defaultTopId = configStore.getDefaultTopRingBeamAssemblyId()
    const defaultAssemblyId = configStore.getDefaultWallAssemblyId()
    if (!defaultAssemblyId) {
      console.error('No default wall assembly available')
      return
    }

    // Add the perimeter to the store with default assemblies
    const newPerimeter = modelStore.addPerimeter(
      activeStoreyId,
      boundary,
      defaultAssemblyId,
      420,
      defaultBaseId,
      defaultTopId,
      'inside'
    )

    if (newPerimeter && newPerimeter.wallIds.length > 0) {
      // Add main entrance door
      const doorSpecs: DoorSpec[] = [{ wallIndex: 6, offset: 0.4, width: 900, height: 2100, type: 'main-entrance' }]

      // Add variety of windows: large, small, paired, and singles
      const windowSpecs: WindowSpec[] = [
        // Large windows
        { wallIndex: 0, offset: 0.15, width: 1800, height: 1400, type: 'large' },
        { wallIndex: 0, offset: 0.65, width: 1600, height: 1200, type: 'large' },

        // Paired windows (side by side with small gap)
        { wallIndex: 1, offset: 0.25, width: 800, height: 1000, type: 'paired-left' },
        { wallIndex: 1, offset: 0.35, width: 800, height: 1000, type: 'paired-right' },

        // Small windows
        { wallIndex: 1, offset: 0.7, width: 600, height: 800, type: 'small' },

        // Mix on longer horizontal walls
        { wallIndex: 3, offset: 0.15, width: 1400, height: 1200, type: 'large' },
        { wallIndex: 3, offset: 0.45, width: 1000, height: 1000, type: 'medium' },
        { wallIndex: 3, offset: 0.75, width: 800, height: 900, type: 'small' },

        { wallIndex: 4, offset: 0.15, width: 1200, height: 1200, type: 'medium' },
        // Paired windows on wall 4
        { wallIndex: 4, offset: 0.5, width: 900, height: 1100, type: 'paired-left' },
        { wallIndex: 4, offset: 0.65, width: 900, height: 1100, type: 'paired-right' },

        // Long wall 7 gets multiple varied windows
        { wallIndex: 7, offset: 0.1, width: 700, height: 800, type: 'small' },
        { wallIndex: 7, offset: 0.3, width: 1600, height: 1300, type: 'large' },
        { wallIndex: 7, offset: 0.65, width: 1200, height: 1000, type: 'medium' },
        { wallIndex: 7, offset: 0.85, width: 600, height: 700, type: 'small' },

        // Wall 10 gets paired small windows
        { wallIndex: 10, offset: 0.2, width: 700, height: 900, type: 'paired-left' },
        { wallIndex: 10, offset: 0.3, width: 700, height: 900, type: 'paired-right' },
        { wallIndex: 10, offset: 0.65, width: 1000, height: 1000, type: 'medium' }
      ]

      // Add all openings
      addDoors(newPerimeter, doorSpecs)
      addWindows(newPerimeter, windowSpecs)

      // Focus the view on the newly created test data
      const bounds = Bounds2D.fromPoints(newPerimeter.outerPolygon.points)
      getSelectionActions().replaceSelection([newPerimeter.id])
      viewportActions().fitToView(bounds)
    }
  } catch (error) {
    console.error('❌ Failed to create cross-shaped test data:', error)
  }
}
