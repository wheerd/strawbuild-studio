import type { Tool, ToolContext } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { createLength, createVec2, boundsFromPoints } from '@/types/geometry'
import { toolManager } from '@/components/FloorPlanEditor/Tools/ToolSystem/ToolManager'
import { RocketIcon } from '@radix-ui/react-icons'
import { useConfigStore } from '@/config/store'

/**
 * Tool for adding test perimeter data to demonstrate entity hit testing.
 * Triggers on activation to add a T-shaped test perimeter with multiple doors and windows.
 */
export class TestDataTool implements Tool {
  id = 'basic.test-data'
  name = 'Test Data'
  icon = '🏗️'
  iconComponent = RocketIcon
  hotkey = 't'
  cursor = 'default'
  category = 'basic'

  // Lifecycle methods
  onActivate(context: ToolContext): void {
    // Immediately deactivate and return to select tool
    setTimeout(() => {
      toolManager.activateTool('basic.select', context)
    }, 0)

    // Perform the test data creation operation
    const modelStore = context.getModelStore()
    const activeStoreyId = context.getActiveStoreyId()

    // Create a T-shaped perimeter (realistic building scale)
    const boundary = {
      points: [
        createVec2(2000, 12000), // Top-left of vertical bar
        createVec2(8000, 12000), // Top-right of vertical bar
        createVec2(8000, 8000), // Inner corner (right of horizontal bar)
        createVec2(15000, 8000), // Top-right of horizontal bar
        createVec2(15000, 3000), // Bottom-right of horizontal bar
        createVec2(8000, 3000), // Inner corner (right of vertical bar)
        createVec2(8000, 1000), // Bottom-right of vertical bar
        createVec2(2000, 1000), // Bottom-left of vertical bar
        createVec2(2000, 3000), // Inner corner (left of vertical bar)
        createVec2(500, 3000), // Bottom-left of horizontal bar
        createVec2(500, 8000), // Top-left of horizontal bar
        createVec2(2000, 8000) // Inner corner (left of horizontal bar)
      ]
    }

    try {
      // Get default ring beam methods from config store
      const configStore = useConfigStore.getState()
      const defaultBaseId = configStore.getDefaultBaseRingBeamMethodId()
      const defaultTopId = configStore.getDefaultTopRingBeamMethodId()

      // Add the perimeter to the store with default ring beams
      const newPerimeter = modelStore.addPerimeter(
        activeStoreyId,
        boundary,
        'infill',
        createLength(440),
        defaultBaseId,
        defaultTopId
      )

      if (newPerimeter && newPerimeter.walls.length > 0) {
        const walls = newPerimeter.walls

        // Add openings only to longer walls to avoid validation issues
        // Focus on walls that are definitely long enough for windows

        // Add main entrance door - use the longest wall that's likely the bottom
        if (walls.length > 6) {
          modelStore.addPerimeterWallOpening(newPerimeter.id, walls[6].id, {
            type: 'door',
            offsetFromStart: createLength(Math.floor(walls[6].wallLength * 0.4)), // 40% along the wall
            width: createLength(900),
            height: createLength(2100)
          })
        }

        // Add variety of windows: large, small, paired, and singles
        const windowsToAdd = [
          // Large windows
          { wallIndex: 0, offset: 0.15, width: 1800, height: 1400, type: 'large' },
          { wallIndex: 0, offset: 0.65, width: 1600, height: 1200, type: 'large' },

          // Paired windows (side by side with small gap)
          { wallIndex: 1, offset: 0.25, width: 800, height: 1000, type: 'paired-left' },
          { wallIndex: 1, offset: 0.35, width: 800, height: 1000, type: 'paired-right' }, // 10% gap = ~500mm

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

        windowsToAdd.forEach((windowSpec, index) => {
          if (walls.length > windowSpec.wallIndex) {
            const wall = walls[windowSpec.wallIndex]
            const wallLength = wall.wallLength
            const windowWidth = windowSpec.width
            const offset = Math.floor(wallLength * windowSpec.offset)

            // More lenient space check - need at least 300mm margins for small windows
            const marginNeeded = windowWidth < 800 ? 600 : 800
            if (wallLength > windowWidth + marginNeeded && offset + windowWidth <= wallLength - 200) {
              try {
                modelStore.addPerimeterWallOpening(newPerimeter.id, wall.id, {
                  type: 'window',
                  offsetFromStart: createLength(offset),
                  width: createLength(windowWidth),
                  height: createLength(windowSpec.height),
                  sillHeight: createLength(windowSpec.height < 900 ? 1000 : 900) // Higher sill for smaller windows
                })
              } catch (error) {
                console.warn(`${windowSpec.type} window ${index} on wall ${windowSpec.wallIndex} failed:`, error)
              }
            }
          }
        })
      }

      // Focus the view on the newly created test data
      if (newPerimeter) {
        const wallPoints = newPerimeter.corners.map(c => c.outsidePoint)
        const bounds = boundsFromPoints(wallPoints)
        if (bounds) {
          context.fitToView(bounds)
        }
      }
    } catch (error) {
      console.error('❌ Failed to create test data:', error)
    }
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
