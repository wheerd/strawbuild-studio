import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { RingBeamAssemblyId } from '@/building/model/ids'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { NamedAssembly } from '@/construction/config'
import { useRingBeamAssemblies } from '@/construction/config/store'
import { cn } from '@/lib/utils'

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

const sizeClasses = {
  '1': 'h-7 text-xs',
  '2': 'h-9 <Text text-sm',
  '3': 'h-10 <Text text-base'
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
    <Select
      value={value ?? (allowNone ? 'none' : '')}
      onValueChange={val => {
        if (val === 'none') {
          onValueChange(undefined)
        } else {
          onValueChange(val as RingBeamAssemblyId)
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn(sizeClasses[size])}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && (
          <SelectItem value="none">
            <span className="text-muted-foreground">{t($ => $.ringBeams.none)}</span>
          </SelectItem>
        )}
        {ringBeamAssemblies.length === 0 ? (
          <SelectItem value="" disabled>
            <span className="text-muted-foreground">{t($ => $.ringBeams.emptyList)}</span>
          </SelectItem>
        ) : (
          ringBeamAssemblies.map(assembly => {
            const Icon = getRingBeamTypeIcon(assembly.type)
            const isDefault = showDefaultIndicator && defaultAssemblyIds.includes(assembly.id)
            const label = getDisplayName(assembly)
            return (
              <SelectItem key={assembly.id} value={assembly.id}>
                <div className="flex items-center gap-2">
                  <Icon className="shrink-0" />
                  <span>
                    {isDefault ? (
                      <Trans
                        t={t}
                        i18nKey={$ => $.ringBeams.defaultLabel}
                        components={{ gray: <span className="text-muted-foreground" /> }}
                      >
                        <>{label}</> <span className="text-muted-foreground"> (default)</span>
                      </Trans>
                    ) : (
                      <>{label}</>
                    )}
                  </span>
                </div>
              </SelectItem>
            )
          })
        )}
      </SelectContent>
    </Select>
  )
}
