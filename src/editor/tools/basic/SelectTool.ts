import { entityHitTestService } from '@/editor/canvas/services/EntityHitTestService'
import {
  clearSelection,
  getCurrentSelection,
  getSelectionPath,
  popSelection,
  pushSelection,
  replaceSelection
} from '@/editor/hooks/useSelectionStore'
import type { CanvasEvent, ToolImplementation } from '@/editor/tools/system/types'

import { SelectToolInspector } from './SelectToolInspector'

export class SelectTool implements ToolImplementation {
  readonly id = 'basic.select'
  readonly inspectorComponent = SelectToolInspector

  // Event handlers
  handlePointerDown(event: CanvasEvent): boolean {
    if (!event.pointerCoordinates) {
      console.warn('No pointer coordinates available for selection')
      return false
    }

    const hitResult = entityHitTestService.findEntityAt(event.originalEvent.clientX, event.originalEvent.clientY)

    if (hitResult) {
      const clickSelectionPath = hitResult.parentIds.concat([hitResult.entityId])
      const currentSelectionPath = getSelectionPath()

      for (let i = 0; i < currentSelectionPath.length; i++) {
        // Clicked on parent of current selection
        if (i >= clickSelectionPath.length) {
          replaceSelection(clickSelectionPath)
          return true
        }
        // Clicked on sibling of current selection (or something completely different)
        if (currentSelectionPath[i] !== clickSelectionPath[i]) {
          replaceSelection(clickSelectionPath.slice(0, i + 1))
          return true
        }
      }

      // Clicked on child of current selection
      if (clickSelectionPath.length > currentSelectionPath.length) {
        pushSelection(clickSelectionPath[currentSelectionPath.length])
      }

      return true
    } else {
      // Clear selection when clicking empty space
      clearSelection()
      return true
    }
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') {
      // Progressive deselection - pop from selection stack
      const currentSelection = getCurrentSelection()

      if (currentSelection) {
        popSelection()
      }
      return true
    }

    // Don't handle Delete/Backspace here - let the KeyboardShortcutManager handle it
    return false
  }

  // Lifecycle methods
  onActivate(): void {
    // Nothing to do for simple selection
  }

  onDeactivate(): void {
    // Nothing to do for simple selection
  }
}
