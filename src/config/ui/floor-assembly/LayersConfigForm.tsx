import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import type { FloorAssemblyId } from '@/building/model/ids'
import { useConfigActions } from '@/config/store'
import { LayerSetSelectWithEdit } from '@/config/ui/layers/LayerSetSelect'
import type { FloorConfig } from '@/construction/assemblies/floors/types'
import { MeasurementInfo } from '@/shared/ui/MeasurementInfo'
import { Separator } from '@/shared/ui/components/separator'

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
        <LayerSetSelectWithEdit
          value={config.topLayerSetId}
          allowNone
          onValueChange={value => {
            updateFloorAssemblyConfig(assemblyId, { topLayerSetId: value })
          }}
          use="floor"
          placeholder={t($ => $.floors.layers.noTopLayers)}
          size="sm"
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
        <LayerSetSelectWithEdit
          value={config.bottomLayerSetId}
          allowNone
          onValueChange={value => {
            updateFloorAssemblyConfig(assemblyId, { bottomLayerSetId: value })
          }}
          use="ceiling"
          placeholder={t($ => $.floors.layers.noBottomLayers)}
          size="sm"
        />
      </div>
    </div>
  )
}
