import { type ReactNode, createContext, useContext, useMemo, useState } from 'react'

import type { TagCategoryId, TagId } from '@/construction/tags'

export type TagOrCategory = TagId | TagCategoryId

interface TagVisibilityContextValue {
  hiddenTagIds: Set<TagOrCategory>
  isTagVisible: (tagId: TagOrCategory) => boolean
  isCategoryVisible: (categoryId: TagCategoryId) => boolean
  getCategoryVisibilityState: (categoryId: TagCategoryId, tagIds: TagId[]) => 'visible' | 'partial' | 'hidden'
  toggleTag: (tagId: TagId) => void
  toggleCategory: (categoryId: TagCategoryId) => void
}

const TagVisibilityContext = createContext<TagVisibilityContextValue | undefined>(undefined)

export interface TagVisibilityProviderProps {
  children: ReactNode
  defaultHidden?: TagOrCategory[]
}

export function TagVisibilityProvider({ children, defaultHidden = [] }: TagVisibilityProviderProps): React.JSX.Element {
  const [hiddenTagIds, setHiddenTagIds] = useState<Set<TagOrCategory>>(new Set(defaultHidden))

  const isTagVisible = (tagId: TagOrCategory): boolean => {
    return !hiddenTagIds.has(tagId)
  }

  const isCategoryVisible = (categoryId: TagCategoryId): boolean => {
    return !hiddenTagIds.has(categoryId)
  }

  const getCategoryVisibilityState = (categoryId: TagCategoryId, tagIds: TagId[]): 'visible' | 'partial' | 'hidden' => {
    const categoryHidden = hiddenTagIds.has(categoryId)

    if (categoryHidden) {
      return 'hidden'
    }

    // Category is visible, check tag states
    const hiddenCount = tagIds.filter(id => hiddenTagIds.has(id)).length

    if (hiddenCount === 0) {
      return 'visible'
    } else if (hiddenCount === tagIds.length) {
      return 'hidden'
    } else {
      return 'partial'
    }
  }

  const toggleTag = (tagId: TagId): void => {
    setHiddenTagIds(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }

  const toggleCategory = (categoryId: TagCategoryId): void => {
    setHiddenTagIds(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const value = useMemo(
    () => ({
      hiddenTagIds,
      isTagVisible,
      isCategoryVisible,
      getCategoryVisibilityState,
      toggleTag,
      toggleCategory
    }),
    [hiddenTagIds]
  )

  return <TagVisibilityContext.Provider value={value}>{children}</TagVisibilityContext.Provider>
}

export function useTagVisibility(): TagVisibilityContextValue {
  const context = useContext(TagVisibilityContext)
  if (!context) {
    throw new Error('useTagVisibility must be used within TagVisibilityProvider')
  }
  return context
}
