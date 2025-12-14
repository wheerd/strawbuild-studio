import { CrossCircledIcon } from '@radix-ui/react-icons'
import { Box, Callout, Flex, Skeleton, Spinner, Tabs } from '@radix-ui/themes'
import React, { Suspense, use, useEffect, useState } from 'react'

import { ConstructionPartsList } from '@/construction/components/ConstructionPartsList'
import { ConstructionVirtualPartsList } from '@/construction/components/ConstructionVirtualPartsList'
import { IssueDescriptionPanel } from '@/construction/components/IssueDescriptionPanel'
import { PartHighlightPanel } from '@/construction/components/PartHighlightPanel'
import type { ConstructionModel } from '@/construction/model'
import type { MaterialPartsList, VirtualPartsList } from '@/construction/parts'
import { generateMaterialPartsList, generateVirtualPartsList } from '@/construction/parts'
import { BaseModal } from '@/shared/components/BaseModal'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import { ConstructionPlan, type ViewOption } from './ConstructionPlan'
import './ConstructionPlanModal.css'
import { PlanHighlightProvider, usePlanHighlight } from './context/PlanHighlightContext'
import { type TagOrCategory, TagVisibilityProvider } from './context/TagVisibilityContext'

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
  const [partsDataPromise, setPartsDataPromise] = useState<Promise<PartsData | null> | null>(null)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setActiveTab('plan')
      setPartsDataPromise(null)
      return
    }

    if (open && !modelPromise) {
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
    <BaseModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={title}
      trigger={trigger}
      size="2"
      width="calc(100vw - 2 * var(--space-4))"
      maxWidth="calc(100vw - 2 * var(--space-4))"
      height="calc(100vh - 2 * var(--space-6))"
      maxHeight="calc(100vh - 2 * var(--space-6))"
      resetKeys={[refreshKey]}
      style={{ overflow: 'hidden' }}
      className="plan-modal"
    >
      <PlanHighlightProvider>
        <ModalContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          modelPromise={modelPromise}
          views={views}
          containerSize={containerSize}
          containerRef={containerRef}
          defaultHiddenTags={defaultHiddenTags}
          midCutActiveDefault={midCutActiveDefault}
          partsDataPromise={partsDataPromise}
        />
      </PlanHighlightProvider>
    </BaseModal>
  )
}

function ModalContent({
  activeTab,
  setActiveTab,
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
  modelPromise: Promise<ConstructionModel | null> | null
  views: ViewOption[]
  containerSize: { width: number; height: number }
  containerRef: React.RefCallback<HTMLDivElement>
  defaultHiddenTags?: TagOrCategory[]
  midCutActiveDefault?: boolean
  partsDataPromise: Promise<PartsData | null> | null
}) {
  const { setHighlightedPartId } = usePlanHighlight()

  const handleViewInPlan = (partId: string) => {
    setHighlightedPartId(partId as any)
    setActiveTab('plan')
  }

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={value => setActiveTab(value as 'plan' | 'parts' | 'modules')}
      style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <div className="pb-[2px] mr-6">
        <Tabs.List justify="end">
          <Tabs.Trigger value="plan">Plan & Issues</Tabs.Trigger>
          <Tabs.Trigger value="parts">Parts List</Tabs.Trigger>
          <Tabs.Trigger value="modules">Modules</Tabs.Trigger>
        </Tabs.List>
      </div>

      <Tabs.Content value="plan">
        <Flex direction="column" gap="3" style={{ flex: 1, minHeight: 0 }} className="overflow-hidden">
          <div
            ref={containerRef}
            className="overflow-hidden border border-gray-6 rounded-2"
            style={{ flex: '1 1 100%', minHeight: 0, height: '100%', position: 'relative' }}
          >
            {modelPromise ? (
              <Suspense fallback={<PlanSkeleton />}>
                <TagVisibilityProvider defaultHidden={defaultHiddenTags}>
                  <ConstructionPlanModalContent
                    modelPromise={modelPromise}
                    views={views}
                    containerSize={containerSize}
                    midCutActiveDefault={midCutActiveDefault}
                  />
                </TagVisibilityProvider>
              </Suspense>
            ) : null}
            <PartHighlightPanel />
          </div>

          <Box flexShrink="0" style={{ minHeight: 0 }}>
            {modelPromise ? (
              <Suspense fallback={<PlanSkeleton />}>
                <IssueDescriptionPanel modelPromise={modelPromise} />
              </Suspense>
            ) : null}
          </Box>
        </Flex>
      </Tabs.Content>

      <Tabs.Content value="parts">
        <Box width="100%" height="100%" style={{ overflow: 'auto' }}>
          {partsDataPromise ? (
            <Suspense fallback={<PartsSkeleton />}>
              <PartsTabContent partsDataPromise={partsDataPromise} onViewInPlan={handleViewInPlan} />
            </Suspense>
          ) : (
            <PartsSkeleton />
          )}
        </Box>
      </Tabs.Content>

      <Tabs.Content value="modules">
        <Box width="100%" height="100%" style={{ overflow: 'auto' }}>
          {partsDataPromise ? (
            <Suspense fallback={<PartsSkeleton />}>
              <ModulesTabContent partsDataPromise={partsDataPromise} onViewInPlan={handleViewInPlan} />
            </Suspense>
          ) : (
            <PartsSkeleton />
          )}
        </Box>
      </Tabs.Content>
    </Tabs.Root>
  )
}

function ConstructionPlanModalContent({
  modelPromise,
  views,
  containerSize,
  midCutActiveDefault
}: {
  modelPromise: Promise<ConstructionModel | null>
  views: ViewOption[]
  containerSize: { width: number; height: number }
  midCutActiveDefault?: boolean
}) {
  const constructionModel = use(modelPromise)

  if (!constructionModel) {
    return (
      <Flex align="center" justify="center">
        <Callout.Root color="red" size="2">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>Failed to generate construction model</Callout.Text>
        </Callout.Root>
      </Flex>
    )
  }

  return (
    <ConstructionPlan
      model={constructionModel}
      views={views}
      containerSize={containerSize}
      midCutActiveDefault={midCutActiveDefault}
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
  const partsData = use(partsDataPromise)

  if (partsData == null) {
    return (
      <Flex>
        <Callout.Root color="red" size="2">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>Failed to generate parts list</Callout.Text>
        </Callout.Root>
      </Flex>
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
  const partsData = use(partsDataPromise)

  if (partsData == null) {
    return (
      <Flex>
        <Callout.Root color="red" size="2">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>Failed to generate modules list</Callout.Text>
        </Callout.Root>
      </Flex>
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
    <Flex direction="column" gap="4" height="100%" className="overflow-hidden">
      <CardSkeleton />
      <CardSkeleton />
    </Flex>
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
