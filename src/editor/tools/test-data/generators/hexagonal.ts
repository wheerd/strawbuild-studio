import { vec2 } from 'gl-matrix'

import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config/store'
import { getSelectionActions } from '@/editor/hooks/useSelectionStore'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { Bounds2D, polygonIsClockwise } from '@/shared/geometry'

import { CommonDoors, CommonWindows, type DoorSpec, type WindowSpec, addDoors, addWindows } from './openings'

/**
 * Creates a regular hexagonal perimeter with 3m sides
 * Includes strategically placed windows and a main entrance door
 */
export function createHexagonalPerimeter(): void {
  const modelStore = getModelActions()
  const activeStoreyId = modelStore.getActiveStoreyId()

  // Create a regular hexagon with 3m (3000mm) sides
  const sideLength = 3000
  const centerX = 0
  const centerY = 0

  // Calculate radius (distance from center to vertex)
  // For a regular hexagon, radius = side length
  const radius = sideLength

  // Generate hexagon points starting from the right (0 degrees)
  let points = []
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 // 60 degrees between each point
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    points.push(vec2.fromValues(x, y))
  }

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
      // Add main entrance door on one of the walls
      const doorSpecs: DoorSpec[] = [
        {
          wallIndex: 0,
          offset: 0.5,
          width: CommonDoors.standard.width,
          height: CommonDoors.standard.height,
          type: 'main-entrance'
        }
      ]

      // Add windows to 4 of the 6 walls (leaving the entrance wall and one adjacent wall without windows)
      const windowSpecs: WindowSpec[] = [
        // Skip wall 0 (has door) and wall 1 (adjacent to door)
        {
          wallIndex: 2,
          offset: 0.5,
          width: CommonWindows.large.width,
          height: CommonWindows.large.height,
          type: 'large'
        },
        {
          wallIndex: 3,
          offset: 0.3,
          width: CommonWindows.medium.width,
          height: CommonWindows.medium.height,
          type: 'medium-left'
        },
        {
          wallIndex: 3,
          offset: 0.7,
          width: CommonWindows.medium.width,
          height: CommonWindows.medium.height,
          type: 'medium-right'
        },
        {
          wallIndex: 4,
          offset: 0.5,
          width: CommonWindows.large.width,
          height: CommonWindows.large.height,
          type: 'large'
        },
        {
          wallIndex: 5,
          offset: 0.25,
          width: CommonWindows.small.width,
          height: CommonWindows.small.height,
          type: 'small-left'
        },
        {
          wallIndex: 5,
          offset: 0.75,
          width: CommonWindows.small.width,
          height: CommonWindows.small.height,
          type: 'small-right'
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
    console.error('❌ Failed to create hexagonal test data:', error)
  }
}
