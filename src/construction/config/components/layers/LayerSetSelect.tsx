import { useTranslation } from 'react-i18next'

import type { LayerSetId } from '@/building/model/ids'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLayerSets } from '@/construction/config/store'
import type { LayerSetConfig, LayerSetUse } from '@/construction/layers/types'
import { useFormatters } from '@/shared/i18n/useFormatters'

export interface LayerSetSelectProps {
  value: LayerSetId | undefined
  onValueChange: (value: LayerSetId) => void
  use?: LayerSetUse
  placeholder?: string
  disabled?: boolean
}

export function LayerSetSelect({
  value,
  onValueChange,
  use,
  placeholder,
  disabled
}: LayerSetSelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { formatLength } = useFormatters()
  const allLayerSets = useLayerSets()

  const layerSets = use ? allLayerSets.filter(ls => ls.uses.includes(use)) : allLayerSets

  const displayName = (layerSet: { name: string; nameKey?: LayerSetConfig['nameKey'] }) =>
    layerSet.nameKey ? t(layerSet.nameKey) : layerSet.name

  const selectedLayerSet = layerSets.find(ls => ls.id === value)

  return (
    <Select
      value={value ?? ''}
      onValueChange={val => {
        onValueChange(val as LayerSetId)
      }}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? t($ => $.common.placeholder)}>
          {selectedLayerSet && (
            <span>
              {displayName(selectedLayerSet)} ({formatLength(selectedLayerSet.totalThickness)})
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {layerSets.map(ls => (
          <SelectItem key={ls.id} value={ls.id}>
            <span>
              {displayName(ls)} ({formatLength(ls.totalThickness)})
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
