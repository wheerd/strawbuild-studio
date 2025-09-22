import type { ShortcutDefinition, Tool, ToolContext, CanvasEvent } from './types'
import type { SelectableId } from '@/types/ids'
import type Konva from 'konva'
import { isPerimeterId, isPerimeterWallId, isPerimeterCornerId, isOpeningId } from '@/types/ids'

export class KeyboardShortcutManager {
  private builtInShortcuts: ShortcutDefinition[] = []
  private toolActivationShortcuts = new Map<string, string>() // key -> toolId

  constructor() {
    this.initializeBuiltInShortcuts()
  }

  // Register a tool's activation shortcut
  registerToolShortcut(tool: Tool): void {
    if (tool.hotkey) {
      const normalizedKey = this.normalizeKey(tool.hotkey)
      this.toolActivationShortcuts.set(normalizedKey, tool.id)
    }
  }

  // Unregister a tool's shortcut
  unregisterToolShortcut(tool: Tool): void {
    if (tool.hotkey) {
      const normalizedKey = this.normalizeKey(tool.hotkey)
      this.toolActivationShortcuts.delete(normalizedKey)
    }
  }

  // Main keyboard event handler
  handleKeyDown(event: KeyboardEvent, context: ToolContext): boolean {
    const key = this.normalizeKeyFromEvent(event)

    // Priority 1: Active tool's handleKeyDown (highest priority)
    const activeTool = context.getActiveTool()
    if (activeTool?.handleKeyDown) {
      const canvasEvent = this.createCanvasEvent(event, context)
      if (activeTool.handleKeyDown(canvasEvent)) {
        return true
      }
    }

    // Priority 2: Built-in global shortcuts
    const availableBuiltInShortcuts = this.getAvailableBuiltInShortcuts(key, context)
    if (availableBuiltInShortcuts.length > 0) {
      const shortcut = availableBuiltInShortcuts[0] // Highest priority
      shortcut.action(context)
      return true
    }

    // Priority 4: Tool activation shortcuts
    const toolId = this.toolActivationShortcuts.get(key)
    if (toolId) {
      return context.activateTool(toolId)
    }

    return false
  }

  // Get all available shortcuts for debugging/UI
  getAllAvailableShortcuts(context: ToolContext): ShortcutDefinition[] {
    const shortcuts: ShortcutDefinition[] = []

    // Built-in shortcuts (filtered by condition)
    shortcuts.push(...this.builtInShortcuts.filter(s => !s.condition || s.condition(context)))

    // Tool activation shortcuts
    for (const [key, toolId] of this.toolActivationShortcuts.entries()) {
      shortcuts.push({
        key,
        action: context => context.activateTool(toolId),
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
        action: context => {
          const selectedId = context.getCurrentSelection()
          if (selectedId) {
            const success = this.deleteEntity(selectedId, context)
            if (success) {
              // Only pop selection if deletion was successful
              // This moves up one level in the hierarchy instead of clearing entirely
              context.popSelection()
            }
          }
        },
        condition: context => context.getCurrentSelection() !== null,
        priority: 100,
        scope: 'global',
        source: 'builtin:delete'
      },

      // Alternative delete key
      {
        key: 'Backspace',
        label: 'Delete Selected',
        action: context => {
          const selectedId = context.getCurrentSelection()
          if (selectedId) {
            const success = this.deleteEntity(selectedId, context)
            if (success) {
              // Only pop selection if deletion was successful
              // This moves up one level in the hierarchy instead of clearing entirely
              context.popSelection()
            }
          }
        },
        condition: context => context.getCurrentSelection() !== null,
        priority: 100,
        scope: 'global',
        source: 'builtin:delete-backspace'
      },

      // Escape to clear selection and return to select tool
      {
        key: 'Escape',
        label: 'Cancel/Clear Selection',
        action: context => {
          context.clearSelection()
          // Return to select tool if not already active
          const activeTool = context.getActiveTool()
          if (activeTool?.id !== 'basic.select') {
            context.activateTool('basic.select')
          }
        },
        condition: () => true, // Always available
        priority: 90,
        scope: 'global',
        source: 'builtin:escape'
      }
    ]
  }

  private getAvailableBuiltInShortcuts(key: string, context: ToolContext): ShortcutDefinition[] {
    return this.builtInShortcuts
      .filter(shortcut => shortcut.key === key)
      .filter(shortcut => !shortcut.condition || shortcut.condition(context))
      .sort((a, b) => b.priority - a.priority)
  }

  private deleteEntity(selectedId: SelectableId, context: ToolContext): boolean {
    const modelStore = context.getModelStore()

    try {
      // Selection path has fixed structure: [perimeterId, wallId, openingId]
      const selectionPath = context.getSelectionPath()

      if (isPerimeterWallId(selectedId)) {
        // Wall is at index 1, parent wall is at index 0
        const parentWallId = selectionPath[0]
        if (parentWallId && isPerimeterId(parentWallId)) {
          return modelStore.removePerimeterWall(parentWallId, selectedId)
        } else {
          console.warn(`Could not find parent perimeter in selection path for wall: ${selectedId}`)
          return false
        }
      } else if (isPerimeterCornerId(selectedId)) {
        // Corner is at index 1, parent wall is at index 0
        const parentWallId = selectionPath[0]
        if (parentWallId && isPerimeterId(parentWallId)) {
          return modelStore.removePerimeterCorner(parentWallId, selectedId)
        } else {
          console.warn(`Could not find parent perimeter in selection path for corner: ${selectedId}`)
          return false
        }
      } else if (isOpeningId(selectedId)) {
        const perimeterId = selectionPath[0]
        const wallId = selectionPath[1]

        if (perimeterId && wallId && isPerimeterId(perimeterId) && isPerimeterWallId(wallId)) {
          modelStore.removePerimeterWallOpening(perimeterId, wallId, selectedId)
          return true
        } else {
          console.warn(`Could not find parent wall/wall in selection path for opening: ${selectedId}`)
          return false
        }
      } else if (isPerimeterId(selectedId)) {
        modelStore.removePerimeter(selectedId)
        return true
      } else {
        console.warn(`Unknown sub-entity type for deletion: ${selectedId}`)
        return false
      }
    } catch (error) {
      console.error(`Failed to delete entity ${selectedId}:`, error)
      return false
    }
  }

  private createCanvasEvent(event: KeyboardEvent, context: ToolContext): CanvasEvent {
    return {
      type: 'keydown',
      originalEvent: event,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      konvaEvent: null as unknown as Konva.KonvaEventObject<any>, // Not needed for keyboard events
      stageCoordinates: [0, 0], // Not relevant for keyboard
      context
    }
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
