import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useSyncExternalStore
} from 'react'

import type { Tag, TagCategoryId, TagId, TagOrCategory } from '@/construction/tags'

import { type TagOpacityStore, createTagOpacityStore } from './tagOpacityStore'

const TagOpacityStoreContext = createContext<TagOpacityStore | null>(null)

export interface TagOpacityProviderProps {
  children: ReactNode
  defaultOpacities?: Map<TagOrCategory, number>
}

export function TagOpacityProvider({ children, defaultOpacities }: TagOpacityProviderProps): React.JSX.Element {
  const storeRef = useRef<TagOpacityStore>(
    createTagOpacityStore({
      initialOpacities: defaultOpacities
    })
  )

  return <TagOpacityStoreContext.Provider value={storeRef.current}>{children}</TagOpacityStoreContext.Provider>
}

function useTagOpacityStore(): TagOpacityStore {
  const store = useContext(TagOpacityStoreContext)
  if (!store) {
    throw new Error('useTagOpacityStore must be used within TagOpacityProvider')
  }
  return store
}

/**
 * Hook to subscribe to effective opacity for a specific set of tags.
 * Only re-renders when the opacity of any of the tags (or their categories) changes.
 */
export function useEffectiveOpacity(tags: Tag[]): number {
  const store = useTagOpacityStore()

  // Stable reference to tag IDs and category IDs to subscribe to
  const subscriptionIds = useMemo(() => {
    const ids = new Set<TagOrCategory>()
    tags.forEach(tag => {
      ids.add(tag.id)
      ids.add(tag.category)
    })
    return Array.from(ids)
  }, [tags])

  return useSyncExternalStore(
    useCallback(
      callback => {
        if (subscriptionIds.length === 0) {
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          return () => {}
        }
        return store.subscribeToTags(subscriptionIds, callback)
      },
      [store, subscriptionIds]
    ),
    useCallback(() => store.getEffectiveOpacity(tags), [store, tags]),
    undefined
  )
}

/**
 * Hook to get stable action functions for modifying tag opacity.
 * These functions never change, so they won't cause re-renders.
 */
export function useTagOpacityActions() {
  const store = useTagOpacityStore()

  return useMemo(
    () => ({
      cycleTagOrCategoryOpacity: (id: TagOrCategory) => {
        store.cycleOpacity(id)
      },
      setTagOrCategoryOpacity: (id: TagOrCategory, opacity: number) => {
        store.setOpacity(id, opacity)
      },
      getTagOrCategoryOpacity: (id: TagOrCategory) => store.getOpacity(id),
      getCategoryOpacityState: (categoryId: TagCategoryId, tagIds: TagId[]) =>
        store.getCategoryOpacityState(categoryId, tagIds)
    }),
    [store]
  )
}

/**
 * Hook for components that need to re-render on any opacity change (e.g., the menu).
 * Use sparingly - prefer useEffectiveOpacity or useTagOpacityValue for fine-grained subscriptions.
 */
export function useTagOpacityForceUpdate(): void {
  const store = useTagOpacityStore()
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  useEffect(() => {
    return store.subscribe(forceUpdate)
  }, [store])
}
