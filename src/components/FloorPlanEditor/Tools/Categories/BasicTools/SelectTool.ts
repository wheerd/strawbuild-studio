import type { Tool, CanvasEvent } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { useSelectionStore } from '@/components/FloorPlanEditor/hooks/useSelectionStore'
import { CursorArrowIcon } from '@radix-ui/react-icons'

export class SelectTool implements Tool {
  id = 'basic.select'
  name = 'Select'
  icon = '↖'
  iconComponent = CursorArrowIcon
  hotkey = 'v'
  cursor = 'default'
  category = 'basic'

  // Event handlers
  handleMouseDown(event: CanvasEvent): boolean {
    const hitResult = event.context.findEntityAt(event.pointerCoordinates!)

    if (hitResult) {
      const clickSelectionPath = hitResult.parentIds.concat([hitResult.entityId])
      const store = useSelectionStore.getState()
      const currentSelectionPath = store.getSelectionPath()

      for (let i = 0; i < currentSelectionPath.length; i++) {
        // Clicked on parent of current selection
        if (i >= clickSelectionPath.length) {
          store.replaceSelection(clickSelectionPath)
          return true
        }
        // Clicked on sibling of current selection (or something completely different)
        if (currentSelectionPath[i] !== clickSelectionPath[i]) {
          store.replaceSelection(clickSelectionPath.slice(0, i + 1))
          return true
        }
      }

      // Clicked on child of current selection
      if (clickSelectionPath.length > currentSelectionPath.length) {
        store.pushSelection(clickSelectionPath[currentSelectionPath.length])
      }

      return true
    } else {
      // Clear selection when clicking empty space
      event.context.clearSelection()
      return true
    }
  }

  handleKeyDown(event: CanvasEvent): boolean {
    const keyEvent = event.originalEvent as KeyboardEvent

    if (keyEvent.key === 'Escape') {
      // Progressive deselection - pop from selection stack
      const currentSelection = event.context.getCurrentSelection()

      if (currentSelection) {
        event.context.popSelection()
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
