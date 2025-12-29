import { GearIcon } from '@radix-ui/react-icons'
import { Flex, Tabs } from '@radix-ui/themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

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
      title={t('modal.title')}
      size="4"
      width="95%"
      maxWidth="95%"
      height="90vh"
      maxHeight="90vh"
      resetKeys={[initialSelectionId]}
    >
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="materials">{t('modal.tabMaterials')}</Tabs.Trigger>
          <Tabs.Trigger value="ringbeams">{t('modal.tabRingBeams')}</Tabs.Trigger>
          <Tabs.Trigger value="walls">{t('modal.tabWalls')}</Tabs.Trigger>
          <Tabs.Trigger value="openings">{t('modal.tabOpenings')}</Tabs.Trigger>
          <Tabs.Trigger value="floors">{t('modal.tabFloors')}</Tabs.Trigger>
          <Tabs.Trigger value="roofs">{t('modal.tabRoofs')}</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="materials">
          <Flex pt="4" style={{ width: '100%' }}>
            <MaterialsConfigContent initialSelectionId={initialSelectionId} />
          </Flex>
        </Tabs.Content>

        <Tabs.Content value="ringbeams">
          <Flex pt="4" style={{ width: '100%' }}>
            <RingBeamAssemblyContent initialSelectionId={initialSelectionId} />
          </Flex>
        </Tabs.Content>

        <Tabs.Content value="walls">
          <Flex pt="4" style={{ width: '100%' }}>
            <WallAssemblyContent initialSelectionId={initialSelectionId} />
          </Flex>
        </Tabs.Content>

        <Tabs.Content value="openings">
          <Flex pt="4" style={{ width: '100%' }}>
            <OpeningAssemblyContent initialSelectionId={initialSelectionId} />
          </Flex>
        </Tabs.Content>

        <Tabs.Content value="floors">
          <Flex pt="4" style={{ width: '100%' }}>
            <FloorAssemblyConfigContent initialSelectionId={initialSelectionId} />
          </Flex>
        </Tabs.Content>

        <Tabs.Content value="roofs">
          <Flex pt="4" style={{ width: '100%' }}>
            <RoofAssemblyConfigContent initialSelectionId={initialSelectionId} />
          </Flex>
        </Tabs.Content>
      </Tabs.Root>
    </BaseModal>
  )
}
