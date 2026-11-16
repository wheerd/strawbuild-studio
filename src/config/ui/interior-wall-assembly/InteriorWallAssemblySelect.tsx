import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { InteriorWallAssemblyId } from '@/building/model/ids'
import { useDefaultInteriorWallAssemblyId, useInteriorWallAssemblies } from '@/config/store'
import type { NamedAssembly } from '@/config/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/components/select'
import { cn } from '@/shared/ui/utils'

export interface InteriorWallAssemblySelectProps {
  value: InteriorWallAssemblyId | null | undefined
  onValueChange: (assemblyId: InteriorWallAssemblyId) => void
  placeholder?: string
  size?: 'sm' | 'base' | 'lg'
  disabled?: boolean
  showDefaultIndicator?: boolean
  defaultAssemblyId?: InteriorWallAssemblyId
}

const sizeClasses = {
  sm: 'h-7 text-xs',
  base: 'h-9 text-sm',
  lg: 'h-10 text-base'
}

export function InteriorWallAssemblySelect({
  value,
  onValueChange,
  placeholder = 'Select interior wall assembly...',
  size = 'base',
  disabled = false,
  showDefaultIndicator = false,
  defaultAssemblyId
}: InteriorWallAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const assemblies = useInteriorWallAssemblies()
  const configuredDefaultAssemblyId = useDefaultInteriorWallAssemblyId()
  const effectiveDefaultAssemblyId = defaultAssemblyId ?? configuredDefaultAssemblyId

  const getDisplayName = (assembly: NamedAssembly): string => (assembly.nameKey ? t(assembly.nameKey) : assembly.name)

  return (
    <Select
      value={value ?? ''}
      onValueChange={assemblyId => {
        onValueChange(assemblyId as InteriorWallAssemblyId)
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn(sizeClasses[size])}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {assemblies.length === 0 ? (
          <SelectItem value="" disabled>
            <span className="text-muted-foreground">{t($ => $.walls.emptyInteriorList)}</span>
          </SelectItem>
        ) : (
          assemblies.map(assembly => {
            const isDefault = showDefaultIndicator && assembly.id === effectiveDefaultAssemblyId
            const label = getDisplayName(assembly)
            return (
              <SelectItem key={assembly.id} value={assembly.id}>
                {isDefault ? (
                  <Trans
                    t={t}
                    i18nKey={$ => $.walls.defaultLabel}
                    components={{ gray: <span className="text-muted-foreground" /> }}
                  >
                    <>{{ label }}</> <span className="text-muted-foreground"> (default)</span>
                  </Trans>
                ) : (
                  label
                )}
              </SelectItem>
            )
          })
        )}
      </SelectContent>
    </Select>
  )
}
