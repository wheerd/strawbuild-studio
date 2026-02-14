import React, { createContext, useContext, useState } from 'react'

import type { PartId } from '@/construction/parts/types'
import type { ConstructionIssueId } from '@/construction/results'

interface PlanHighlightContextValue {
  // Issue highlighting (for errors/warnings)
  hoveredIssueId: ConstructionIssueId | null
  setHoveredIssueId: (id: ConstructionIssueId | null) => void

  // Part highlighting (for jumping from parts list)
  highlightedPartId: PartId | null
  setHighlightedPartId: (id: PartId | null) => void
}

const PlanHighlightContext = createContext<PlanHighlightContextValue | null>(null)

export function PlanHighlightProvider({ children }: { children: React.ReactNode }) {
  const [hoveredIssueId, setHoveredIssueId] = useState<ConstructionIssueId | null>(null)
  const [highlightedPartId, setHighlightedPartId] = useState<PartId | null>(null)

  return (
    <PlanHighlightContext.Provider
      value={{ hoveredIssueId, setHoveredIssueId, highlightedPartId, setHighlightedPartId }}
    >
      {children}
    </PlanHighlightContext.Provider>
  )
}

export function usePlanHighlight() {
  const context = useContext(PlanHighlightContext)
  if (!context) {
    throw new Error('usePlanHighlight must be used within PlanHighlightProvider')
  }
  return context
}
