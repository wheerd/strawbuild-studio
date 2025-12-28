import type { Tag, TagCategoryId, TagId, TagOrCategory } from '@/construction/tags'

export type OpacityValue = 0 | 0.5 | 1.0

export type CategoryOpacityState = 'visible' | 'partial' | 'hidden'

export interface TagOpacityStore {
  getOpacity(id: TagOrCategory): number
  setOpacity(id: TagOrCategory, opacity: number): void
  cycleOpacity(id: TagOrCategory): void
  getEffectiveOpacity(tags: Tag[]): number
  getCategoryOpacityState(categoryId: TagCategoryId, tagIds: TagId[]): CategoryOpacityState
  subscribe(callback: () => void): () => void
  subscribeToTags(tagIds: TagOrCategory[], callback: () => void): () => void
}

interface CreateTagOpacityStoreOptions {
  initialOpacities?: Map<TagOrCategory, number>
}

export function createTagOpacityStore(options?: CreateTagOpacityStoreOptions): TagOpacityStore {
  const opacityMap = new Map<TagOrCategory, number>(
    options?.initialOpacities ?? [
      ['wall-layer', 0],
      ['floor-layer', 0],
      ['roof-layer', 0]
    ]
  )

  // Map of tag/category ID -> Set of listener callbacks
  const listeners = new Map<TagOrCategory, Set<() => void>>()

  // Global listeners (e.g., for the menu that needs all updates)
  const globalListeners = new Set<() => void>()

  function notifyListeners(id: TagOrCategory): void {
    // Notify listeners for this specific tag/category
    const tagListeners = listeners.get(id)
    if (tagListeners) {
      tagListeners.forEach(listener => listener())
    }

    // Notify global listeners
    globalListeners.forEach(listener => listener())
  }

  return {
    getOpacity(id: TagOrCategory): number {
      return opacityMap.get(id) ?? 1.0
    },

    setOpacity(id: TagOrCategory, opacity: number): void {
      opacityMap.set(id, opacity)
      notifyListeners(id)
    },

    cycleOpacity(id: TagOrCategory): void {
      const current = this.getOpacity(id)
      const next = current === 1.0 ? 0.5 : current === 0.5 ? 0.0 : 1.0
      this.setOpacity(id, next)
    },

    getEffectiveOpacity(tags: Tag[]): number {
      if (tags.length === 0) return 1.0

      let minOpacity = 1.0

      tags.forEach(tag => {
        const tagOpacity = opacityMap.get(tag.id) ?? 1.0
        const categoryOpacity = opacityMap.get(tag.category) ?? 1.0
        minOpacity = Math.min(minOpacity, tagOpacity, categoryOpacity)
      })

      return minOpacity
    },

    getCategoryOpacityState(categoryId: TagCategoryId, tagIds: TagId[]): CategoryOpacityState {
      const categoryOpacity = this.getOpacity(categoryId)

      // If category is hidden, entire category is hidden
      if (categoryOpacity === 0) {
        return 'hidden'
      }

      // Check individual tag opacities
      const tagOpacities = tagIds.map(id => {
        const tagOpacity = this.getOpacity(id)
        // Effective opacity is minimum of tag and category
        return Math.min(tagOpacity, categoryOpacity)
      })

      const hiddenCount = tagOpacities.filter(opacity => opacity === 0).length
      const visibleCount = tagOpacities.filter(opacity => opacity === 1.0).length

      if (categoryOpacity === 0.5 || tagOpacities.some(opacity => opacity === 0.5)) {
        // If category is semi-transparent or any tag is semi-transparent, it's partial
        return 'partial'
      }

      if (hiddenCount === tagIds.length) {
        return 'hidden'
      } else if (visibleCount === tagIds.length) {
        return 'visible'
      } else {
        return 'partial'
      }
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
