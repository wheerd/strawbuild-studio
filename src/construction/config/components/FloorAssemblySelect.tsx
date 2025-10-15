import { Flex, Select, Text } from '@radix-ui/themes'
import React from 'react'

import type { FloorAssemblyId } from '@/building/model/ids'
import { useFloorAssemblyConfigs } from '@/construction/config/store'

import { getFloorAssemblyTypeIcon } from './Icons'

export interface FloorAssemblySelectProps {
  value: FloorAssemblyId | null | undefined
  onValueChange: (configId: FloorAssemblyId) => void
  placeholder?: string
  size?: '1' | '2' | '3'
  disabled?: boolean
  showDefaultIndicator?: boolean
  defaultConfigId?: FloorAssemblyId
}

export function FloorAssemblySelect({
  value,
  onValueChange,
  placeholder = 'Select floor assembly...',
  size = '2',
  disabled = false,
  showDefaultIndicator = false,
  defaultConfigId
}: FloorAssemblySelectProps): React.JSX.Element {
  const floorAssemblyConfigs = useFloorAssemblyConfigs()

  return (
    <Select.Root
      value={value ?? ''}
      onValueChange={val => onValueChange(val as FloorAssemblyId)}
      disabled={disabled}
      size={size}
    >
      <Select.Trigger placeholder={placeholder} />
      <Select.Content>
        {floorAssemblyConfigs.length === 0 ? (
          <Select.Item value="" disabled>
            <Text color="gray">No floor assemblies available</Text>
          </Select.Item>
        ) : (
          floorAssemblyConfigs.map(config => {
            const Icon = getFloorAssemblyTypeIcon(config.type)
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
