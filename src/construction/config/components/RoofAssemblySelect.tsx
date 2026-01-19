import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { RoofAssemblyId } from '@/building/model/ids'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { NamedAssembly } from '@/construction/config'
import { useRoofAssemblies } from '@/construction/config/store'
import { cn } from '@/lib/utils'

import { getRoofAssemblyTypeIcon } from './Icons'

export interface RoofAssemblySelectProps {
  value: RoofAssemblyId | null | undefined
  onValueChange: (assemblyId: RoofAssemblyId) => void
  placeholder?: string
  size?: 'sm' | 'base' | 'lg'
  disabled?: boolean
  showDefaultIndicator?: boolean
  defaultAssemblyId?: RoofAssemblyId
}

const sizeClasses = {
  sm: 'h-7 text-xs',
  base: 'h-9 <Text text-sm',
  lg: 'h-10 <Text text-base'
}

export function RoofAssemblySelect({
  value,
  onValueChange,
  placeholder = 'Select roof assembly...',
  size = 'base',
  disabled = false,
  showDefaultIndicator = false,
  defaultAssemblyId
}: RoofAssemblySelectProps): React.JSX.Element {
  const roofAssemblies = useRoofAssemblies()
  const { t } = useTranslation('config')

  const getDisplayName = (assembly: NamedAssembly): string => {
    return assembly.nameKey ? t(assembly.nameKey) : assembly.name
  }

  return (
    <Select
      value={value ?? ''}
      onValueChange={val => {
        onValueChange(val as RoofAssemblyId)
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn(sizeClasses[size])}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {roofAssemblies.length === 0 ? (
          <SelectItem value="" disabled>
            <span className="text-muted-foreground">{t($ => $.roofs.emptyList)}</span>
          </SelectItem>
        ) : (
          roofAssemblies.map(assembly => {
            const Icon = getRoofAssemblyTypeIcon(assembly.type)
            const isDefault = showDefaultIndicator && assembly.id === defaultAssemblyId
            const label = getDisplayName(assembly)
            return (
              <SelectItem key={assembly.id} value={assembly.id}>
                <div className="flex items-center gap-2">
                  <Icon className="shrink-0" />
                  <span>
                    {isDefault ? (
                      <Trans
                        t={t}
                        i18nKey={$ => $.roofs.defaultLabel}
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
