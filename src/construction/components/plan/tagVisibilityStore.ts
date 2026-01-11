import type { Tag, TagCategoryId, TagId, TagOrCategory } from '@/construction/tags'

export type CategoryVisibilityState = 'visible' | 'partial' | 'hidden'

export interface TagVisibilityStore {
  isVisible(id: TagOrCategory): boolean
  setVisibility(id: TagOrCategory, visible: boolean): void
  toggleVisibility(id: TagOrCategory): void
  isEffectivelyVisible(tags: Tag[]): boolean
  getCategoryVisibilityState(categoryId: TagCategoryId, tagIds: TagId[]): CategoryVisibilityState
  getHiddenTagIds(): Set<TagOrCategory>
  subscribe(callback: () => void): () => void
  subscribeToTags(tagIds: TagOrCategory[], callback: () => void): () => void
}

interface CreateTagVisibilityStoreOptions {
  initialHidden?: TagOrCategory[]
}

export function createTagVisibilityStore(options?: CreateTagVisibilityStoreOptions): TagVisibilityStore {
  // Store hidden tags (absent = visible)
  const hiddenSet = new Set<TagOrCategory>(options?.initialHidden ?? [])

  // Map of tag/category ID -> Set of listener callbacks
  const listeners = new Map<TagOrCategory, Set<() => void>>()

  // Global listeners (e.g., for the menu that needs all updates)
  const globalListeners = new Set<() => void>()

  // Cached Set for getHiddenTagIds - only create new Set when hiddenSet actually changes
  let cachedHiddenTagIds = new Set<TagOrCategory>(hiddenSet)
  let cacheInvalidated = false

  function notifyListeners(id: TagOrCategory): void {
    // Notify listeners for this specific tag/category
    const tagListeners = listeners.get(id)
    if (tagListeners) {
      tagListeners.forEach(listener => {
        listener()
      })
    }

    // Notify global listeners
    globalListeners.forEach(listener => {
      listener()
    })
  }

  return {
    isVisible(id: TagOrCategory): boolean {
      return !hiddenSet.has(id)
    },

    setVisibility(id: TagOrCategory, visible: boolean): void {
      const wasHidden = hiddenSet.has(id)
      if (visible) {
        hiddenSet.delete(id)
      } else {
        hiddenSet.add(id)
      }
      // Only notify if state actually changed
      if (wasHidden !== !visible) {
        cacheInvalidated = true
        notifyListeners(id)
      }
    },

    toggleVisibility(id: TagOrCategory): void {
      if (hiddenSet.has(id)) {
        hiddenSet.delete(id)
      } else {
        hiddenSet.add(id)
      }
      cacheInvalidated = true
      notifyListeners(id)
    },

    isEffectivelyVisible(tags: Tag[]): boolean {
      if (tags.length === 0) return true

      // If ANY tag or category is hidden, the item is hidden
      for (const tag of tags) {
        if (hiddenSet.has(tag.id) || hiddenSet.has(tag.category)) {
          return false
        }
      }

      return true
    },

    getCategoryVisibilityState(categoryId: TagCategoryId, tagIds: TagId[]): CategoryVisibilityState {
      const categoryHidden = hiddenSet.has(categoryId)

      if (categoryHidden) {
        return 'hidden'
      }

      // Category is visible, check individual tag states
      const hiddenCount = tagIds.filter(id => hiddenSet.has(id)).length

      if (hiddenCount === 0) {
        return 'visible'
      } else if (hiddenCount === tagIds.length) {
        return 'hidden'
      } else {
        return 'partial'
      }
    },

    getHiddenTagIds(): Set<TagOrCategory> {
      // Return cached Set if nothing changed since last call
      if (!cacheInvalidated) {
        return cachedHiddenTagIds
      }
      // Create new Set and cache it
      cachedHiddenTagIds = new Set(hiddenSet)
      cacheInvalidated = false
      return cachedHiddenTagIds
    },

    subscribe(callback: () => void): () => void {
      globalListeners.add(callback)
      return () => {
        globalListeners.delete(callback)
      }
    },

    subscribeToTags(tagIds: TagOrCategory[], callback: () => void): () => void {
      tagIds.forEach(id => {
        const listenerSet = listeners.get(id)
        if (listenerSet == null) {
          listeners.set(id, new Set([callback]))
        } else {
          listenerSet.add(callback)
        }
      })

      return () => {
        tagIds.forEach(id => {
          listeners.get(id)?.delete(callback)
        })
      }
    }
  }
}
