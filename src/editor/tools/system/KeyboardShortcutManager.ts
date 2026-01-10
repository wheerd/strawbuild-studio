import type { SelectableId } from '@/building/model/ids'
import {
  isFloorAreaId,
  isFloorOpeningId,
  isOpeningId,
  isPerimeterCornerId,
  isPerimeterId,
  isPerimeterWallId,
  isRoofId,
  isWallPostId
} from '@/building/model/ids'
import { getCanRedo, getCanUndo, getModelActions, getRedoFunction, getUndoFunction } from '@/building/store'
import { getCurrentSelection, popSelection } from '@/editor/hooks/useSelectionStore'
import { getActiveTool, popTool, replaceTool } from '@/editor/tools/system/store'

import { TOOL_METADATA } from './metadata'
import type { ShortcutDefinition, ToolId } from './types'

export class KeyboardShortcutManager {
  private builtInShortcuts: ShortcutDefinition[] = []
  private toolActivationShortcuts = new Map<string, string>() // key -> toolId

  constructor() {
    this.initializeBuiltInShortcuts()
    this.initializeToolShortcuts()
  }

  // Initialize tool shortcuts from hardcoded tool definitions
  private initializeToolShortcuts(): void {
    for (const [toolId, toolInfo] of Object.entries(TOOL_METADATA)) {
      if (toolInfo.hotkey) {
        const normalizedKey = this.normalizeKey(toolInfo.hotkey)
        this.toolActivationShortcuts.set(normalizedKey, toolId)
      }
    }
  }

  // Main keyboard event handler
  handleKeyDown(event: KeyboardEvent): boolean {
    const key = this.normalizeKeyFromEvent(event)

    // Priority 1: Active tool's handleKeyDown (highest priority)
    const activeTool = getActiveTool()
    if (activeTool?.handleKeyDown) {
      if (activeTool.handleKeyDown(event)) {
        return true
      }
    }

    // Priority 2: Built-in global shortcuts
    const availableBuiltInShortcuts = this.getAvailableBuiltInShortcuts(key)
    if (availableBuiltInShortcuts.length > 0) {
      const shortcut = availableBuiltInShortcuts[0] // Highest priority
      shortcut.action()
      return true
    }

    // Priority 4: Tool activation shortcuts
    const toolId = this.toolActivationShortcuts.get(key)
    if (toolId) {
      replaceTool(toolId as ToolId)
      return true
    }

    return false
  }

  handleKeyUp(event: KeyboardEvent): boolean {
    const activeTool = getActiveTool()
    if (activeTool?.handleKeyUp) {
      if (activeTool.handleKeyUp(event)) {
        return true
      }
    }

    return false
  }

  // Get all available shortcuts for debugging/UI
  getAllAvailableShortcuts(): ShortcutDefinition[] {
    const shortcuts: ShortcutDefinition[] = []

    // Built-in shortcuts (filtered by condition)
    shortcuts.push(...this.builtInShortcuts.filter(s => !s.condition || s.condition()))

    // Tool activation shortcuts
    for (const [key, toolId] of this.toolActivationShortcuts.entries()) {
      shortcuts.push({
        key,
        action: () => replaceTool(toolId as ToolId),
        priority: 60,
        scope: 'global',
        source: `tool-activation:${toolId}`,
        label: `Activate ${toolId}`
      })
    }

    return shortcuts.sort((a, b) => b.priority - a.priority)
  }

  private initializeBuiltInShortcuts(): void {
    this.builtInShortcuts = [
      // Delete selected entity or sub-entity - works regardless of active tool
      {
        key: 'Delete',
        label: 'Delete Selected',
        action: () => {
          const selectedId = getCurrentSelection()
          if (selectedId) {
            const success = this.deleteEntity(selectedId)
            if (success) {
              // Only pop selection if deletion was successful
              // This moves up one level in the hierarchy instead of clearing entirely
              popSelection()
            }
          }
        },
        condition: () => getCurrentSelection() !== null,
        priority: 100,
        scope: 'global',
        source: 'builtin:delete'
      },

      // Alternative delete key
      {
        key: 'Backspace',
        label: 'Delete Selected',
        action: () => {
          const selectedId = getCurrentSelection()
          if (selectedId) {
            const success = this.deleteEntity(selectedId)
            if (success) {
              // Only pop selection if deletion was successful
              // This moves up one level in the hierarchy instead of clearing entirely
              popSelection()
            }
          }
        },
        condition: () => getCurrentSelection() !== null,
        priority: 100,
        scope: 'global',
        source: 'builtin:delete-backspace'
      },

      // Escape to clear selection and return to select tool
      {
        key: 'Escape',
        label: 'Cancel/Clear Selection',
        action: () => {
          // Return to select tool if not already active
          const activeTool = getActiveTool()
          if (activeTool?.id !== 'basic.select') {
            popTool()
          }
        },
        condition: () => true, // Always available
        priority: 90,
        scope: 'global',
        source: 'builtin:escape'
      },

      {
        key: 'Ctrl+Z',
        label: 'Undo',
        action: () => {
          // Get undo function directly from store to avoid React hook issues
          getUndoFunction()()
        },
        condition: () => getCanUndo(),
        priority: 90,
        scope: 'global',
        source: 'builtin:undo'
      },
      {
        key: 'Ctrl+Y',
        label: 'Redo',
        action: () => {
          // Get redo function directly from store to avoid React hook issues
          getRedoFunction()()
        },
        condition: () => getCanRedo(),
        priority: 90,
        scope: 'global',
        source: 'builtin:redo'
      }
    ]
  }

  private getAvailableBuiltInShortcuts(key: string): ShortcutDefinition[] {
    return this.builtInShortcuts
      .filter(shortcut => shortcut.key === key)
      .filter(shortcut => !shortcut.condition || shortcut.condition())
      .sort((a, b) => b.priority - a.priority)
  }

  private deleteEntity(selectedId: SelectableId): boolean {
    const modelStore = getModelActions()

    try {
      if (isPerimeterWallId(selectedId)) {
        return modelStore.removePerimeterWall(selectedId)
      } else if (isPerimeterCornerId(selectedId)) {
        return modelStore.removePerimeterCorner(selectedId)
      } else if (isOpeningId(selectedId)) {
        modelStore.removeWallOpening(selectedId)
      } else if (isWallPostId(selectedId)) {
        modelStore.removeWallPost(selectedId)
      } else if (isPerimeterId(selectedId)) {
        modelStore.removePerimeter(selectedId)
        return true
      } else if (isFloorAreaId(selectedId)) {
        modelStore.removeFloorArea(selectedId)
        return true
      } else if (isFloorOpeningId(selectedId)) {
        modelStore.removeFloorOpening(selectedId)
        return true
      } else if (isRoofId(selectedId)) {
        modelStore.removeRoof(selectedId)
        return true
      } else {
        console.warn(`Unknown sub-entity type for deletion: ${selectedId}`)
        return false
      }
    } catch (error) {
      console.error(`Failed to delete entity ${selectedId}:`, error)
      return false
    }

    return true
  }

  private normalizeKey(key: string): string {
    // Convert key combinations to a standard format
    const parts = key
      .toLowerCase()
      .split('+')
      .map(part => part.trim())
    const modifiers = parts.filter(part => ['ctrl', 'shift', 'alt', 'meta'].includes(part))
    const mainKey = parts.find(part => !['ctrl', 'shift', 'alt', 'meta'].includes(part))

    if (!mainKey) return key

    // Capitalize main key for consistency
    const normalizedKey = mainKey.charAt(0).toUpperCase() + mainKey.slice(1)

    // Sort modifiers for consistency
    modifiers.sort()
    const normalizedModifiers = modifiers.map(mod => mod.charAt(0).toUpperCase() + mod.slice(1))

    return normalizedModifiers.length > 0 ? `${normalizedModifiers.join('+')}+${normalizedKey}` : normalizedKey
  }

  private normalizeKeyFromEvent(event: KeyboardEvent): string {
    const modifiers: string[] = []
    if (event.ctrlKey) modifiers.push('Ctrl')
    if (event.metaKey) modifiers.push('Meta')
    if (event.shiftKey) modifiers.push('Shift')
    if (event.altKey) modifiers.push('Alt')

    // Handle special keys
    let key = event.key
    if (key === ' ') key = 'Space'
    if (key === 'Escape') key = 'Escape'
    if (key === 'Delete') key = 'Delete'
    if (key === 'Backspace') key = 'Backspace'

    // Capitalize main key for consistency with normalizeKey
    const normalizedKey = key.charAt(0).toUpperCase() + key.slice(1)

    // Sort modifiers for consistency with normalizeKey
    modifiers.sort()

    return modifiers.length > 0 ? `${modifiers.join('+')}+${normalizedKey}` : normalizedKey
  }
}

// Global instance
export const keyboardShortcutManager = new KeyboardShortcutManager()
