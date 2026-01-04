import { CrossCircledIcon } from '@radix-ui/react-icons'
import { Box, Callout, Flex, Skeleton, Spinner, Tabs } from '@radix-ui/themes'
import React, { Suspense, use, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConstructionPartsList } from '@/construction/components/parts/ConstructionPartsList'
import { ConstructionVirtualPartsList } from '@/construction/components/parts/ConstructionVirtualPartsList'
import type { ConstructionModel } from '@/construction/model'
import type { MaterialPartsList, VirtualPartsList } from '@/construction/parts'
import { generateMaterialPartsList, generateVirtualPartsList } from '@/construction/parts'
import { BaseModal } from '@/shared/components/BaseModal'

interface PartsData {
  material: MaterialPartsList
  virtual: VirtualPartsList
}

export interface ConstructionPartsListModalProps {
  title?: string
  constructionModelFactory: () => Promise<ConstructionModel | null>
  trigger: React.ReactNode
  refreshKey?: unknown
}

export function ConstructionPartsListModal({
  title,
  constructionModelFactory,
  trigger,
  refreshKey
}: ConstructionPartsListModalProps): React.JSX.Element {
  const { t } = useTranslation('construction')
  const defaultTitle = t($ => $.partsListModal.title)
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'materials' | 'modules'>('materials')
  const [partsDataPromise, setPartsDataPromise] = useState<Promise<PartsData | null> | null>(null)

  const loadPartsData = useCallback(
    () =>
      constructionModelFactory().then(model => {
        if (!model) return null
        return {
          material: generateMaterialPartsList(model),
          virtual: generateVirtualPartsList(model)
        }
      }),
    [constructionModelFactory]
  )

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setActiveTab('materials')
      setPartsDataPromise(null)
      return
    }
    if (!partsDataPromise) {
      setPartsDataPromise(loadPartsData())
    }
  }

  useEffect(() => {
    if (!isOpen) return
    if (refreshKey === undefined) return
    setPartsDataPromise(loadPartsData())
  }, [refreshKey, isOpen, loadPartsData])

  return (
    <BaseModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={title ?? defaultTitle}
      trigger={trigger}
      size="2"
      width="calc(100vw - 2 * var(--space-4))"
      maxWidth="calc(100vw - 2 * var(--space-4))"
      height="calc(100vh - 2 * var(--space-6))"
      maxHeight="calc(100vh - 2 * var(--space-6))"
      resetKeys={[refreshKey]}
    >
      <Tabs.Root value={activeTab} onValueChange={value => setActiveTab(value as 'materials' | 'modules')}>
        <Box px="4" pt="3">
          <Tabs.List>
            <Tabs.Trigger value="materials">{t($ => $.partsListModal.tabs.materials)}</Tabs.Trigger>
            <Tabs.Trigger value="modules">{t($ => $.partsListModal.tabs.modules)}</Tabs.Trigger>
          </Tabs.List>
        </Box>

        <Tabs.Content value="materials">
          <Box p="3">
            {partsDataPromise ? (
              <Suspense fallback={<PartsSkeleton />}>
                <MaterialPartsContent partsDataPromise={partsDataPromise} />
              </Suspense>
            ) : (
              <PartsSkeleton />
            )}
          </Box>
        </Tabs.Content>

        <Tabs.Content value="modules">
          <Box p="3">
            {partsDataPromise ? (
              <Suspense fallback={<PartsSkeleton />}>
                <ModulePartsContent partsDataPromise={partsDataPromise} />
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

function MaterialPartsContent({ partsDataPromise }: { partsDataPromise: Promise<PartsData | null> }) {
  const { t } = useTranslation('construction')
  const partsData = use(partsDataPromise)

  if (!partsData) {
    return (
      <Flex>
        <Callout.Root color="red" size="2">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>{t($ => $.partsListModal.errors.failedPartsList)}</Callout.Text>
        </Callout.Root>
      </Flex>
    )
  }

  return <ConstructionPartsList partsList={partsData.material} />
}

function ModulePartsContent({ partsDataPromise }: { partsDataPromise: Promise<PartsData | null> }) {
  const { t } = useTranslation('construction')
  const partsData = use(partsDataPromise)

  if (!partsData) {
    return (
      <Flex>
        <Callout.Root color="red" size="2">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>{t($ => $.partsListModal.errors.failedModulesList)}</Callout.Text>
        </Callout.Root>
      </Flex>
    )
  }

  return <ConstructionVirtualPartsList partsList={partsData.virtual} />
}

function PartsSkeleton() {
  return (
    <Flex direction="column" gap="4">
      <CardSkeleton />
      <CardSkeleton />
      <Spinner size="2" style={{ alignSelf: 'center' }} />
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
