import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { IntermediateWallId, PerimeterId, PerimeterWallId, RoofId } from '@/building/model/ids'
import { isIntermediateWallId, isPerimeterId, isPerimeterWallId, isRoofId } from '@/building/model/ids'
import { useActiveStoreyId } from '@/building/store'
import {
  TAG_BASE_PLATE,
  TAG_DECKING,
  TAG_ROOF,
  TAG_SUBFLOOR,
  TAG_TOP_PLATE,
  TAG_WALLS,
  type TagOrCategory
} from '@/construction/model/tags'
import type { ConstructionModelId } from '@/construction/store'

import type { ViewOption } from './ConstructionPlan'
import { BACK_VIEW, FRONT_VIEW, LEFT_VIEW, TOP_VIEW } from './ConstructionPlan'

export type FocusType = 'storey' | 'perimeter' | 'wall' | 'interiorWall' | 'roof' | null

interface PlanViewContextValue {
  focusId: string | null
  focusType: FocusType
  viewOptions: ViewOption[]
  currentViewIndex: number
  setCurrentViewIndex: (index: number) => void
  modelId: ConstructionModelId
  defaultHiddenTags: TagOrCategory[]
  midCutActiveDefault: boolean
  clearFocus: () => void
}

const PlanViewContext = createContext<PlanViewContextValue | null>(null)

const STOREY_VIEWS: ViewOption[] = [
  {
    view: TOP_VIEW,
    label: $ => $.plan.views.walls,
    alwaysHiddenTags: [TAG_ROOF.id, 'roof-measurement', 'floor-measurement']
  },
  {
    view: TOP_VIEW,
    label: $ => $.plan.views.roof,
    alwaysHiddenTags: ['wall-measurement', 'opening-measurement', 'floor-measurement'],
    toggleHideTags: [TAG_DECKING.id]
  },
  {
    view: TOP_VIEW,
    label: $ => $.plan.views.floor,
    alwaysHiddenTags: [
      TAG_WALLS.id,
      TAG_BASE_PLATE.id,
      TAG_TOP_PLATE.id,
      TAG_ROOF.id,
      'wall-measurement',
      'roof-measurement',
      'opening-measurement'
    ],
    toggleHideTags: [TAG_SUBFLOOR.id]
  }
]

const WALL_VIEWS: ViewOption[] = [
  { view: FRONT_VIEW, label: $ => $.plan.views.outside, alwaysHiddenTags: ['wall-layer'] },
  { view: BACK_VIEW, label: $ => $.plan.views.inside, alwaysHiddenTags: ['wall-layer'] },
  { view: TOP_VIEW, label: $ => $.plan.views.top, alwaysHiddenTags: ['wall-layer'] }
]

const INTERIOR_WALL_VIEWS: ViewOption[] = [
  { view: FRONT_VIEW, label: $ => $.plan.views.leftSide, alwaysHiddenTags: ['wall-layer'] },
  { view: BACK_VIEW, label: $ => $.plan.views.rightSide, alwaysHiddenTags: ['wall-layer'] },
  { view: TOP_VIEW, label: $ => $.plan.views.top, alwaysHiddenTags: ['wall-layer'] }
]

const ROOF_VIEWS: ViewOption[] = [
  { view: TOP_VIEW, label: $ => $.plan.views.top, toggleHideTags: [TAG_DECKING.id] },
  { view: FRONT_VIEW, label: $ => $.plan.views.front },
  { view: LEFT_VIEW, label: $ => $.plan.views.left }
]

const STOREY_DEFAULT_HIDDEN: TagOrCategory[] = ['floor-layer', 'wall-layer', 'roof-layer', 'finished-measurement']
const WALL_DEFAULT_HIDDEN: TagOrCategory[] = ['wall-layer']
const ROOF_DEFAULT_HIDDEN: TagOrCategory[] = ['roof-layer']

function determineFocusType(focusId: string | undefined): FocusType {
  if (!focusId) return null
  if (isPerimeterId(focusId)) return 'perimeter'
  if (isPerimeterWallId(focusId)) return 'wall'
  if (isIntermediateWallId(focusId)) return 'interiorWall'
  if (isRoofId(focusId)) return 'roof'
  return null
}

function getViewConfig(focusType: FocusType): {
  viewOptions: ViewOption[]
  defaultHiddenTags: TagOrCategory[]
  midCutActiveDefault: boolean
} {
  switch (focusType) {
    case 'wall':
      return { viewOptions: WALL_VIEWS, defaultHiddenTags: WALL_DEFAULT_HIDDEN, midCutActiveDefault: true }
    case 'interiorWall':
      return {
        viewOptions: INTERIOR_WALL_VIEWS,
        defaultHiddenTags: WALL_DEFAULT_HIDDEN,
        midCutActiveDefault: true
      }
    case 'roof':
      return { viewOptions: ROOF_VIEWS, defaultHiddenTags: ROOF_DEFAULT_HIDDEN, midCutActiveDefault: false }
    case 'perimeter':
    case null:
    default:
      return { viewOptions: STOREY_VIEWS, defaultHiddenTags: STOREY_DEFAULT_HIDDEN, midCutActiveDefault: true }
  }
}

export function PlanViewProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { focusId: focusIdParam } = useParams<{ focusId?: string }>()
  const navigate = useNavigate()
  const activeStoreyId = useActiveStoreyId()

  const focusId = focusIdParam ?? null
  const focusType = useMemo(() => determineFocusType(focusIdParam), [focusIdParam])

  const [currentViewIndex, setCurrentViewIndex] = useState(0)

  const { viewOptions, defaultHiddenTags, midCutActiveDefault } = useMemo(() => getViewConfig(focusType), [focusType])

  const modelId: ConstructionModelId = useMemo(() => {
    if (focusType === null) return activeStoreyId
    if (focusType === 'perimeter') return focusId as PerimeterId
    if (focusType === 'wall') return focusId as PerimeterWallId
    if (focusType === 'interiorWall') return focusId as IntermediateWallId
    if (focusType === 'roof') return focusId as RoofId
    return undefined
  }, [focusType, focusId, activeStoreyId])

  const clearFocus = useMemo(
    () => () => {
      void navigate('/plan')
    },
    [navigate]
  )

  useEffect(() => {
    setCurrentViewIndex(0)
  }, [focusId])

  const previousStoreyIdRef = useRef(activeStoreyId)
  useEffect(() => {
    if (previousStoreyIdRef.current !== activeStoreyId && focusId) {
      clearFocus()
    }
    previousStoreyIdRef.current = activeStoreyId
  }, [activeStoreyId, focusId, clearFocus])

  const value: PlanViewContextValue = useMemo(
    () => ({
      focusId,
      focusType,
      viewOptions,
      currentViewIndex,
      setCurrentViewIndex,
      modelId,
      defaultHiddenTags,
      midCutActiveDefault,
      clearFocus
    }),
    [focusId, focusType, viewOptions, currentViewIndex, modelId, defaultHiddenTags, midCutActiveDefault, clearFocus]
  )

  return <PlanViewContext.Provider value={value}>{children}</PlanViewContext.Provider>
}

export function usePlanView(): PlanViewContextValue {
  const context = useContext(PlanViewContext)
  if (!context) {
    throw new Error('usePlanView must be used within PlanViewProvider')
  }
  return context
}
