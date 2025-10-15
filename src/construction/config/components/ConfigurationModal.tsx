import { Cross2Icon, GearIcon } from '@radix-ui/react-icons'
import { Dialog, Flex, IconButton, Tabs } from '@radix-ui/themes'
import React from 'react'

import type { ConfigTab } from '@/construction/config/context/ConfigurationModalContext'
import { MaterialsConfigContent } from '@/construction/materials/components/MaterialsConfigContent'

import { FloorAssemblyConfigContent } from './FloorAssemblyConfigContent'
import { RingBeamAssemblyContent } from './RingBeamAssemblyContent'
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
  const setActiveTab = (tab: string) => {
    onTabChange(tab as ConfigTab)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        aria-describedby={undefined}
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
            <Tabs.Trigger value="ringbeams">Ring Beam Assemblies</Tabs.Trigger>
            <Tabs.Trigger value="walls">Wall Assemblies</Tabs.Trigger>
            <Tabs.Trigger value="floors">Floor Assemblies</Tabs.Trigger>
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

          <Tabs.Content value="floors">
            <Flex pt="4" style={{ width: '100%' }}>
              <FloorAssemblyConfigContent initialSelectionId={initialSelectionId} />
            </Flex>
          </Tabs.Content>
        </Tabs.Root>
      </Dialog.Content>
    </Dialog.Root>
  )
}
