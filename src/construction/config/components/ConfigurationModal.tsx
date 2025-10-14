import { Cross2Icon, GearIcon } from '@radix-ui/react-icons'
import { Dialog, Flex, IconButton, Tabs } from '@radix-ui/themes'
import React from 'react'

import type { ConfigTab } from '@/construction/config/context/ConfigurationModalContext'
import { MaterialsConfigContent } from '@/construction/materials/components/MaterialsConfigContent'

import { PerimeterConfigContent } from './PerimeterConfigContent'
import { RingBeamConfigContent } from './RingBeamConfigContent'
import { SlabConfigContent } from './SlabConfigContent'

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
  const setActiveTab = (tab: string) => {
    onTabChange(tab as ConfigTab)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        size="4"
        width="95%"
        maxWidth="95%"
        height="90vh"
        maxHeight="90vh"
        onEscapeKeyDown={e => {
          e.stopPropagation()
        }}
      >
        <Dialog.Title>
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <GearIcon />
              Configuration
            </Flex>
            <Dialog.Close>
              <IconButton variant="ghost" highContrast>
                <Cross2Icon />
              </IconButton>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Trigger value="materials">Materials</Tabs.Trigger>
            <Tabs.Trigger value="ringbeams">Ring Beams</Tabs.Trigger>
            <Tabs.Trigger value="perimeter">Perimeter Walls</Tabs.Trigger>
            <Tabs.Trigger value="slabs">Slabs</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="materials">
            <Flex pt="4" style={{ width: '100%' }}>
              <MaterialsConfigContent initialSelectionId={initialSelectionId} />
            </Flex>
          </Tabs.Content>

          <Tabs.Content value="ringbeams">
            <Flex pt="4" style={{ width: '100%' }}>
              <RingBeamConfigContent initialSelectionId={initialSelectionId} />
            </Flex>
          </Tabs.Content>

          <Tabs.Content value="perimeter">
            <Flex pt="4" style={{ width: '100%' }}>
              <PerimeterConfigContent initialSelectionId={initialSelectionId} />
            </Flex>
          </Tabs.Content>

          <Tabs.Content value="slabs">
            <Flex pt="4" style={{ width: '100%' }}>
              <SlabConfigContent initialSelectionId={initialSelectionId} />
            </Flex>
          </Tabs.Content>
        </Tabs.Root>
      </Dialog.Content>
    </Dialog.Root>
  )
}
