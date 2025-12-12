import { type ReactNode, createContext, useContext, useMemo, useState } from 'react'

import type { TagCategoryId, TagId } from '@/construction/tags'

export type TagOrCategory = TagId | TagCategoryId

interface TagVisibilityContextValue {
  hiddenTagIds: Set<TagOrCategory>
  isTagOrCategoryVisible: (tagId: TagOrCategory) => boolean
  getCategoryVisibilityState: (categoryId: TagCategoryId, tagIds: TagId[]) => 'visible' | 'partial' | 'hidden'
  toggleTagOrCategory: (tagId: TagOrCategory) => void
}

const TagVisibilityContext = createContext<TagVisibilityContextValue | undefined>(undefined)

export interface TagVisibilityProviderProps {
  children: ReactNode
  defaultHidden?: TagOrCategory[]
}

export function TagVisibilityProvider({ children, defaultHidden = [] }: TagVisibilityProviderProps): React.JSX.Element {
  const [hiddenTagIds, setHiddenTagIds] = useState<Set<TagOrCategory>>(new Set(defaultHidden))

  const isTagOrCategoryVisible = (tagId: TagOrCategory): boolean => {
    return !hiddenTagIds.has(tagId)
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

  const toggleTagOrCategory = (tagId: TagOrCategory): void => {
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

  const value = useMemo(
    () => ({
      hiddenTagIds,
      isTagOrCategoryVisible,
      getCategoryVisibilityState,
      toggleTagOrCategory
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
