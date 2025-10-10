import { Flex, Select, Text } from '@radix-ui/themes'
import React from 'react'

import type { RingBeamConstructionMethodId } from '@/building/model/ids'
import { useRingBeamConstructionMethods } from '@/construction/config/store'

import { getRingBeamTypeIcon } from './Icons'

export interface RingBeamMethodSelectProps {
  value: RingBeamConstructionMethodId | null | undefined
  onValueChange: (methodId: RingBeamConstructionMethodId | undefined) => void
  placeholder?: string
  size?: '1' | '2' | '3'
  disabled?: boolean
  allowNone?: boolean
  showDefaultIndicator?: boolean
  defaultMethodIds?: RingBeamConstructionMethodId[]
}

export function RingBeamMethodSelect({
  value,
  onValueChange,
  placeholder = 'Select ring beam method...',
  size = '2',
  disabled = false,
  allowNone = false,
  showDefaultIndicator = false,
  defaultMethodIds = []
}: RingBeamMethodSelectProps): React.JSX.Element {
  const ringBeamMethods = useRingBeamConstructionMethods()

  return (
    <Select.Root
      value={value ?? (allowNone ? 'none' : '')}
      onValueChange={val => {
        if (val === 'none') {
          onValueChange(undefined)
        } else {
          onValueChange(val as RingBeamConstructionMethodId)
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
        {ringBeamMethods.length === 0 ? (
          <Select.Item value="" disabled>
            <Text color="gray">No ring beam methods available</Text>
          </Select.Item>
        ) : (
          ringBeamMethods.map(method => {
            const Icon = getRingBeamTypeIcon(method.config.type)
            const isDefault = showDefaultIndicator && defaultMethodIds.includes(method.id)
            return (
              <Select.Item key={method.id} value={method.id}>
                <Flex align="center" gap="2">
                  <Icon style={{ flexShrink: 0 }} />
                  <Text>
                    {method.name}
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
