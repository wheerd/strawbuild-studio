import { Flex, Select, Text } from '@radix-ui/themes'
import React from 'react'

import type { SlabConstructionConfigId } from '@/building/model/ids'
import { useSlabConstructionConfigs } from '@/construction/config/store'

import { getSlabConstructionTypeIcon } from './Icons'

export interface SlabConfigSelectProps {
  value: SlabConstructionConfigId | null | undefined
  onValueChange: (configId: SlabConstructionConfigId) => void
  placeholder?: string
  size?: '1' | '2' | '3'
  disabled?: boolean
  showDefaultIndicator?: boolean
  defaultConfigId?: SlabConstructionConfigId
}

export function SlabConfigSelect({
  value,
  onValueChange,
  placeholder = 'Select slab configuration...',
  size = '2',
  disabled = false,
  showDefaultIndicator = false,
  defaultConfigId
}: SlabConfigSelectProps): React.JSX.Element {
  const slabConfigs = useSlabConstructionConfigs()

  return (
    <Select.Root
      value={value ?? ''}
      onValueChange={val => onValueChange(val as SlabConstructionConfigId)}
      disabled={disabled}
      size={size}
    >
      <Select.Trigger placeholder={placeholder} />
      <Select.Content>
        {slabConfigs.length === 0 ? (
          <Select.Item value="" disabled>
            <Text color="gray">No slab configurations available</Text>
          </Select.Item>
        ) : (
          slabConfigs.map(config => {
            const Icon = getSlabConstructionTypeIcon(config.type)
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
