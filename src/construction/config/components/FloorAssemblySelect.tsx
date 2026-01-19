import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { FloorAssemblyId } from '@/building/model/ids'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { NamedAssembly } from '@/construction/config'
import { useFloorAssemblies } from '@/construction/config/store'
import { cn } from '@/lib/utils'

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

const sizeClasses = {
  '1': 'h-7 text-xs',
  '2': 'h-9 <Text text-sm',
  '3': 'h-10 <Text text-base'
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
    <Select
      value={value ?? ''}
      onValueChange={val => {
        onValueChange(val as FloorAssemblyId)
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn(sizeClasses[size])}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {floorAssemblyConfigs.length === 0 ? (
          <SelectItem value="" disabled>
            <span className="text-muted-foreground">{t($ => $.floors.emptyList)}</span>
          </SelectItem>
        ) : (
          floorAssemblyConfigs.map(config => {
            const Icon = getFloorAssemblyTypeIcon(config.type)
            const isDefault = showDefaultIndicator && config.id === defaultConfigId
            const label = getDisplayName(config)
            return (
              <SelectItem key={config.id} value={config.id}>
                <div className="flex items-center gap-2">
                  <Icon className="shrink-0" />
                  <span>
                    {isDefault ? (
                      <Trans
                        t={t}
                        i18nKey={$ => $.floors.defaultLabel}
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
