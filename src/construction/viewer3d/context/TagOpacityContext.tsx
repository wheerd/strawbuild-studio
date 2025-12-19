import { type ReactNode, createContext, useContext, useMemo, useState } from 'react'

import type { Tag, TagCategoryId, TagId } from '@/construction/tags'

export type TagOrCategory = TagId | TagCategoryId

interface TagOpacityContextValue {
  opacityMap: Map<TagOrCategory, number>
  getTagOrCategoryOpacity: (id: TagOrCategory) => number
  getCategoryOpacityState: (categoryId: TagCategoryId, tagIds: TagId[]) => 'visible' | 'partial' | 'hidden'
  cycleTagOrCategoryOpacity: (id: TagOrCategory) => void
  setTagOrCategoryOpacity: (id: TagOrCategory, opacity: number) => void
  getEffectiveOpacity: (tags: Tag[]) => number
}

const TagOpacityContext = createContext<TagOpacityContextValue | undefined>(undefined)

export interface TagOpacityProviderProps {
  children: ReactNode
  defaultOpacities?: Map<TagOrCategory, number>
}

export function TagOpacityProvider({ children, defaultOpacities }: TagOpacityProviderProps): React.JSX.Element {
  const initialOpacities =
    defaultOpacities ??
    new Map<TagOrCategory, number>([
      ['wall-layer', 0],
      ['floor-layer', 0],
      ['roof-layer', 0]
    ])

  const [opacityMap, setOpacityMap] = useState<Map<TagOrCategory, number>>(initialOpacities)

  const getTagOrCategoryOpacity = (id: TagOrCategory): number => {
    return opacityMap.get(id) ?? 1.0
  }

  const getCategoryOpacityState = (categoryId: TagCategoryId, tagIds: TagId[]): 'visible' | 'partial' | 'hidden' => {
    const categoryOpacity = getTagOrCategoryOpacity(categoryId)

    // If category is hidden, entire category is hidden
    if (categoryOpacity === 0) {
      return 'hidden'
    }

    // Check individual tag opacities
    const tagOpacities = tagIds.map(id => {
      const tagOpacity = getTagOrCategoryOpacity(id)
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
  }

  const setTagOrCategoryOpacity = (id: TagOrCategory, opacity: number): void => {
    setOpacityMap(prev => {
      const next = new Map(prev)
      next.set(id, opacity)
      return next
    })
  }

  const cycleTagOrCategoryOpacity = (id: TagOrCategory): void => {
    const current = getTagOrCategoryOpacity(id)
    const next = current === 1.0 ? 0.5 : current === 0.5 ? 0.0 : 1.0
    setTagOrCategoryOpacity(id, next)
  }

  function getEffectiveOpacity(tags: Tag[]): number {
    if (tags.length === 0) return 1.0

    let minOpacity = 1.0

    tags.forEach(tag => {
      const tagOpacity = opacityMap.get(tag.id) ?? 1.0
      const categoryOpacity = opacityMap.get(tag.category) ?? 1.0
      minOpacity = Math.min(minOpacity, tagOpacity, categoryOpacity)
    })

    return minOpacity
  }

  const value = useMemo(
    () => ({
      opacityMap,
      getTagOrCategoryOpacity,
      getCategoryOpacityState,
      cycleTagOrCategoryOpacity,
      setTagOrCategoryOpacity,
      getEffectiveOpacity
    }),
    [opacityMap]
  )

  return <TagOpacityContext.Provider value={value}>{children}</TagOpacityContext.Provider>
}

export function useTagOpacity(): TagOpacityContextValue {
  const context = useContext(TagOpacityContext)
  if (!context) {
    throw new Error('useTagOpacity must be used within TagOpacityProvider')
  }
  return context
}
