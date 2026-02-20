import { useTranslation } from 'react-i18next'

import { Select } from '@/components/ui/select'
import { TextField } from '@/components/ui/text-field'
import { LayerListEditor } from '@/construction/config/components/layers/LayerListEditor'
import { useConfigActions } from '@/construction/config/store'
import type { LayerSetConfig, LayerSetUse } from '@/construction/layers/types'
import { useDebouncedInput } from '@/shared/hooks/useDebouncedInput'

import { getLayerSetUseIcon } from './LayerSetSelect'

interface LayerSetConfigFormProps {
  layerSet: LayerSetConfig
}

const USE_OPTIONS: LayerSetUse[] = ['wall', 'floor', 'ceiling', 'roof']

export function LayerSetConfigForm({ layerSet }: LayerSetConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const {
    updateLayerSetName,
    updateLayerSetUse,
    addLayerToSet,
    setLayerSetLayers,
    updateLayerInSet,
    removeLayerFromSet,
    moveLayerInSet
  } = useConfigActions()

  const nameKey = layerSet.nameKey
  const nameInput = useDebouncedInput(
    nameKey ? t(nameKey) : layerSet.name,
    name => {
      updateLayerSetName(layerSet.id, name)
    },
    {
      debounceMs: 1000
    }
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[auto_1fr] items-center gap-2">
        <span className="text-sm font-medium">{t($ => $.common.name)}</span>
        <TextField.Root
          size="sm"
          value={nameInput.value}
          onChange={e => {
            nameInput.handleChange(e.target.value)
          }}
          onBlur={nameInput.handleBlur}
          onKeyDown={nameInput.handleKeyDown}
          placeholder={t($ => $.common.placeholders.name)}
          required
        />
      </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-2">
        <span className="text-sm font-medium">{t($ => $.layerSets.labels.use)}</span>
        <Select.Root
          value={layerSet.use}
          onValueChange={value => {
            updateLayerSetUse(layerSet.id, value as LayerSetUse)
          }}
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {USE_OPTIONS.map(use => {
              const Icon = getLayerSetUseIcon(use)
              return (
                <Select.Item key={use} value={use}>
                  <div className="flex items-center gap-2">
                    <Icon width={14} height={14} className="shrink-0" />
                    <span>{t($ => $.layerSets.uses[use])}</span>
                  </div>
                </Select.Item>
              )
            })}
          </Select.Content>
        </Select.Root>
      </div>

      <LayerListEditor
        title={t($ => $.common.totalThickness)}
        layers={layerSet.layers}
        onAddLayer={layer => {
          addLayerToSet(layerSet.id, layer)
        }}
        onReplaceLayers={layers => {
          setLayerSetLayers(layerSet.id, layers)
        }}
        onUpdateLayer={(index, updates) => {
          updateLayerInSet(layerSet.id, index, updates)
        }}
        onRemoveLayer={index => {
          removeLayerFromSet(layerSet.id, index)
        }}
        onMoveLayer={(fromIndex, toIndex) => {
          moveLayerInSet(layerSet.id, fromIndex, toIndex)
        }}
        addLabel={t($ => $.common.add)}
        emptyHint="No layers defined"
        beforeLabel=""
        afterLabel=""
      />
    </div>
  )
}
