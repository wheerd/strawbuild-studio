import { CrossCircledIcon } from '@radix-ui/react-icons'
import React, { Suspense, use, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FullScreenModal } from '@/components/ui/full-screen-modal'
import { ConstructionPartsList } from '@/construction/components/parts/ConstructionPartsList'
import { ConstructionVirtualPartsList } from '@/construction/components/parts/ConstructionVirtualPartsList'
import { IssueDescriptionPanel } from '@/construction/components/plan/IssueDescriptionPanel'
import { PartHighlightPanel } from '@/construction/components/plan/PartHighlightPanel'
import type { ConstructionModel } from '@/construction/model'
import type { MaterialPartsList, PartId, VirtualPartsList } from '@/construction/parts'
import { generateMaterialPartsList, generateVirtualPartsList } from '@/construction/parts'
import type { TagOrCategory } from '@/construction/tags'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import './ConstructionPlanModal.css'
import { ConstructionPlan, type ViewOption } from './plan/ConstructionPlan'
import { PlanHighlightProvider, usePlanHighlight } from './plan/PlanHighlightContext'
import { TagVisibilityProvider } from './plan/TagVisibilityContext'

interface PartsData {
  material: MaterialPartsList
  virtual: VirtualPartsList
}

export interface ConstructionModalProps {
  title: string
  constructionModelFactory: () => Promise<ConstructionModel | null>
  views: ViewOption[]
  trigger: React.ReactNode
  refreshKey?: unknown
  defaultHiddenTags?: TagOrCategory[]
  midCutActiveDefault?: boolean
}

export function ConstructionPlanModal({
  title,
  constructionModelFactory,
  views,
  trigger,
  refreshKey,
  defaultHiddenTags,
  midCutActiveDefault
}: ConstructionModalProps): React.JSX.Element {
  const [modelPromise, setModelPromise] = useState<Promise<ConstructionModel | null> | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'plan' | 'parts' | 'modules'>('plan')
  const [currentViewIndex, setCurrentViewIndex] = useState(0)
  const [partsDataPromise, setPartsDataPromise] = useState<Promise<PartsData | null> | null>(null)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setActiveTab('plan')
      setCurrentViewIndex(0)
      setPartsDataPromise(null)
      return
    }

    if (!modelPromise) {
      const nextModelPromise = constructionModelFactory()
      setModelPromise(nextModelPromise)
      setPartsDataPromise(null)
    }
  }

  useEffect(() => {
    if (isOpen && refreshKey !== undefined) {
      const nextModelPromise = constructionModelFactory()
      setModelPromise(nextModelPromise)
      setPartsDataPromise(null)
    }
  }, [refreshKey, isOpen, constructionModelFactory])

  useEffect(() => {
    if (!isOpen) return
    if (activeTab !== 'parts' && activeTab !== 'modules') return
    if (!modelPromise) return
    setPartsDataPromise(prev => {
      if (prev) return prev
      return modelPromise.then(model => {
        if (!model) return null
        return {
          material: generateMaterialPartsList(model),
          virtual: generateVirtualPartsList(model)
        }
      })
    })
  }, [activeTab, isOpen, modelPromise])

  const [containerSize, containerRef] = elementSizeRef()

  return (
    <FullScreenModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={title}
      trigger={trigger}
      aria-describedby={undefined}
    >
      <PlanHighlightProvider>
        <ModalContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentViewIndex={currentViewIndex}
          setCurrentViewIndex={setCurrentViewIndex}
          modelPromise={modelPromise}
          views={views}
          containerSize={containerSize}
          containerRef={containerRef}
          defaultHiddenTags={defaultHiddenTags}
          midCutActiveDefault={midCutActiveDefault}
          partsDataPromise={partsDataPromise}
        />
      </PlanHighlightProvider>
    </FullScreenModal>
  )
}

function ModalContent({
  activeTab,
  setActiveTab,
  currentViewIndex,
  setCurrentViewIndex,
  modelPromise,
  views,
  containerSize,
  containerRef,
  defaultHiddenTags,
  midCutActiveDefault,
  partsDataPromise
}: {
  activeTab: 'plan' | 'parts' | 'modules'
  setActiveTab: (tab: 'plan' | 'parts' | 'modules') => void
  currentViewIndex: number
  setCurrentViewIndex: (index: number) => void
  modelPromise: Promise<ConstructionModel | null> | null
  views: ViewOption[]
  containerSize: { width: number; height: number }
  containerRef: React.RefCallback<HTMLDivElement>
  defaultHiddenTags?: TagOrCategory[]
  midCutActiveDefault?: boolean
  partsDataPromise: Promise<PartsData | null> | null
}) {
  const { t } = useTranslation('construction')
  const { setHighlightedPartId } = usePlanHighlight()

  const handleViewInPlan = (partId: string) => {
    setHighlightedPartId(partId as PartId)
    setActiveTab('plan')
  }

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={value => {
        setActiveTab(value as 'plan' | 'parts' | 'modules')
      }}
      className="flex flex-col h-full -mt-2 "
    >
      <div className="flex flex-shrink-0">
        <Tabs.List>
          <Tabs.Trigger value="plan">{t($ => $.planModal.tabs.planIssues)}</Tabs.Trigger>
          <Tabs.Trigger value="parts">{t($ => $.planModal.tabs.partsList)}</Tabs.Trigger>
          <Tabs.Trigger value="modules">{t($ => $.planModal.tabs.modules)}</Tabs.Trigger>
        </Tabs.List>
      </div>
      <Tabs.Content value="plan" className="flex flex-1 min-h-0 pt-3">
        <div className="flex flex-col gap-3 h-full overflow-hidden">
          <div
            ref={containerRef}
            className="flex flex-1 min-h-0 overflow-hidden border rounded-md"
            style={{
              position: 'relative',
              borderColor: 'var(--gray-6)'
            }}
          >
            {modelPromise ? (
              <Suspense fallback={<PlanSkeleton />}>
                <TagVisibilityProvider defaultHidden={defaultHiddenTags}>
                  <ConstructionPlanModalContent
                    modelPromise={modelPromise}
                    views={views}
                    containerSize={containerSize}
                    midCutActiveDefault={midCutActiveDefault}
                    currentViewIndex={currentViewIndex}
                    setCurrentViewIndex={setCurrentViewIndex}
                  />
                </TagVisibilityProvider>
              </Suspense>
            ) : null}
            <PartHighlightPanel />
          </div>

          <div className="flex flex-shrink-0">
            {modelPromise ? (
              <Suspense fallback={<PlanSkeleton />}>
                <IssueDescriptionPanel modelPromise={modelPromise} />
              </Suspense>
            ) : null}
          </div>
        </div>
      </Tabs.Content>
      <Tabs.Content value="parts" className="flex flex-1 min-h-0 overflow-auto pt-3">
        {partsDataPromise ? (
          <Suspense fallback={<PartsSkeleton />}>
            <PartsTabContent partsDataPromise={partsDataPromise} onViewInPlan={handleViewInPlan} />
          </Suspense>
        ) : (
          <PartsSkeleton />
        )}
      </Tabs.Content>
      <Tabs.Content value="modules" className="flex flex-1 min-h-0 overflow-auto pt-3">
        {partsDataPromise ? (
          <Suspense fallback={<PartsSkeleton />}>
            <ModulesTabContent partsDataPromise={partsDataPromise} onViewInPlan={handleViewInPlan} />
          </Suspense>
        ) : (
          <PartsSkeleton />
        )}
      </Tabs.Content>
    </Tabs.Root>
  )
}

function ConstructionPlanModalContent({
  modelPromise,
  views,
  containerSize,
  midCutActiveDefault,
  currentViewIndex,
  setCurrentViewIndex
}: {
  modelPromise: Promise<ConstructionModel | null>
  views: ViewOption[]
  containerSize: { width: number; height: number }
  midCutActiveDefault?: boolean
  currentViewIndex: number
  setCurrentViewIndex: (index: number) => void
}) {
  const { t } = useTranslation('construction')
  const constructionModel = use(modelPromise)

  if (!constructionModel) {
    return (
      <div className="flex items-center justify-center">
        <Callout className="text-destructive" size="2">
          <CalloutIcon>
            <CrossCircledIcon />
          </CalloutIcon>
          <CalloutText>{t($ => $.planModal.errors.failedModel)}</CalloutText>
        </Callout>
      </div>
    )
  }

  return (
    <ConstructionPlan
      model={constructionModel}
      views={views}
      containerSize={containerSize}
      midCutActiveDefault={midCutActiveDefault}
      currentViewIndex={currentViewIndex}
      setCurrentViewIndex={setCurrentViewIndex}
    />
  )
}

function PartsTabContent({
  partsDataPromise,
  onViewInPlan
}: {
  partsDataPromise: Promise<PartsData | null>
  onViewInPlan: (partId: string) => void
}) {
  const { t } = useTranslation('construction')
  const partsData = use(partsDataPromise)

  if (partsData == null) {
    return (
      <div className="flex">
        <Callout className="text-destructive" size="2">
          <CalloutIcon>
            <CrossCircledIcon />
          </CalloutIcon>
          <CalloutText>{t($ => $.planModal.errors.failedPartsList)}</CalloutText>
        </Callout>
      </div>
    )
  }

  return <ConstructionPartsList partsList={partsData.material} onViewInPlan={onViewInPlan} />
}

function ModulesTabContent({
  partsDataPromise,
  onViewInPlan
}: {
  partsDataPromise: Promise<PartsData | null>
  onViewInPlan: (partId: string) => void
}) {
  const { t } = useTranslation('construction')
  const partsData = use(partsDataPromise)

  if (partsData == null) {
    return (
      <div className="flex">
        <Callout className="text-destructive" size="2">
          <CalloutIcon>
            <CrossCircledIcon />
          </CalloutIcon>
          <CalloutText>{t($ => $.planModal.errors.failedModulesList)}</CalloutText>
        </Callout>
      </div>
    )
  }

  return <ConstructionVirtualPartsList partsList={partsData.virtual} onViewInPlan={onViewInPlan} />
}

function PlanSkeleton() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Skeleton height="95vh" />
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(3)',
          zIndex: 10
        }}
      >
        <Spinner size="3" />
      </div>
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 10
        }}
      >
        <Skeleton
          height="48px"
          width="90px"
          style={{
            borderRadius: 'var(--radius-3)',
            boxShadow: 'var(--shadow-3)'
          }}
        />
      </div>
    </div>
  )
}

function PartsSkeleton() {
  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}

function CardSkeleton() {
  return (
    <Skeleton
      style={{
        height: '160px',
        borderRadius: 'var(--radius-3)'
      }}
    />
  )
}
