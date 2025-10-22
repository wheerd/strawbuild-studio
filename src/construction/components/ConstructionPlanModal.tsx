import { CrossCircledIcon } from '@radix-ui/react-icons'
import { Box, Callout, Flex, Grid, Skeleton, Spinner, Tabs } from '@radix-ui/themes'
import React, { Suspense, use, useEffect, useState } from 'react'

import { ConstructionPartsList } from '@/construction/components/ConstructionPartsList'
import { IssueDescriptionPanel } from '@/construction/components/IssueDescriptionPanel'
import type { ConstructionModel } from '@/construction/model'
import type { PartsList } from '@/construction/parts'
import { generatePartsList } from '@/construction/parts'
import { BaseModal } from '@/shared/components/BaseModal'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import { ConstructionPlan, type ViewOption, type VisibilityToggleConfig } from './ConstructionPlan'

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
  const [activeTab, setActiveTab] = useState<'plan' | 'parts'>('plan')
  const [partsListPromise, setPartsListPromise] = useState<Promise<PartsList | null> | null>(null)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setActiveTab('plan')
      setPartsListPromise(null)
      return
    }

    if (open && !modelPromise) {
      const nextModelPromise = constructionModelFactory()
      setModelPromise(nextModelPromise)
      setPartsListPromise(null)
    }
  }

  useEffect(() => {
    if (isOpen && refreshKey !== undefined) {
      const nextModelPromise = constructionModelFactory()
      setModelPromise(nextModelPromise)
      setPartsListPromise(null)
    }
  }, [refreshKey, isOpen, constructionModelFactory])

  useEffect(() => {
    if (!isOpen) return
    if (activeTab !== 'parts') return
    if (!modelPromise) return
    setPartsListPromise(prev => {
      if (prev) return prev
      return modelPromise.then(model => (model ? generatePartsList(model) : null))
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
    >
      <Tabs.Root
        style={{ height: '100%' }}
        value={activeTab}
        onValueChange={value => setActiveTab(value as 'plan' | 'parts')}
      >
        <Tabs.List size="1">
          <Tabs.Trigger value="plan">Plan & Issues</Tabs.Trigger>
          <Tabs.Trigger value="parts">Parts List</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="plan">
          <Grid rows="1fr auto" gap="3" height="100%" className="overflow-hidden">
            <div
              ref={containerRef}
              className="relative flex-1 min-h-[300px] overflow-hidden border border-gray-6 rounded-2"
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

            <Box flexShrink="0">
              {modelPromise ? (
                <Suspense fallback={<PlanSkeleton />}>
                  <IssueDescriptionPanel modelPromise={modelPromise} />
                </Suspense>
              ) : null}
            </Box>
          </Grid>
        </Tabs.Content>

        <Tabs.Content value="parts" style={{ flex: 1, minHeight: 0 }}>
          <Box height="100%" className="overflow-hidden">
            {partsListPromise ? (
              <Suspense fallback={<PartsSkeleton />}>
                <PartsTabContent partsListPromise={partsListPromise} />
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

function PartsTabContent({ partsListPromise }: { partsListPromise: Promise<PartsList | null> }) {
  const partsList = use(partsListPromise)

  if (partsList == null) {
    return (
      <Flex align="center" justify="center" height="100%">
        <Callout.Root color="red" size="2">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>Failed to generate parts list</Callout.Text>
        </Callout.Root>
      </Flex>
    )
  }

  return <ConstructionPartsList partsList={partsList} />
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
