import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type { EntityId, SelectableId } from '@/building/model/ids'

interface SelectionState {
  // Simple stack of IDs - parent is always previous item in array
  stack: SelectableId[]
}

interface SelectionActions {
  // Core stack operations
  pushSelection: (id: SelectableId) => void // Add to top of stack
  popSelection: () => void // Remove from top of stack
  clearSelection: () => void // Empty the stack
  replaceSelection: (stack: SelectableId[]) => void // Replace entire stack

  // Convenience getters
  getCurrentSelection: () => SelectableId | null // Top of stack
  getParentSelection: () => SelectableId | null // Second from top
  getRootSelection: () => SelectableId | null // Bottom of stack
  getSelectionDepth: () => number // Stack length
  getSelectionPath: () => SelectableId[] // Full path from root to current

  // Query helpers
  isSelected: (id: SelectableId) => boolean // Check if ID is anywhere in stack
  isCurrentSelection: (id: SelectableId) => boolean // Check if ID is top of stack
  hasSelection: () => boolean // Stack not empty

  // Backward compatibility helper
  getSelectedEntityId: () => EntityId | null // Root entity for existing tools
}

type SelectionStore = SelectionState & SelectionActions

export const useSelectionStore = create<SelectionStore>()(
  devtools(
    (set, get) => ({
      // State
      stack: [],

      // Core stack operations
      pushSelection: (id: SelectableId) => {
        set(state => {
          // Avoid duplicates in stack - if already present, don't add again
          if (state.stack.includes(id)) {
            return state
          }
          return { stack: [...state.stack, id] }
        })
      },

      popSelection: () => {
        set(state => ({
          stack: state.stack.slice(0, -1)
        }))
      },

      clearSelection: () => {
        set({ stack: [] })
      },

      replaceSelection: (stack: SelectableId[]) => {
        set({ stack })
      },

      // Convenience getters
      getCurrentSelection: () => {
        const state = get()
        return state.stack.length > 0 ? state.stack[state.stack.length - 1] : null
      },

      getParentSelection: () => {
        const state = get()
        return state.stack.length > 1 ? state.stack[state.stack.length - 2] : null
      },

      getRootSelection: () => {
        const state = get()
        return state.stack.length > 0 ? state.stack[0] : null
      },

      getSelectionDepth: () => {
        return get().stack.length
      },

      getSelectionPath: () => {
        return get().stack
      },

      // Query helpers
      isSelected: (id: SelectableId) => {
        return get().stack.includes(id)
      },

      isCurrentSelection: (id: SelectableId) => {
        return get().getCurrentSelection() === id
      },

      hasSelection: () => {
        return get().stack.length > 0
      }
    }),
    {
      name: 'selection-store'
    }
  )
)

// Convenience hooks for common selection queries
export const useCurrentSelection = () => useSelectionStore(state => state.getCurrentSelection())
export const useSelectedEntityId = () => useSelectionStore(state => state.getSelectedEntityId())
export const useSelectionPath = () => useSelectionStore(state => state.getSelectionPath())
export const useHasSelection = () => useSelectionStore(state => state.hasSelection())

// Non-reactive access functions for external usage (tools, services)
export const getSelectionActions = (): SelectionActions => useSelectionStore.getState()
export const getCurrentSelection = () => useSelectionStore.getState().getCurrentSelection()
export const getSelectedEntityId = () => useSelectionStore.getState().getSelectedEntityId()
export const getSelectionPath = () => useSelectionStore.getState().getSelectionPath()
export const hasSelection = () => useSelectionStore.getState().hasSelection()

// Non-reactive action functions for direct usage
export const pushSelection = (id: SelectableId) => useSelectionStore.getState().pushSelection(id)
export const popSelection = () => useSelectionStore.getState().popSelection()
export const clearSelection = () => useSelectionStore.getState().clearSelection()
export const replaceSelection = (stack: SelectableId[]) => useSelectionStore.getState().replaceSelection(stack)
