import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FullScreenModal } from '@/components/ui/full-screen-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs } from '@/components/ui/tabs'
import { ConstructionPartsList } from '@/construction/components/parts/ConstructionPartsList'
import { ConstructionVirtualPartsList } from '@/construction/components/parts/ConstructionVirtualPartsList'
import { IssueDescriptionPanel } from '@/construction/components/plan/IssueDescriptionPanel'
import { PartHighlightPanel } from '@/construction/components/plan/PartHighlightPanel'
import type { PartId } from '@/construction/parts'
import { type ConstructionModelId, useConstructionModel } from '@/construction/store'
import type { TagOrCategory } from '@/construction/tags'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import { ConstructionModelStatusBanner } from './ConstructionModelStatusBanner'
import { ConstructionPlan, type ViewOption } from './plan/ConstructionPlan'
import { PlanHighlightProvider, usePlanHighlight } from './plan/PlanHighlightContext'
import { TagVisibilityProvider } from './plan/TagVisibilityContext'

export interface ConstructionModalProps {
  title: string
  modelId: ConstructionModelId
  views: ViewOption[]
  trigger: React.ReactNode
  defaultHiddenTags?: TagOrCategory[]
  midCutActiveDefault?: boolean
}

export function ConstructionPlanModal({
  title,
  modelId,
  views,
  trigger,
  defaultHiddenTags,
  midCutActiveDefault
}: ConstructionModalProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'plan' | 'parts' | 'modules'>('plan')
  const [currentViewIndex, setCurrentViewIndex] = useState(0)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setActiveTab('plan')
      setCurrentViewIndex(0)
    }
  }

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
          modelId={modelId}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentViewIndex={currentViewIndex}
          setCurrentViewIndex={setCurrentViewIndex}
          views={views}
          containerSize={containerSize}
          containerRef={containerRef}
          defaultHiddenTags={defaultHiddenTags}
          midCutActiveDefault={midCutActiveDefault}
        />
      </PlanHighlightProvider>
    </FullScreenModal>
  )
}

function ModalContent({
  modelId,
  activeTab,
  setActiveTab,
  currentViewIndex,
  setCurrentViewIndex,
  views,
  containerSize,
  containerRef,
  defaultHiddenTags,
  midCutActiveDefault
}: {
  modelId: ConstructionModelId
  activeTab: 'plan' | 'parts' | 'modules'
  setActiveTab: (tab: 'plan' | 'parts' | 'modules') => void
  currentViewIndex: number
  setCurrentViewIndex: (index: number) => void
  views: ViewOption[]
  containerSize: { width: number; height: number }
  containerRef: React.RefCallback<HTMLDivElement>
  defaultHiddenTags?: TagOrCategory[]
  midCutActiveDefault?: boolean
}) {
  const { t } = useTranslation('construction')
  const { setHighlightedPartId } = usePlanHighlight()

  const model = useConstructionModel(modelId)

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
      className="-mt-2 flex h-full w-full flex-col"
    >
      <div className="relative flex shrink-0 items-center justify-between">
        <Tabs.List>
          <Tabs.Trigger value="plan">{t($ => $.planModal.tabs.planIssues)}</Tabs.Trigger>
          <Tabs.Trigger value="parts">{t($ => $.planModal.tabs.partsList)}</Tabs.Trigger>
          <Tabs.Trigger value="modules">{t($ => $.planModal.tabs.modules)}</Tabs.Trigger>
        </Tabs.List>
        <ConstructionModelStatusBanner />
      </div>
      <Tabs.Content value="plan" className="flex min-h-0 flex-1 p-0">
        {model ? (
          <div className="flex h-full w-full flex-col gap-2 overflow-hidden">
            <div ref={containerRef} className="relative flex min-h-0 flex-1 overflow-hidden rounded-md border">
              <TagVisibilityProvider defaultHidden={defaultHiddenTags}>
                <ConstructionPlan
                  model={model}
                  views={views}
                  containerSize={containerSize}
                  midCutActiveDefault={midCutActiveDefault}
                  currentViewIndex={currentViewIndex}
                  setCurrentViewIndex={setCurrentViewIndex}
                />
              </TagVisibilityProvider>
              <PartHighlightPanel />
            </div>

            <div className="flex w-full shrink-0">
              <IssueDescriptionPanel model={model} />
            </div>
          </div>
        ) : (
          <PlanSkeleton />
        )}
      </Tabs.Content>
      <Tabs.Content value="parts" className="flex min-h-0 flex-1 flex-col overflow-auto pt-3">
        {model ? <ConstructionPartsList modelId={modelId} onViewInPlan={handleViewInPlan} /> : <PartsSkeleton />}
      </Tabs.Content>
      <Tabs.Content value="modules" className="flex min-h-0 flex-1 flex-col overflow-auto pt-3">
        {model ? <ConstructionVirtualPartsList modelId={modelId} onViewInPlan={handleViewInPlan} /> : <PartsSkeleton />}
      </Tabs.Content>
    </Tabs.Root>
  )
}

function PlanSkeleton() {
  return (
    <div className="relative h-full w-full">
      <Skeleton height="95vh" />
      <div className="absolute top-[30%] left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 scale-[3]">
        <Spinner size="lg" />
      </div>
      <div className="absolute top-[12px] left-[12px] z-10">
        <Skeleton height="48px" width="90px" className="rounded-lg shadow-lg" />
      </div>
    </div>
  )
}

function PartsSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}

function CardSkeleton() {
  return <Skeleton className="h-[160px] rounded-lg" />
}
