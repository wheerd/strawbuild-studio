import { CrossCircledIcon } from '@radix-ui/react-icons'
import React, { Suspense, use, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { FullScreenModal } from '@/components/ui/full-screen-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs } from '@/components/ui/tabs'
import { ConstructionPartsList } from '@/construction/components/parts/ConstructionPartsList'
import { ConstructionVirtualPartsList } from '@/construction/components/parts/ConstructionVirtualPartsList'
import type { ConstructionModel } from '@/construction/model'
import type { MaterialPartsList, VirtualPartsList } from '@/construction/parts'
import { generateMaterialPartsList, generateVirtualPartsList } from '@/construction/parts'

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
    <FullScreenModal open={isOpen} onOpenChange={handleOpenChange} title={title ?? defaultTitle} trigger={trigger}>
      <Tabs.Root
        value={activeTab}
        onValueChange={value => {
          setActiveTab(value as 'materials' | 'modules')
        }}
        className="-mt-2 flex h-full w-full flex-col"
      >
        <div className="flex shrink-0">
          <Tabs.List>
            <Tabs.Trigger value="materials">{t($ => $.partsListModal.tabs.materials)}</Tabs.Trigger>
            <Tabs.Trigger value="modules">{t($ => $.partsListModal.tabs.modules)}</Tabs.Trigger>
          </Tabs.List>
        </div>
        <Tabs.Content value="materials" className="flex min-h-0 w-full flex-1 overflow-auto pt-3">
          {partsDataPromise ? (
            <Suspense fallback={<PartsSkeleton />}>
              <MaterialPartsContent partsDataPromise={partsDataPromise} />
            </Suspense>
          ) : (
            <PartsSkeleton />
          )}
        </Tabs.Content>

        <Tabs.Content value="modules" className="flex min-h-0 flex-1 overflow-auto pt-3">
          {partsDataPromise ? (
            <Suspense fallback={<PartsSkeleton />}>
              <ModulePartsContent partsDataPromise={partsDataPromise} />
            </Suspense>
          ) : (
            <PartsSkeleton />
          )}
        </Tabs.Content>
      </Tabs.Root>
    </FullScreenModal>
  )
}

function MaterialPartsContent({ partsDataPromise }: { partsDataPromise: Promise<PartsData | null> }) {
  const { t } = useTranslation('construction')
  const partsData = use(partsDataPromise)

  if (!partsData) {
    return (
      <div className="flex">
        <Callout className="text-destructive">
          <CalloutIcon>
            <CrossCircledIcon />
          </CalloutIcon>
          <CalloutText>{t($ => $.partsListModal.errors.failedPartsList)}</CalloutText>
        </Callout>
      </div>
    )
  }

  return <ConstructionPartsList partsList={partsData.material} />
}

function ModulePartsContent({ partsDataPromise }: { partsDataPromise: Promise<PartsData | null> }) {
  const { t } = useTranslation('construction')
  const partsData = use(partsDataPromise)

  if (!partsData) {
    return (
      <div className="flex">
        <Callout className="text-destructive">
          <CalloutIcon>
            <CrossCircledIcon />
          </CalloutIcon>
          <CalloutText>{t($ => $.partsListModal.errors.failedModulesList)}</CalloutText>
        </Callout>
      </div>
    )
  }

  return <ConstructionVirtualPartsList partsList={partsData.virtual} />
}

function PartsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <Spinner className="self-center" />
    </div>
  )
}

function CardSkeleton() {
  return <Skeleton className="h-[160px] rounded-lg" />
}
