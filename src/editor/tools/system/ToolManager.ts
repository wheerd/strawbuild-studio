import { keyboardShortcutManager } from './KeyboardShortcutManager'
import type { CanvasEvent, Tool, ToolContext, ToolGroup } from './types'

export interface ToolManagerState {
  activeTool: Tool | null
  activeToolId: string | null
  tools: Map<string, Tool>
  toolGroups: Map<string, ToolGroup>
}

export class ToolManager {
  private state: ToolManagerState = {
    activeTool: null,
    activeToolId: null,
    tools: new Map(),
    toolGroups: new Map()
  }

  private subscribers = new Set<(state: ToolManagerState) => void>()

  // Tool registration
  registerTool(tool: Tool): void {
    // Create new state with updated tools map
    const newTools = new Map(this.state.tools)
    newTools.set(tool.id, tool)
    this.state = {
      ...this.state,
      tools: newTools
    }

    // Register tool's shortcut if it has one
    keyboardShortcutManager.registerToolShortcut(tool)

    this.notifySubscribers()
  }

  registerToolGroup(group: ToolGroup): void {
    // Create new state with updated tool groups map
    const newToolGroups = new Map(this.state.toolGroups)
    newToolGroups.set(group.id, group)
    this.state = {
      ...this.state,
      toolGroups: newToolGroups
    }
    group.tools.forEach(tool => this.registerTool(tool))
    this.notifySubscribers()
  }

  // Tool activation
  activateTool(toolId: string, context?: ToolContext): boolean {
    const tool = this.state.tools.get(toolId)
    if (!tool) {
      console.warn(`Tool with id '${toolId}' not found`)
      return false
    }

    // Deactivate current tool
    if (this.state.activeTool) {
      this.state.activeTool.onDeactivate?.(context)
    }

    // Activate new tool - create new state object to trigger React updates
    this.state = {
      ...this.state,
      activeTool: tool,
      activeToolId: toolId
    }
    tool.onActivate?.(context)

    this.notifySubscribers()
    return true
  }

  // Getters
  getActiveTool(): Tool | null {
    return this.state.activeTool
  }

  getActiveToolId(): string | null {
    return this.state.activeToolId
  }

  getTool(toolId: string): Tool | null {
    return this.state.tools.get(toolId) ?? null
  }

  getToolGroup(groupId: string): ToolGroup | null {
    return this.state.toolGroups.get(groupId) ?? null
  }

  getAllTools(): Tool[] {
    return Array.from(this.state.tools.values())
  }

  getAllToolGroups(): ToolGroup[] {
    return Array.from(this.state.toolGroups.values())
  }

  getToolsInGroup(groupId: string): Tool[] {
    const group = this.state.toolGroups.get(groupId)
    return group?.tools ?? []
  }

  // Event handling
  handleCanvasEvent(event: CanvasEvent): boolean {
    const tool = this.state.activeTool
    if (!tool) return false

    try {
      switch (event.type) {
        case 'pointerdown':
          return tool.handlePointerDown?.(event) ?? false
        case 'pointermove':
          return tool.handlePointerMove?.(event) ?? false
        case 'pointerup':
          return tool.handlePointerUp?.(event) ?? false
        case 'keydown':
          return tool.handleKeyDown?.(event) ?? false
        case 'keyup':
          return tool.handleKeyUp?.(event) ?? false
        default:
          return false
      }
    } catch (error) {
      console.error(`Error handling ${event.type} event in tool ${tool.id}:`, error)
      return false
    }
  }

  // Subscription management
  subscribe(callback: (state: ToolManagerState) => void): () => void {
    this.subscribers.add(callback)
    // Call immediately with current state
    callback(this.state)

    return () => {
      this.subscribers.delete(callback)
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(this.state)
      } catch (error) {
        console.error('Error in tool manager subscriber:', error)
      }
    })
  }

  // Utility methods
  getDefaultToolForGroup(groupId: string): Tool | null {
    const group = this.state.toolGroups.get(groupId)
    if (!group || !group.defaultTool) return null
    return this.state.tools.get(group.defaultTool) ?? null
  }

  activateDefaultToolForGroup(groupId: string, context: ToolContext): boolean {
    const defaultTool = this.getDefaultToolForGroup(groupId)
    if (!defaultTool) return false
    return this.activateTool(defaultTool.id, context)
  }

  // Debug helpers
  getState(): ToolManagerState {
    return { ...this.state }
  }
}

// Global instance
export const toolManager = new ToolManager()
