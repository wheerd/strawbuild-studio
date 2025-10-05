import { clearPersistence, getModelActions } from '@/building/store'
import { getToolActions } from '@/editor/tools/system'
import type { ToolImplementation } from '@/editor/tools/system/types'

/**
 * Tool for resetting the entire model to empty state.
 * Triggers on activation to clear all data and localStorage persistence.
 */
export class ResetTool implements ToolImplementation {
  readonly id = 'test.reset'

  // Lifecycle methods
  onActivate(): void {
    // Perform the reset operation
    const modelStore = getModelActions()

    try {
      // Clear the model data
      modelStore.reset()

      // Clear localStorage persistence
      clearPersistence()

      console.log('✅ Model reset completed - all data cleared')
    } catch (error) {
      console.error('❌ Failed to reset model:', error)
    } finally {
      getToolActions().popTool()
    }
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
