import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config/store'
import { getSelectionActions } from '@/editor/hooks/useSelectionStore'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { Bounds2D, newVec2, polygonIsClockwise } from '@/shared/geometry'

import { CommonDoors, CommonWindows, type DoorSpec, type WindowSpec, addDoors, addWindows } from './openings'

/**
 * Creates a rectangular perimeter 8m x 5m
 * Includes strategically placed windows and doors for a typical small building
 */
export function createRectangularPerimeter(): void {
  const modelStore = getModelActions()
  const activeStoreyId = modelStore.getActiveStoreyId()

  // Create a 8000mm x 5000mm rectangle centered at origin
  const width = 8000
  const height = 5000
  const halfWidth = width / 2
  const halfHeight = height / 2

  // Create points and ensure clockwise order
  let points = [
    newVec2(-halfWidth, -halfHeight), // Bottom-left
    newVec2(halfWidth, -halfHeight), // Bottom-right
    newVec2(halfWidth, halfHeight), // Top-right
    newVec2(-halfWidth, halfHeight) // Top-left
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

    if (newPerimeter && newPerimeter.walls.length > 0) {
      // Add main entrance door on the bottom wall and a back door on top wall
      const doorSpecs: DoorSpec[] = [
        {
          wallIndex: 0,
          offset: 0.3,
          width: CommonDoors.standard.width,
          height: CommonDoors.standard.height,
          type: 'main-entrance'
        },
        {
          wallIndex: 2,
          offset: 0.7,
          width: CommonDoors.standard.width,
          height: CommonDoors.standard.height,
          type: 'back-entrance'
        }
      ]

      // Add windows to all walls
      const windowSpecs: WindowSpec[] = [
        // Bottom wall (wall 0) - two small windows flanking the door area
        {
          wallIndex: 0,
          offset: 0.1,
          width: CommonWindows.small.width,
          height: CommonWindows.small.height,
          type: 'small-left'
        },
        {
          wallIndex: 0,
          offset: 0.8,
          width: CommonWindows.small.width,
          height: CommonWindows.small.height,
          type: 'small-right'
        },

        // Right wall (wall 1) - three evenly spaced medium windows
        {
          wallIndex: 1,
          offset: 0.2,
          width: CommonWindows.medium.width,
          height: CommonWindows.medium.height,
          type: 'medium'
        },
        {
          wallIndex: 1,
          offset: 0.5,
          width: CommonWindows.medium.width,
          height: CommonWindows.medium.height,
          type: 'medium'
        },
        {
          wallIndex: 1,
          offset: 0.8,
          width: CommonWindows.medium.width,
          height: CommonWindows.medium.height,
          type: 'medium'
        },

        // Top wall (wall 2) - large window and small window
        {
          wallIndex: 2,
          offset: 0.2,
          width: CommonWindows.large.width,
          height: CommonWindows.large.height,
          type: 'large'
        },
        {
          wallIndex: 2,
          offset: 0.9,
          width: CommonWindows.small.width,
          height: CommonWindows.small.height,
          type: 'small'
        },

        // Left wall (wall 3) - paired windows in the center
        {
          wallIndex: 3,
          offset: 0.35,
          width: CommonWindows.pairedMedium.width,
          height: CommonWindows.pairedMedium.height,
          type: 'paired-left'
        },
        {
          wallIndex: 3,
          offset: 0.55,
          width: CommonWindows.pairedMedium.width,
          height: CommonWindows.pairedMedium.height,
          type: 'paired-right'
        }
      ]

      // Add all openings
      addDoors(newPerimeter, doorSpecs)
      addWindows(newPerimeter, windowSpecs)

      // Focus the view on the newly created test data
      const wallPoints = newPerimeter.corners.map(c => c.outsidePoint)
      const bounds = Bounds2D.fromPoints(wallPoints)
      getSelectionActions().replaceSelection([newPerimeter.id])
      viewportActions().fitToView(bounds)
    }
  } catch (error) {
    console.error('❌ Failed to create rectangular test data:', error)
  }
}
