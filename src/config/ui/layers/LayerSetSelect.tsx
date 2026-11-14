import { Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { LayerSetId } from '@/building/model/ids'
import { useLayerSets } from '@/config/store'
import { useConfigNavigation } from '@/config/ui/useConfigNavigation'
import type { LayerSetConfig, LayerSetUse } from '@/construction/assemblies/layers/types'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { Button } from '@/shared/ui/components/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/components/select'
import { cn } from '@/shared/ui/utils'

import { getLayerSetUseIcon } from './icons'

export interface LayerSetSelectProps {
  value: LayerSetId | undefined
  onValueChange: (value: LayerSetId | undefined) => void
  use?: LayerSetUse
  placeholder?: string
  size?: 'sm' | 'base' | 'lg'
  disabled?: boolean
  allowNone?: boolean
}

const sizeClasses = {
  sm: 'h-7 text-xs',
  base: 'h-9 text-sm',
  lg: 'h-10 text-base'
}

export function LayerSetSelect({
  value,
  onValueChange,
  use,
  placeholder,
  size = 'base',
  disabled,
  allowNone = false
}: LayerSetSelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { formatLength } = useFormatters()
  const allLayerSets = useLayerSets()

  const layerSets = use ? allLayerSets.filter(ls => ls.use === use) : allLayerSets

  const displayName = (layerSet: { name: string; nameKey?: LayerSetConfig['nameKey'] }) =>
    layerSet.nameKey ? t(layerSet.nameKey) : layerSet.name

  const sortedLayerSets = [...layerSets].sort((a, b) =>
    a.use !== b.use ? a.use.localeCompare(b.use) : displayName(a).localeCompare(displayName(b))
  )

  return (
    <Select
      value={value ?? (allowNone ? 'none' : '')}
      onValueChange={val => {
        if (val === 'none') {
          onValueChange(undefined)
        } else {
          onValueChange(val as LayerSetId)
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn(sizeClasses[size])}>
        <SelectValue placeholder={placeholder ?? t($ => $.common.placeholder)} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && (
          <SelectItem value="none">
            <span className="text-muted-foreground">{t($ => $.layerSets.none)}</span>
          </SelectItem>
        )}
        {sortedLayerSets.map(ls => {
          const Icon = getLayerSetUseIcon(ls.use)
          return (
            <SelectItem key={ls.id} value={ls.id}>
              <div className="flex items-center gap-2">
                <Icon className="shrink-0" width={14} height={14} />
                <span>
                  {displayName(ls)} ({formatLength(ls.totalThickness)})
                </span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

export function LayerSetSelectWithEdit(props: LayerSetSelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { navigateToConfig } = useConfigNavigation()

  return (
    <div className="flex items-center gap-1">
      <div className="grow">
        <LayerSetSelect {...props} />
      </div>
      <Button
        size="icon-xs"
        title={t($ => $.layerSets.configure)}
        variant="ghost"
        onClick={() => {
          void navigateToConfig('layers', props.value ?? undefined)
        }}
      >
        <Pencil />
      </Button>
    </div>
  )
}
