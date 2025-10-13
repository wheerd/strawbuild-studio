import { Flex, Select, Text } from '@radix-ui/themes'
import React from 'react'

import type { FloorConstructionConfigId } from '@/building/model/ids'
import { useFloorConstructionConfigs } from '@/construction/config/store'

import { getFloorConstructionTypeIcon } from './Icons'

export interface FloorConfigSelectProps {
  value: FloorConstructionConfigId | null | undefined
  onValueChange: (configId: FloorConstructionConfigId) => void
  placeholder?: string
  size?: '1' | '2' | '3'
  disabled?: boolean
  showDefaultIndicator?: boolean
  defaultConfigId?: FloorConstructionConfigId
}

export function FloorConfigSelect({
  value,
  onValueChange,
  placeholder = 'Select floor configuration...',
  size = '2',
  disabled = false,
  showDefaultIndicator = false,
  defaultConfigId
}: FloorConfigSelectProps): React.JSX.Element {
  const floorConfigs = useFloorConstructionConfigs()

  return (
    <Select.Root
      value={value ?? ''}
      onValueChange={val => onValueChange(val as FloorConstructionConfigId)}
      disabled={disabled}
      size={size}
    >
      <Select.Trigger placeholder={placeholder} />
      <Select.Content>
        {floorConfigs.length === 0 ? (
          <Select.Item value="" disabled>
            <Text color="gray">No floor configurations available</Text>
          </Select.Item>
        ) : (
          floorConfigs.map(config => {
            const Icon = getFloorConstructionTypeIcon(config.type)
            const isDefault = showDefaultIndicator && config.id === defaultConfigId
            return (
              <Select.Item key={config.id} value={config.id}>
                <Flex align="center" gap="2">
                  <Icon style={{ flexShrink: 0 }} />
                  <Text>
                    {config.name}
                    {isDefault && <Text color="gray"> (default)</Text>}
                  </Text>
                </Flex>
              </Select.Item>
            )
          })
        )}
      </Select.Content>
    </Select.Root>
  )
}
