import type { Tool, ToolGroup, CanvasEvent } from './types'

export interface ToolManagerState {
  activeTool: Tool | null
  activeToolId: string | null
  tools: Map<string, Tool>
  toolGroups: Map<string, ToolGroup>
}

// Debug function to convert state to plain objects for logging
const debugState = (state: ToolManagerState) => ({
  activeToolId: state.activeToolId,
  activeToolName: state.activeTool?.name,
  toolCount: state.tools.size,
  toolGroupCount: state.toolGroups.size,
  toolIds: Array.from(state.tools.keys()),
  groupIds: Array.from(state.toolGroups.keys())
})

export class ToolManager {
  private state: ToolManagerState = {
    activeTool: null,
    activeToolId: null,
    tools: new Map(),
    toolGroups: new Map()
  }

  private subscribers: Set<(state: ToolManagerState) => void> = new Set()

  // Tool registration
  registerTool(tool: Tool): void {
    // Create new state with updated tools map
    const newTools = new Map(this.state.tools)
    newTools.set(tool.id, tool)
    this.state = {
      ...this.state,
      tools: newTools
    }
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
  activateTool(toolId: string): boolean {
    console.log('ToolManager.activateTool called with:', toolId)
    const tool = this.state.tools.get(toolId)
    if (!tool) {
      console.warn(`Tool with id '${toolId}' not found`)
      console.log('Available tools:', Array.from(this.state.tools.keys()))
      return false
    }

    // Deactivate current tool
    if (this.state.activeTool) {
      console.log('Deactivating tool:', this.state.activeTool.id)
      this.state.activeTool.onDeactivate?.()
    }

    // Activate new tool - create new state object to trigger React updates
    this.state = {
      ...this.state,
      activeTool: tool,
      activeToolId: toolId
    }
    console.log('Activating tool:', tool.name)
    tool.onActivate?.()

    this.notifySubscribers()
    console.log('Tool activated successfully:', toolId)
    return true
  }

  deactivateCurrentTool(): void {
    if (this.state.activeTool) {
      this.state.activeTool.onDeactivate?.()
      // Create new state object to trigger React updates
      this.state = {
        ...this.state,
        activeTool: null,
        activeToolId: null
      }
      this.notifySubscribers()
    }
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
        case 'mousedown':
          return tool.handleMouseDown?.(event.originalEvent as MouseEvent, event.context) ?? false
        case 'mousemove':
          return tool.handleMouseMove?.(event.originalEvent as MouseEvent, event.context) ?? false
        case 'mouseup':
          return tool.handleMouseUp?.(event.originalEvent as MouseEvent, event.context) ?? false
        case 'keydown':
          return tool.handleKeyDown?.(event.originalEvent as KeyboardEvent, event.context) ?? false
        case 'keyup':
          return tool.handleKeyUp?.(event.originalEvent as KeyboardEvent, event.context) ?? false
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
    console.log('Notifying', this.subscribers.size, 'subscribers of state change')
    console.log('Current state:', debugState(this.state))
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

  activateDefaultToolForGroup(groupId: string): boolean {
    const defaultTool = this.getDefaultToolForGroup(groupId)
    if (!defaultTool) return false
    return this.activateTool(defaultTool.id)
  }

  // Debug helpers
  getState(): ToolManagerState {
    return { ...this.state }
  }

  reset(): void {
    this.deactivateCurrentTool()
    // Create new state with empty maps
    this.state = {
      ...this.state,
      tools: new Map(),
      toolGroups: new Map()
    }
    this.notifySubscribers()
  }
}

// Global instance
export const toolManager = new ToolManager()
