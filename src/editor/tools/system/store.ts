import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { getToolById } from '@/editor/tools'

import { DEFAULT_TOOL } from './metadata'
import type { CanvasEvent, ToolId, ToolImplementation } from './types'

interface ToolState {
  // Stack with select tool always at bottom - cannot be popped
  toolStack: ToolId[]
}

interface ToolActions {
  // Stack operations
  pushTool: (toolId: ToolId) => void
  popTool: () => void
  clearToDefault: () => void
  replaceTool: (toolId: ToolId) => void

  // Convenience getters
  getActiveTool: () => ToolImplementation
  getActiveToolId: () => ToolId
  getPreviousToolId: () => ToolId | null
  canPop: () => boolean
  getStackDepth: () => number

  // Canvas event handling
  handleCanvasEvent: (event: CanvasEvent) => boolean
}

type ToolStore = ToolState & ToolActions

export const useToolStore = create<ToolStore>()(
  devtools(
    (set, get) => ({
      // Initial state - select tool always at bottom
      toolStack: [DEFAULT_TOOL],

      // Stack operations
      pushTool: (toolId: ToolId) => {
        const state = get()

        // Don't push if already at top of stack
        if (state.getActiveToolId() === toolId) return

        // Deactivate current tool
        const currentTool = state.getActiveTool()
        currentTool.onDeactivate?.()

        // Add to stack
        set(
          state => ({
            toolStack: [...state.toolStack, toolId]
          }),
          false,
          'tool/push'
        )

        // Activate new tool
        const newTool = getToolById(toolId)
        newTool.onActivate?.()
      },

      popTool: () => {
        const state = get()
        if (state.toolStack.length <= 1) return // Can't pop default tool

        // Deactivate current tool
        const currentTool = state.getActiveTool()
        currentTool.onDeactivate?.()

        // Remove from stack
        set(
          state => ({
            toolStack: state.toolStack.slice(0, -1)
          }),
          false,
          'tool/pop'
        )

        // Activate previous tool
        const newTool = get().getActiveTool()
        newTool.onActivate?.()
      },

      clearToDefault: () => {
        const state = get()
        if (state.toolStack.length <= 1) return // Already at default

        // Deactivate current tool
        const currentTool = state.getActiveTool()
        currentTool.onDeactivate?.()

        // Reset to default tool only
        set(
          {
            toolStack: [DEFAULT_TOOL]
          },
          false,
          'tool/clearToDefault'
        )

        // Activate default tool
        const defaultTool = getToolById(DEFAULT_TOOL)
        defaultTool.onActivate?.()
      },

      replaceTool: (toolId: ToolId) => {
        const state = get()

        // Don't replace if already active
        if (state.getActiveToolId() === toolId) return

        // Deactivate current tool
        const currentTool = state.getActiveTool()
        currentTool.onDeactivate?.()

        const remainingStack = state.toolStack.length <= 1 ? state.toolStack : state.toolStack.slice(0, -1)

        // Replace top of stack
        set(
          {
            toolStack: [...remainingStack, toolId]
          },
          false,
          'tool/replace'
        )

        // Activate new tool
        const newTool = getToolById(toolId)
        newTool.onActivate?.()
      },

      // Convenience getters
      getActiveTool: () => {
        const stack = get().toolStack
        const toolId = stack[stack.length - 1]
        return getToolById(toolId)
      },

      getActiveToolId: () => {
        const stack = get().toolStack
        return stack[stack.length - 1]
      },

      getPreviousToolId: () => {
        const stack = get().toolStack
        return stack.length > 1 ? stack[stack.length - 2] : null
      },

      canPop: () => get().toolStack.length > 1,

      getStackDepth: () => get().toolStack.length,

      // Canvas event handling
      handleCanvasEvent: (event: CanvasEvent) => {
        const tool = get().getActiveTool()

        try {
          switch (event.type) {
            case 'pointerdown':
              return tool.handlePointerDown?.(event) ?? false
            case 'pointermove':
              return tool.handlePointerMove?.(event) ?? false
            case 'pointerup':
              return tool.handlePointerUp?.(event) ?? false
            default:
              return false
          }
        } catch (error) {
          console.error(`Error handling ${event.type} event in tool ${tool.id}:`, error)
          return false
        }
      }
    }),
    { name: 'tool-store' }
  )
)

// Non-reactive access functions for external usage (similar to other stores)
export const getToolActions = (): ToolActions => useToolStore.getState()
export const getActiveTool = () => useToolStore.getState().getActiveTool()
export const getActiveToolId = () => useToolStore.getState().getActiveToolId()
export const getPreviousToolId = () => useToolStore.getState().getPreviousToolId()
export const canPopTool = () => useToolStore.getState().canPop()
export const getToolStackDepth = () => useToolStore.getState().getStackDepth()

// Non-reactive action functions for direct usage
export const pushTool = (toolId: ToolId) => {
  useToolStore.getState().pushTool(toolId)
}
export const popTool = () => {
  useToolStore.getState().popTool()
}
export const clearToDefaultTool = () => {
  useToolStore.getState().clearToDefault()
}
export const replaceTool = (toolId: ToolId) => {
  useToolStore.getState().replaceTool(toolId)
}
export const handleCanvasEvent = (event: CanvasEvent) => useToolStore.getState().handleCanvasEvent(event)

// Convenience hooks
export const useActiveTool = () => useToolStore(state => state.getActiveTool())
export const useActiveToolId = () => useToolStore(state => state.getActiveToolId())
export const useCanPopTool = () => useToolStore(state => state.canPop())
export const useToolStackDepth = () => useToolStore(state => state.getStackDepth())
