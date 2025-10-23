import { CrossCircledIcon } from '@radix-ui/react-icons'
import { Box, Callout, Flex, Skeleton, Spinner, Tabs } from '@radix-ui/themes'
import React, { Suspense, use, useEffect, useState } from 'react'

import { ConstructionPartsList } from '@/construction/components/ConstructionPartsList'
import { ConstructionVirtualPartsList } from '@/construction/components/ConstructionVirtualPartsList'
import { IssueDescriptionPanel } from '@/construction/components/IssueDescriptionPanel'
import type { ConstructionModel } from '@/construction/model'
import type { MaterialPartsList, VirtualPartsList } from '@/construction/parts'
import { generateMaterialPartsList, generateVirtualPartsList } from '@/construction/parts'
import { BaseModal } from '@/shared/components/BaseModal'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import { ConstructionPlan, type ViewOption, type VisibilityToggleConfig } from './ConstructionPlan'
import './ConstructionPlanModal.css'

interface PartsData { material: MaterialPartsList; virtual: VirtualPartsList }

export interface ConstructionModalProps {
  title: string
  constructionModelFactory: () => Promise<ConstructionModel | null>
  views: ViewOption[]
  trigger: React.ReactNode
  refreshKey?: unknown
  visibilityToggles?: VisibilityToggleConfig[]
}

export function ConstructionPlanModal({
  title,
  constructionModelFactory,
  views,
  trigger,
  refreshKey,
  visibilityToggles
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
              style={{ flex: '1 1 100%', minHeight: 0, height: '100%' }}
            >
              {modelPromise ? (
                <Suspense fallback={<PlanSkeleton />}>
                  <ConstructionPlanModalContent
                    modelPromise={modelPromise}
                    views={views}
                    containerSize={containerSize}
                    visibilityToggles={visibilityToggles}
                  />
                </Suspense>
              ) : null}
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
                <PartsTabContent partsDataPromise={partsDataPromise} />
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
                <ModulesTabContent partsDataPromise={partsDataPromise} />
              </Suspense>
            ) : (
              <PartsSkeleton />
            )}
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </BaseModal>
  )
}

function ConstructionPlanModalContent({
  modelPromise,
  views,
  containerSize,
  visibilityToggles
}: {
  modelPromise: Promise<ConstructionModel | null>
  views: ViewOption[]
  containerSize: { width: number; height: number }
  visibilityToggles?: VisibilityToggleConfig[]
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
      midCutActiveDefault
      visibilityToggles={visibilityToggles}
    />
  )
}

function PartsTabContent({ partsDataPromise }: { partsDataPromise: Promise<PartsData | null> }) {
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

  return <ConstructionPartsList partsList={partsData.material} />
}

function ModulesTabContent({ partsDataPromise }: { partsDataPromise: Promise<PartsData | null> }) {
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

  return <ConstructionVirtualPartsList partsList={partsData.virtual} />
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
