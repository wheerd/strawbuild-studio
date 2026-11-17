import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { IntermediateWallId, PerimeterId, PerimeterWallId, RoofId, StoreyId } from '@/building/model/ids'
import { isIntermediateWallId, isPerimeterId, isPerimeterWallId, isRoofId, isStoreyId } from '@/building/model/ids'
import { useActiveStoreyId } from '@/building/store'
import type { ConstructionModelId } from '@/construction/store'

export type PartsListFocusType = 'storey' | 'perimeter' | 'wall' | 'interiorWall' | 'roof' | null

interface PartsListViewContextValue {
  focusId: string | null
  focusType: PartsListFocusType
  modelId: ConstructionModelId
  clearFocus: () => void
}

const PartsListViewContext = createContext<PartsListViewContextValue | null>(null)

function determineFocusType(focusId: string | undefined): PartsListFocusType {
  if (!focusId) return null
  if (isStoreyId(focusId)) return 'storey'
  if (isPerimeterId(focusId)) return 'perimeter'
  if (isPerimeterWallId(focusId)) return 'wall'
  if (isIntermediateWallId(focusId)) return 'interiorWall'
  if (isRoofId(focusId)) return 'roof'
  return null
}

export function PartsListViewProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { focusId: focusIdParam } = useParams<{ focusId?: string }>()
  const navigate = useNavigate()
  const activeStoreyId = useActiveStoreyId()

  const focusId = focusIdParam ?? null
  const focusType = useMemo(() => determineFocusType(focusIdParam), [focusIdParam])

  const modelId: ConstructionModelId = useMemo(() => {
    switch (focusType) {
      case null:
        return undefined
      case 'storey':
        return focusId as StoreyId
      case 'perimeter':
        return focusId as PerimeterId
      case 'wall':
        return focusId as PerimeterWallId
      case 'interiorWall':
        return focusId as IntermediateWallId
      case 'roof':
        return focusId as RoofId
    }
  }, [focusType, focusId])

  const clearFocus = useMemo(
    () => () => {
      if (focusId) {
        void navigate('..', { replace: true, relative: 'path' })
      }
    },
    [navigate, focusId]
  )

  const previousStoreyIdRef = useRef(activeStoreyId)
  useEffect(() => {
    if (previousStoreyIdRef.current !== activeStoreyId && focusId) {
      clearFocus()
    }
    previousStoreyIdRef.current = activeStoreyId
  }, [activeStoreyId, focusId, clearFocus])

  const value: PartsListViewContextValue = useMemo(
    () => ({
      focusId,
      focusType,
      modelId,
      clearFocus
    }),
    [focusId, focusType, modelId, clearFocus]
  )

  return <PartsListViewContext.Provider value={value}>{children}</PartsListViewContext.Provider>
}

export function usePartsListView(): PartsListViewContextValue {
  const context = useContext(PartsListViewContext)
  if (!context) {
    throw new Error('usePartsListView must be used within PartsListViewProvider')
  }
  return context
}
