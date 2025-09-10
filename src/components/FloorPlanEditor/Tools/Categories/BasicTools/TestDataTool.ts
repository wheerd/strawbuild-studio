import type { Tool, ToolContext } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { createLength, createVec2, boundsFromPoints } from '@/types/geometry'
import { toolManager } from '@/components/FloorPlanEditor/Tools/ToolSystem/ToolManager'
import { RocketIcon } from '@radix-ui/react-icons'

/**
 * Tool for adding test perimeter data to demonstrate entity hit testing.
 * Triggers on activation to add a test perimeter polygon with walls and openings.
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

    // Create a simple rectangular perimeter
    const boundary = {
      points: [
        createVec2(1000, 4000), // Top-left
        createVec2(5000, 4000), // Top-right
        createVec2(5000, 1000), // Bottom-right
        createVec2(1000, 1000) // Bottom-left
      ]
    }

    try {
      // Add the perimeter to the store
      const newPerimeter = modelStore.addPerimeter(activeStoreyId, boundary, 'infill', createLength(440))

      if (newPerimeter && newPerimeter.walls.length > 0) {
        // Add a door to the first wall
        const firstWallId = newPerimeter.walls[0].id
        modelStore.addPerimeterWallOpening(newPerimeter.id, firstWallId, {
          type: 'door',
          offsetFromStart: createLength(1000),
          width: createLength(800),
          height: createLength(2100)
        })

        // Add a window to the second wall
        if (newPerimeter.walls.length > 1) {
          const secondWallId = newPerimeter.walls[1].id
          modelStore.addPerimeterWallOpening(newPerimeter.id, secondWallId, {
            type: 'window',
            offsetFromStart: createLength(500),
            width: createLength(1200),
            height: createLength(1000),
            sillHeight: createLength(900)
          })
        }
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
