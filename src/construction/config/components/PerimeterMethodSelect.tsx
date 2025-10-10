import { Flex, Select, Text } from '@radix-ui/themes'
import React from 'react'

import type { PerimeterConstructionMethodId } from '@/building/model/ids'
import { usePerimeterConstructionMethods } from '@/construction/config/store'

import { getPerimeterConfigTypeIcon } from './Icons'

export interface PerimeterMethodSelectProps {
  value: PerimeterConstructionMethodId | null | undefined
  onValueChange: (methodId: PerimeterConstructionMethodId) => void
  placeholder?: string
  size?: '1' | '2' | '3'
  disabled?: boolean
  showDefaultIndicator?: boolean
  defaultMethodId?: PerimeterConstructionMethodId
}

export function PerimeterMethodSelect({
  value,
  onValueChange,
  placeholder = 'Select perimeter method...',
  size = '2',
  disabled = false,
  showDefaultIndicator = false,
  defaultMethodId
}: PerimeterMethodSelectProps): React.JSX.Element {
  const perimeterMethods = usePerimeterConstructionMethods()

  return (
    <Select.Root
      value={value ?? ''}
      onValueChange={val => onValueChange(val as PerimeterConstructionMethodId)}
      disabled={disabled}
      size={size}
    >
      <Select.Trigger placeholder={placeholder} />
      <Select.Content>
        {perimeterMethods.length === 0 ? (
          <Select.Item value="" disabled>
            <Text color="gray">No perimeter methods available</Text>
          </Select.Item>
        ) : (
          perimeterMethods.map(method => {
            const Icon = getPerimeterConfigTypeIcon(method.config.type)
            const isDefault = showDefaultIndicator && method.id === defaultMethodId
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
