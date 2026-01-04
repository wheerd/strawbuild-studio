import { Flex, Select, Text } from '@radix-ui/themes'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { RingBeamAssemblyId } from '@/building/model/ids'
import type { NamedAssembly } from '@/construction/config'
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
  const { t } = useTranslation('config')

  const getDisplayName = (assembly: NamedAssembly): string => {
    return assembly.nameKey ? t(assembly.nameKey) : assembly.name
  }

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
            <Text color="gray">{t($ => $.ringBeams.none)}</Text>
          </Select.Item>
        )}
        {ringBeamAssemblies.length === 0 ? (
          <Select.Item value="" disabled>
            <Text color="gray">{t($ => $.ringBeams.emptyList)}</Text>
          </Select.Item>
        ) : (
          ringBeamAssemblies.map(assembly => {
            const Icon = getRingBeamTypeIcon(assembly.type)
            const isDefault = showDefaultIndicator && defaultAssemblyIds.includes(assembly.id)
            const label = getDisplayName(assembly)
            return (
              <Select.Item key={assembly.id} value={assembly.id}>
                <Flex align="center" gap="2">
                  <Icon style={{ flexShrink: 0 }} />
                  <Text>
                    {isDefault ? (
                      <Trans t={t} i18nKey={$ => $.ringBeams.defaultLabel} components={{ gray: <Text color="gray" /> }}>
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
