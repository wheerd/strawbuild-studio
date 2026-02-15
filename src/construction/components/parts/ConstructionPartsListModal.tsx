import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FullScreenModal } from '@/components/ui/full-screen-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs } from '@/components/ui/tabs'
import { ConstructionModelRegenerateButton } from '@/construction/components/ConstructionModelRegenerateButton'
import { ConstructionPartsList } from '@/construction/components/parts/ConstructionPartsList'
import { ConstructionVirtualPartsList } from '@/construction/components/parts/ConstructionVirtualPartsList'
import { type ConstructionModelId, useConstructionModel } from '@/construction/store'

export interface ConstructionPartsListModalProps {
  title?: string
  modelId: ConstructionModelId
  trigger: React.ReactNode
}

export function ConstructionPartsListModal({
  title,
  modelId,
  trigger
}: ConstructionPartsListModalProps): React.JSX.Element {
  const { t } = useTranslation('construction')
  const defaultTitle = t($ => $.partsListModal.title)
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'materials' | 'modules'>('materials')

  const model = useConstructionModel(modelId)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setActiveTab('materials')
    }
  }

  return (
    <FullScreenModal open={isOpen} onOpenChange={handleOpenChange} title={title ?? defaultTitle} trigger={trigger}>
      <Tabs.Root
        value={activeTab}
        onValueChange={value => {
          setActiveTab(value as 'materials' | 'modules')
        }}
        className="-mt-2 flex h-full w-full flex-col"
      >
        <div className="flex shrink-0 items-center justify-between">
          <Tabs.List>
            <Tabs.Trigger value="materials">{t($ => $.partsListModal.tabs.materials)}</Tabs.Trigger>
            <Tabs.Trigger value="modules">{t($ => $.partsListModal.tabs.modules)}</Tabs.Trigger>
          </Tabs.List>

          <ConstructionModelRegenerateButton />
        </div>
        <Tabs.Content value="materials" className="flex min-h-0 w-full flex-1 flex-col overflow-auto pt-3">
          {model ? <ConstructionPartsList modelId={modelId} /> : <PartsSkeleton />}
        </Tabs.Content>

        <Tabs.Content value="modules" className="flex min-h-0 flex-1 flex-col overflow-auto pt-3">
          {model ? <ConstructionVirtualPartsList modelId={modelId} /> : <PartsSkeleton />}
        </Tabs.Content>
      </Tabs.Root>
    </FullScreenModal>
  )
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
