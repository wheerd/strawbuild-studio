import { TrashIcon } from '@radix-ui/react-icons'

import { clearPersistence, getModelActions } from '@/building/store'
import type { Tool } from '@/editor/tools/system/types'

/**
 * Tool for resetting the entire model to empty state.
 * Triggers on activation to clear all data and localStorage persistence.
 */
export class ResetTool implements Tool {
  id = 'test-data.reset'
  name = 'Reset'
  icon = '🗑️'
  iconComponent = TrashIcon
  hotkey = 'r'
  cursor = 'default'
  category = 'test-data'

  // Lifecycle methods
  onActivate(): void {
    // Immediately deactivate and return to select tool
    setTimeout(async () => {
      const { pushTool } = await import('@/editor/tools/store/toolStore')
      pushTool('basic.select')
    }, 0)

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
    }
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
