import { type ReactNode, createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'

import type { Tag, TagCategoryId, TagId, TagOrCategory } from '@/construction/tags'

import { type TagVisibilityStore, createTagVisibilityStore } from './tagVisibilityStore'

const TagVisibilityStoreContext = createContext<TagVisibilityStore | null>(null)

export interface TagVisibilityProviderProps {
  children: ReactNode
  defaultHidden?: TagOrCategory[]
}

export function TagVisibilityProvider({ children, defaultHidden }: TagVisibilityProviderProps): React.JSX.Element {
  const storeRef = useRef<TagVisibilityStore>(
    createTagVisibilityStore({
      initialHidden: defaultHidden
    })
  )

  return <TagVisibilityStoreContext.Provider value={storeRef.current}>{children}</TagVisibilityStoreContext.Provider>
}

function useTagVisibilityStore(): TagVisibilityStore {
  const store = useContext(TagVisibilityStoreContext)
  if (!store) {
    throw new Error('useTagVisibilityStore must be used within TagVisibilityProvider')
  }
  return store
}

/**
 * Hook to get stable action functions for modifying tag visibility.
 * These functions never change, so they won't cause re-renders.
 */
export function useTagVisibilityActions() {
  const store = useTagVisibilityStore()

  return useMemo(
    () => ({
      toggleTagOrCategory: (id: TagOrCategory) => store.toggleVisibility(id),
      setTagOrCategoryVisibility: (id: TagOrCategory, visible: boolean) => store.setVisibility(id, visible),
      isTagOrCategoryVisible: (id: TagOrCategory) => store.isVisible(id),
      getCategoryVisibilityState: (categoryId: TagCategoryId, tagIds: TagId[]) =>
        store.getCategoryVisibilityState(categoryId, tagIds),
      getHiddenTagIds: () => store.getHiddenTagIds()
    }),
    [store]
  )
}

/**
 * Hook for components that need to re-render on any visibility change (e.g., the menu).
 * Use sparingly - prefer useVisibleItems for fine-grained subscriptions.
 */
export function useTagVisibilityForceUpdate(): void {
  const store = useTagVisibilityStore()
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  useEffect(() => {
    return store.subscribe(forceUpdate)
  }, [store])
}

/**
 * Hook to filter an array of items by their tags' visibility.
 * Automatically re-renders when tag visibility changes.
 *
 * @example
 * function MyComponent() {
 *   const visibleItems = useVisibleItems(allItems) // Automatically updates on visibility change
 *   return <div>{visibleItems.map(...)}</div>
 * }
 */
export function useVisibleItems<T extends { tags?: Tag[] }>(items: T[]): T[] {
  // Subscribe to visibility changes - component re-renders when any tag visibility changes
  useTagVisibilityForceUpdate()

  const store = useTagVisibilityStore()

  return useMemo(() => items.filter(item => store.isEffectivelyVisible(item.tags ?? [])), [items, store])
}
