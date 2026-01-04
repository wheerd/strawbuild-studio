import { Flex, Select, Text } from '@radix-ui/themes'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { FloorAssemblyId } from '@/building/model/ids'
import type { NamedAssembly } from '@/construction/config'
import { useFloorAssemblies } from '@/construction/config/store'

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
  const { t } = useTranslation('config')
  const floorAssemblyConfigs = useFloorAssemblies()

  const getDisplayName = (assembly: NamedAssembly): string => {
    return assembly.nameKey ? t(assembly.nameKey) : assembly.name
  }

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
            <Text color="gray">{t($ => $.floors.emptyList)}</Text>
          </Select.Item>
        ) : (
          floorAssemblyConfigs.map(config => {
            const Icon = getFloorAssemblyTypeIcon(config.type)
            const isDefault = showDefaultIndicator && config.id === defaultConfigId
            const label = getDisplayName(config)
            return (
              <Select.Item key={config.id} value={config.id}>
                <Flex align="center" gap="2">
                  <Icon style={{ flexShrink: 0 }} />
                  <Text>
                    {isDefault ? (
                      <Trans t={t} i18nKey={$ => $.floors.defaultLabel} components={{ gray: <Text color="gray" /> }}>
                        <>{{ label }}</> <Text color="gray"> (default)</Text>
                      </Trans>
                    ) : (
                      <>{label}</>
                    )}
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
