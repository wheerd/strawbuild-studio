import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { PerimeterWallAssemblyId } from '@/building/model/ids'
import { useWallAssemblies } from '@/config/store'
import type { NamedAssembly } from '@/config/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/components/select'
import { cn } from '@/shared/ui/utils'

import { getWallAssemblyTypeIcon } from './icons'

export interface WallAssemblySelectProps {
  value: PerimeterWallAssemblyId | null | undefined
  onValueChange: (assemblyId: PerimeterWallAssemblyId) => void
  placeholder?: string
  size?: 'sm' | 'base' | 'lg'
  disabled?: boolean
  showDefaultIndicator?: boolean
  defaultAssemblyId?: PerimeterWallAssemblyId
}

const sizeClasses = {
  sm: 'h-7 text-xs',
  base: 'h-9 text-sm',
  lg: 'h-10 text-base'
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
        onValueChange(val as PerimeterWallAssemblyId)
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
            const Icon = getWallAssemblyTypeIcon(assembly.type)
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
                        <>{{ label }}</> <span className="text-muted-foreground"> (default)</span>
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
