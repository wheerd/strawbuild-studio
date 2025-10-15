import { Flex, Select, Text } from '@radix-ui/themes'
import React from 'react'

import type { RingBeamAssemblyId } from '@/building/model/ids'
import { useRingBeamAssemblies } from '@/construction/config/store'

import { getRingBeamTypeIcon } from './Icons'

export interface RingBeamAssemblySelectProps {
  value: RingBeamAssemblyId | null | undefined
  onValueChange: (assemblyId: RingBeamAssemblyId | undefined) => void
  placeholder?: string
  size?: '1' | '2' | '3'
  disabled?: boolean
  allowNone?: boolean
  showDefaultIndicator?: boolean
  defaultAssemblyIds?: RingBeamAssemblyId[]
}

export function RingBeamAssemblySelect({
  value,
  onValueChange,
  placeholder = 'Select ring beam assembly...',
  size = '2',
  disabled = false,
  allowNone = false,
  showDefaultIndicator = false,
  defaultAssemblyIds = []
}: RingBeamAssemblySelectProps): React.JSX.Element {
  const ringBeamAssemblies = useRingBeamAssemblies()

  return (
    <Select.Root
      value={value ?? (allowNone ? 'none' : '')}
      onValueChange={val => {
        if (val === 'none') {
          onValueChange(undefined)
        } else {
          onValueChange(val as RingBeamAssemblyId)
        }
      }}
      disabled={disabled}
      size={size}
    >
      <Select.Trigger placeholder={placeholder} />
      <Select.Content>
        {allowNone && (
          <Select.Item value="none">
            <Text color="gray">None</Text>
          </Select.Item>
        )}
        {ringBeamAssemblies.length === 0 ? (
          <Select.Item value="" disabled>
            <Text color="gray">No ring beam assemblies available</Text>
          </Select.Item>
        ) : (
          ringBeamAssemblies.map(assembly => {
            const Icon = getRingBeamTypeIcon(assembly.config.type)
            const isDefault = showDefaultIndicator && defaultAssemblyIds.includes(assembly.id)
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
