import { GearIcon } from '@radix-ui/react-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ConfigTab } from '@/construction/config/context/ConfigurationModalContext'
import { MaterialsConfigContent } from '@/construction/materials/components/MaterialsConfigContent'
import { BaseModal } from '@/shared/components/BaseModal'

import { FloorAssemblyConfigContent } from './FloorAssemblyConfigContent'
import { OpeningAssemblyContent } from './OpeningAssemblyContent'
import { RingBeamAssemblyContent } from './RingBeamAssemblyContent'
import { RoofAssemblyConfigContent } from './RoofAssemblyConfigContent'
import { WallAssemblyContent } from './WallAssemblyContent'

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
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      titleIcon={<GearIcon />}
      title={t($ => $.modal.title)}
      size="4"
      width="95%"
      maxWidth="95%"
      height="90vh"
      maxHeight="90vh"
      resetKeys={[initialSelectionId]}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="materials">{t($ => $.modal.tabMaterials)}</TabsTrigger>
          <TabsTrigger value="ringbeams">{t($ => $.modal.tabRingBeams)}</TabsTrigger>
          <TabsTrigger value="walls">{t($ => $.modal.tabWalls)}</TabsTrigger>
          <TabsTrigger value="openings">{t($ => $.modal.tabOpenings)}</TabsTrigger>
          <TabsTrigger value="floors">{t($ => $.modal.tabFloors)}</TabsTrigger>
          <TabsTrigger value="roofs">{t($ => $.modal.tabRoofs)}</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <div className="flex pt-4 w-full">
            <MaterialsConfigContent initialSelectionId={initialSelectionId} />
          </div>
        </TabsContent>

        <TabsContent value="ringbeams">
          <div className="flex pt-4 w-full">
            <RingBeamAssemblyContent initialSelectionId={initialSelectionId} />
          </div>
        </TabsContent>

        <TabsContent value="walls">
          <div className="flex pt-4 w-full">
            <WallAssemblyContent initialSelectionId={initialSelectionId} />
          </div>
        </TabsContent>

        <TabsContent value="openings">
          <div className="flex pt-4 w-full">
            <OpeningAssemblyContent initialSelectionId={initialSelectionId} />
          </div>
        </TabsContent>

        <TabsContent value="floors">
          <div className="flex pt-4 w-full">
            <FloorAssemblyConfigContent initialSelectionId={initialSelectionId} />
          </div>
        </TabsContent>

        <TabsContent value="roofs">
          <div className="flex pt-4 w-full">
            <RoofAssemblyConfigContent initialSelectionId={initialSelectionId} />
          </div>
        </TabsContent>
      </Tabs>
    </BaseModal>
  )
}
