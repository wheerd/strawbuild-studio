import { Cross2Icon, GearIcon } from '@radix-ui/react-icons'
import { Dialog, Flex, IconButton, Tabs } from '@radix-ui/themes'
import React, { useState } from 'react'

import { MaterialsConfigContent } from '@/construction/materials/components/MaterialsConfigContent'

import { PerimeterConfigContent } from './PerimeterConfigContent'
import { RingBeamConfigContent } from './RingBeamConfigContent'

export interface ConfigurationModalProps {
  trigger: React.ReactNode
}

export function ConfigurationModal({ trigger }: ConfigurationModalProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('materials')

  return (
    <Dialog.Root>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <Dialog.Content size="4" width="95%" maxWidth="95%" height="90vh" maxHeight="90vh">
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
          </Tabs.List>

          <Tabs.Content value="materials">
            <Flex pt="4" style={{ width: '100%' }}>
              <MaterialsConfigContent />
            </Flex>
          </Tabs.Content>

          <Tabs.Content value="ringbeams">
            <Flex pt="4" style={{ width: '100%' }}>
              <RingBeamConfigContent />
            </Flex>
          </Tabs.Content>

          <Tabs.Content value="perimeter">
            <Flex pt="4" style={{ width: '100%' }}>
              <PerimeterConfigContent />
            </Flex>
          </Tabs.Content>
        </Tabs.Root>
      </Dialog.Content>
    </Dialog.Root>
  )
}
