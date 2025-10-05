import { clearPersistence, getModelActions } from '@/building/store'
import type { ToolImplementation } from '@/editor/tools/system/types'

import { TestDataToolInspector } from './TestDataToolInspector'
import { createCrossShapedPerimeter } from './generators/crossShaped'
import { createHexagonalPerimeter } from './generators/hexagonal'
import { createRectangularPerimeter } from './generators/rectangular'

/**
 * Tool for creating test perimeter data with various configurations.
 * Provides an inspector interface with buttons for different test scenarios.
 */
export class TestDataTool implements ToolImplementation {
  readonly id = 'test.data'
  readonly inspectorComponent = TestDataToolInspector

  /**
   * Create cross-shaped perimeter with extensive openings
   */
  public createCrossShapedTestData(): void {
    createCrossShapedPerimeter()
  }

  /**
   * Create hexagonal perimeter with 3m sides
   */
  public createHexagonalTestData(): void {
    createHexagonalPerimeter()
  }

  /**
   * Create rectangular 8x5m perimeter with openings
   */
  public createRectangularTestData(): void {
    createRectangularPerimeter()
  }

  /**
   * Reset all model data and clear persistence
   */
  public resetAllData(): void {
    try {
      const modelStore = getModelActions()

      // Clear the model data
      modelStore.reset()

      // Clear localStorage persistence
      clearPersistence()

      console.log('✅ Model reset completed - all data cleared')
    } catch (error) {
      console.error('❌ Failed to reset model:', error)
    }
  }

  onActivate(): void {
    // Tool now uses inspector interface instead of immediate activation
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
