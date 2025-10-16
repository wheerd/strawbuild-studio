import { Flex, Select, Text } from '@radix-ui/themes'
import React from 'react'

import type { WallAssemblyId } from '@/building/model/ids'
import { useWallAssemblies } from '@/construction/config/store'

import { getPerimeterConfigTypeIcon } from './Icons'

export interface WallAssemblySelectProps {
  value: WallAssemblyId | null | undefined
  onValueChange: (assemblyId: WallAssemblyId) => void
  placeholder?: string
  size?: '1' | '2' | '3'
  disabled?: boolean
  showDefaultIndicator?: boolean
  defaultAssemblyId?: WallAssemblyId
}

export function WallAssemblySelect({
  value,
  onValueChange,
  placeholder = 'Select wall assembly...',
  size = '2',
  disabled = false,
  showDefaultIndicator = false,
  defaultAssemblyId
}: WallAssemblySelectProps): React.JSX.Element {
  const wallAssemblies = useWallAssemblies()

  return (
    <Select.Root
      value={value ?? ''}
      onValueChange={val => onValueChange(val as WallAssemblyId)}
      disabled={disabled}
      size={size}
    >
      <Select.Trigger placeholder={placeholder} />
      <Select.Content>
        {wallAssemblies.length === 0 ? (
          <Select.Item value="" disabled>
            <Text color="gray">No wall assemblies available</Text>
          </Select.Item>
        ) : (
          wallAssemblies.map(assembly => {
            const Icon = getPerimeterConfigTypeIcon(assembly.type)
            const isDefault = showDefaultIndicator && assembly.id === defaultAssemblyId
            return (
              <Select.Item key={assembly.id} value={assembly.id}>
                <Flex align="center" gap="2">
                  <Icon style={{ flexShrink: 0 }} />
                  <Text>
                    {assembly.name}
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
