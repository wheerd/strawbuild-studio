import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { WallAssemblyId } from '@/building/model/ids'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { NamedAssembly } from '@/construction/config'
import { useWallAssemblies } from '@/construction/config/store'
import { cn } from '@/lib/utils'

import { getPerimeterConfigTypeIcon } from './Icons'

export interface WallAssemblySelectProps {
  value: WallAssemblyId | null | undefined
  onValueChange: (assemblyId: WallAssemblyId) => void
  placeholder?: string
  size?: 'sm' | 'base' | 'lg'
  disabled?: boolean
  showDefaultIndicator?: boolean
  defaultAssemblyId?: WallAssemblyId
}

const sizeClasses = {
  sm: 'h-7 text-xs',
  base: 'h-9 <Text text-sm',
  lg: 'h-10 <Text text-base'
}

export function WallAssemblySelect({
  value,
  onValueChange,
  placeholder = 'Select wall assembly...',
  size = 'base',
  disabled = false,
  showDefaultIndicator = false,
  defaultAssemblyId
}: WallAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const wallAssemblies = useWallAssemblies()

  const getDisplayName = (assembly: NamedAssembly): string => {
    return assembly.nameKey ? t(assembly.nameKey) : assembly.name
  }

  return (
    <Select
      value={value ?? ''}
      onValueChange={val => {
        onValueChange(val as WallAssemblyId)
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn(sizeClasses[size])}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {wallAssemblies.length === 0 ? (
          <SelectItem value="" disabled>
            <span className="text-muted-foreground">{t($ => $.walls.emptyList)}</span>
          </SelectItem>
        ) : (
          wallAssemblies.map(assembly => {
            const Icon = getPerimeterConfigTypeIcon(assembly.type)
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
                        i18nKey={$ => $.walls.defaultLabel}
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
