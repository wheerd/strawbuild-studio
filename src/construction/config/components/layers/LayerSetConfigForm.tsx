import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import { TextField } from '@/components/ui/text-field'
import { LayerListEditor } from '@/construction/config/components/layers/LayerListEditor'
import { useConfigActions } from '@/construction/config/store'
import type { LayerSetConfig, LayerSetUse } from '@/construction/layers/types'
import { useDebouncedInput } from '@/shared/hooks/useDebouncedInput'

const ALL_USES: LayerSetUse[] = [
  'wall-inside',
  'wall-outside',
  'floor-top',
  'floor-bottom',
  'roof-inside',
  'roof-top',
  'roof-overhang'
]

type LayerSetUseKey =
  | 'wallInside'
  | 'wallOutside'
  | 'floorTop'
  | 'floorBottom'
  | 'roofInside'
  | 'roofTop'
  | 'roofOverhang'

interface LayerSetConfigFormProps {
  layerSet: LayerSetConfig
}

export function LayerSetConfigForm({ layerSet }: LayerSetConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const {
    updateLayerSetName,
    updateLayerSetUses,
    addLayerToSet,
    setLayerSetLayers,
    updateLayerInSet,
    removeLayerFromSet,
    moveLayerInSet
  } = useConfigActions()

  const nameState = useDebouncedInput(layerSet.name, name => {
    updateLayerSetName(layerSet.id, name)
  })

  const handleUseToggle = (use: LayerSetUse, checked: boolean) => {
    const newUses = checked ? [...layerSet.uses, use] : layerSet.uses.filter(u => u !== use)
    updateLayerSetUses(layerSet.id, newUses)
  }

  const getUseKey = (use: LayerSetUse): LayerSetUseKey => {
    const keyMap: Record<LayerSetUse, LayerSetUseKey> = {
      'wall-inside': 'wallInside',
      'wall-outside': 'wallOutside',
      'floor-top': 'floorTop',
      'floor-bottom': 'floorBottom',
      'roof-inside': 'roofInside',
      'roof-top': 'roofTop',
      'roof-overhang': 'roofOverhang'
    }
    return keyMap[use]
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[auto_1fr] items-center gap-2">
        <span className="text-sm font-medium">{t($ => $.common.name)}</span>
        <TextField.Root
          size="sm"
          value={nameState.value}
          onChange={e => {
            nameState.handleChange(e.target.value)
          }}
          onBlur={nameState.handleBlur}
          onKeyDown={nameState.handleKeyDown}
          placeholder={t($ => $.common.placeholders.name)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t($ => $.layerSets.labels.uses)}</span>
        <div className="flex flex-wrap gap-2">
          {ALL_USES.map(use => (
            <label key={use} className="flex items-center gap-1">
              <Checkbox
                checked={layerSet.uses.includes(use)}
                onCheckedChange={checked => {
                  handleUseToggle(use, checked === true)
                }}
              />
              <span className="text-sm">{t($ => $.layerSets.uses[getUseKey(use)])}</span>
            </label>
          ))}
        </div>
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
