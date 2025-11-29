import { type ReactNode, createContext, useContext, useState } from 'react'

import type { TagCategoryId } from '@/construction/tags'

interface OpacityControlContextValue {
  getOpacityForCategory: (category: TagCategoryId) => number
  setOpacityForCategory: (category: TagCategoryId, opacity: number) => void
  cycleOpacityForCategory: (category: TagCategoryId) => void
}

const OpacityControlContext = createContext<OpacityControlContextValue | undefined>(undefined)

export function OpacityControlProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const initialOpacity = new Map<TagCategoryId, number>([
    ['wall-layer', 0],
    ['floor-layer', 0],
    ['roof-layer', 0]
  ])
  const [categoryOpacity, setCategoryOpacity] = useState<Map<TagCategoryId, number>>(initialOpacity)

  const getOpacityForCategory = (category: TagCategoryId): number => {
    return categoryOpacity.get(category) ?? 1.0
  }

  const setOpacityForCategory = (category: TagCategoryId, opacity: number): void => {
    setCategoryOpacity(prev => {
      const next = new Map(prev)
      next.set(category, opacity)
      return next
    })
  }

  const cycleOpacityForCategory = (category: TagCategoryId): void => {
    const current = getOpacityForCategory(category)
    const next = current === 1.0 ? 0.5 : current === 0.5 ? 0.0 : 1.0
    setOpacityForCategory(category, next)
  }

  return (
    <OpacityControlContext.Provider value={{ getOpacityForCategory, setOpacityForCategory, cycleOpacityForCategory }}>
      {children}
    </OpacityControlContext.Provider>
  )
}

export function useOpacityControl(): OpacityControlContextValue {
  const context = useContext(OpacityControlContext)
  if (!context) {
    throw new Error('useOpacityControl must be used within OpacityControlProvider')
  }
  return context
}
