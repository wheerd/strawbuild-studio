import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { OpeningAssemblyId } from '@/building/model/ids'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { NamedAssembly } from '@/construction/config'
import { useDefaultOpeningAssemblyId, useOpeningAssemblies } from '@/construction/config/store'
import { cn } from '@/lib/utils'

export interface OpeningAssemblySelectProps {
  value: OpeningAssemblyId | null | undefined
  onValueChange: (assemblyId: OpeningAssemblyId | undefined) => void
  placeholder?: string
  size?: '1' | '2' | '3'
  disabled?: boolean
  allowDefault?: boolean
  showDefaultIndicator?: boolean
}

const sizeClasses = {
  '1': 'h-7 text-xs',
  '2': 'h-9 <Text text-sm',
  '3': 'h-10 <Text text-base'
}

export function OpeningAssemblySelect({
  value,
  onValueChange,
  placeholder = 'Select opening assembly...',
  size = '2',
  disabled = false,
  allowDefault = false,
  showDefaultIndicator = false
}: OpeningAssemblySelectProps): React.JSX.Element {
  const openingAssemblies = useOpeningAssemblies()
  const { t } = useTranslation('config')
  const defaultAssemblyId = useDefaultOpeningAssemblyId()

  const getDisplayName = (assembly: NamedAssembly): string => {
    return assembly.nameKey ? t(assembly.nameKey) : assembly.name
  }

  const assemblies = Object.values(openingAssemblies)

  return (
    <Select
      value={value ?? (allowDefault ? '__default__' : '')}
      onValueChange={val => {
        if (val === '__default__') {
          onValueChange(undefined)
        } else {
          onValueChange(val as OpeningAssemblyId)
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn(sizeClasses[size])}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowDefault && (
          <SelectItem value="__default__">
            <span className="text-muted-foreground">{t($ => $.openings.useGlobalDefault)}</span>
          </SelectItem>
        )}
        {assemblies.length === 0 ? (
          <SelectItem value="__none__" disabled>
            <span className="text-muted-foreground">{t($ => $.openings.emptyList)}</span>
          </SelectItem>
        ) : (
          assemblies.map(assembly => {
            const isDefault = showDefaultIndicator && assembly.id === defaultAssemblyId
            const label = getDisplayName(assembly)
            return (
              <SelectItem key={assembly.id} value={assembly.id}>
                <span>
                  {isDefault ? (
                    <Trans
                      t={t}
                      i18nKey={$ => $.openings.defaultLabel}
                      components={{ gray: <span className="text-muted-foreground" /> }}
                    >
                      <>{label}</> <span className="text-muted-foreground"> (default)</span>
                    </Trans>
                  ) : (
                    <>{label}</>
                  )}
                </span>
              </SelectItem>
            )
          })
        )}
      </SelectContent>
    </Select>
  )
}
