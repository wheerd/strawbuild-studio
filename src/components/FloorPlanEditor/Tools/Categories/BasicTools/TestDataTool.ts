import type { Tool, ToolContext } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { createLength, createVec2, boundsFromPoints } from '@/types/geometry'
import { toolManager } from '../../ToolSystem/ToolManager'

/**
 * Tool for adding test outer wall data to demonstrate entity hit testing.
 * Triggers on activation to add a test outer wall polygon with segments and openings.
 */
export class TestDataTool implements Tool {
  id = 'basic.test-data'
  name = 'Test Data'
  icon = '🏗️'
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
    const activeFloorId = context.getActiveFloorId()

    // Create a simple rectangular outer wall
    const boundary = {
      points: [
        createVec2(1000, 4000), // Top-left
        createVec2(5000, 4000), // Top-right
        createVec2(5000, 1000), // Bottom-right
        createVec2(1000, 1000) // Bottom-left
      ]
    }

    try {
      // Add the outer wall to the store
      modelStore.addOuterWallPolygon(activeFloorId, boundary, 'infill', createLength(440))

      // Get the newly created wall
      const outerWalls = modelStore.getOuterWallsByFloor(activeFloorId)
      const newWall = outerWalls[outerWalls.length - 1]

      if (newWall && newWall.segments.length > 0) {
        // Add a door to the first segment
        const firstSegmentId = newWall.segments[0].id
        modelStore.addOpeningToOuterWall(newWall.id, firstSegmentId, {
          type: 'door',
          offsetFromStart: createLength(1000),
          width: createLength(800),
          height: createLength(2100)
        })

        // Add a window to the second segment
        if (newWall.segments.length > 1) {
          const secondSegmentId = newWall.segments[1].id
          modelStore.addOpeningToOuterWall(newWall.id, secondSegmentId, {
            type: 'window',
            offsetFromStart: createLength(500),
            width: createLength(1200),
            height: createLength(1000),
            sillHeight: createLength(900)
          })
        }
      }

      // Focus the view on the newly created test data
      if (newWall) {
        const wallPoints = newWall.corners.map(c => c.outsidePoint)
        const bounds = boundsFromPoints(wallPoints)
        if (bounds) {
          context.fitToView(bounds)
        }
      }

      console.log('🏗️ Test outer wall created! Details:')
      console.log('  Wall ID:', newWall.id)
      console.log('  Segments count:', newWall.segments.length)
      console.log('  Corners count:', newWall.corners.length)
      console.log(
        '  Wall segments:',
        newWall.segments.map(s => s.id)
      )
      console.log(
        '  Wall corners:',
        newWall.corners.map(c => c.id)
      )
      console.log('  All outer walls on floor:', outerWalls.length)
      console.log('Switch to Entity Inspector tool and click on different parts!')
    } catch (error) {
      console.error('❌ Failed to create test data:', error)
    }
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
