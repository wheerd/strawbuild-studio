import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import type { FloorAssemblyId } from '@/building/model/ids'
import { Separator } from '@/components/ui/separator'
import { LayerSetSelect } from '@/construction/config/components/layers/LayerSetSelect'
import { useConfigActions } from '@/construction/config/store'
import type { FloorConfig } from '@/construction/floors/types'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'

interface LayersConfigFormProps {
  assemblyId: FloorAssemblyId
  config: FloorConfig
}

export function LayersConfigForm({ assemblyId, config }: LayersConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { updateFloorAssemblyConfig } = useConfigActions()

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.floors.layers.topLayers)}</span>
          </Label.Root>
          <MeasurementInfo highlightedPart="floorTopLayers" showFinishedLevels />
        </div>
        <LayerSetSelect
          value={config.topLayerSetId}
          onValueChange={value => {
            updateFloorAssemblyConfig(assemblyId, { topLayerSetId: value })
          }}
          use="floor"
          placeholder={t($ => $.floors.layers.noTopLayers)}
        />
      </div>

      <Separator />

      <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.floors.layers.bottomLayers)}</span>
          </Label.Root>
          <MeasurementInfo highlightedPart="floorBottomLayers" showFinishedLevels />
        </div>
        <LayerSetSelect
          value={config.bottomLayerSetId}
          onValueChange={value => {
            updateFloorAssemblyConfig(assemblyId, { bottomLayerSetId: value })
          }}
          use="ceiling"
          placeholder={t($ => $.floors.layers.noBottomLayers)}
        />
      </div>
    </div>
  )
}
