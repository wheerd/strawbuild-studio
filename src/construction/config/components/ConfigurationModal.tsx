import { GearIcon } from '@radix-ui/react-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { FullScreenModal } from '@/components/ui/full-screen-modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ConfigTab } from '@/construction/config/context/ConfigurationModalContext'
import { MaterialsConfigContent } from '@/construction/materials/components/MaterialsConfigContent'

import { FloorAssemblyConfigContent } from './floor-assembly/FloorAssemblyConfigContent'
import { OpeningAssemblyContent } from './opening-assembly/OpeningAssemblyContent'
import { RingBeamAssemblyContent } from './ring-beam-assembly/RingBeamAssemblyContent'
import { RoofAssemblyConfigContent } from './roof-assembly/RoofAssemblyConfigContent'
import { WallAssemblyContent } from './wall-assembly/WallAssemblyContent'

export interface ConfigurationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeTab: ConfigTab
  onTabChange: (tab: ConfigTab) => void
  initialSelectionId?: string
}

export function ConfigurationModal({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  initialSelectionId
}: ConfigurationModalProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const setActiveTab = (tab: string) => {
    onTabChange(tab as ConfigTab)
  }

  return (
    <FullScreenModal open={open} onOpenChange={onOpenChange} titleIcon={<GearIcon />} title={t($ => $.modal.title)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full w-full flex-col">
        <TabsList>
          <TabsTrigger value="materials">{t($ => $.modal.tabMaterials)}</TabsTrigger>
          <TabsTrigger value="ringbeams">{t($ => $.modal.tabRingBeams)}</TabsTrigger>
          <TabsTrigger value="walls">{t($ => $.modal.tabWalls)}</TabsTrigger>
          <TabsTrigger value="openings">{t($ => $.modal.tabOpenings)}</TabsTrigger>
          <TabsTrigger value="floors">{t($ => $.modal.tabFloors)}</TabsTrigger>
          <TabsTrigger value="roofs">{t($ => $.modal.tabRoofs)}</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <div className="flex w-full pt-4">
            <MaterialsConfigContent initialSelectionId={initialSelectionId} />
          </div>
        </TabsContent>

        <TabsContent value="ringbeams">
          <div className="flex w-full pt-4">
            <RingBeamAssemblyContent initialSelectionId={initialSelectionId} />
          </div>
        </TabsContent>

        <TabsContent value="walls">
          <div className="w-full pt-4">
            <WallAssemblyContent initialSelectionId={initialSelectionId} />
          </div>
        </TabsContent>

        <TabsContent value="openings">
          <div className="flex w-full pt-4">
            <OpeningAssemblyContent initialSelectionId={initialSelectionId} />
          </div>
        </TabsContent>

        <TabsContent value="floors">
          <div className="flex w-full pt-4">
            <FloorAssemblyConfigContent initialSelectionId={initialSelectionId} />
          </div>
        </TabsContent>

        <TabsContent value="roofs">
          <div className="flex w-full pt-4">
            <RoofAssemblyConfigContent initialSelectionId={initialSelectionId} />
          </div>
        </TabsContent>
      </Tabs>
    </FullScreenModal>
  )
}
