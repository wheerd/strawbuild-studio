import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import type { RoofAssemblyId } from '@/building/model/ids'
import { Separator } from '@/components/ui/separator'
import { LayerSetSelect } from '@/construction/config/components/layers/LayerSetSelect'
import { useConfigActions } from '@/construction/config/store'
import type { RoofConfig } from '@/construction/roofs/types'
import { RoofMeasurementInfo } from '@/editor/components/RoofMeasurementInfo'

interface LayersConfigFormProps {
  assemblyId: RoofAssemblyId
  config: RoofConfig
}

export function LayersConfigForm({ assemblyId, config }: LayersConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { updateRoofAssemblyConfig } = useConfigActions()

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.roofs.layers.insideLayers)}</span>
          </Label.Root>
          <RoofMeasurementInfo highlightedPart="roofBottomLayers" showFinishedLevels />
        </div>
        <LayerSetSelect
          value={config.insideLayerSetId}
          onValueChange={value => {
            updateRoofAssemblyConfig(assemblyId, { insideLayerSetId: value })
          }}
          use="ceiling"
          placeholder={t($ => $.roofs.noInsideLayers)}
        />
      </div>

      <Separator />

      <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.roofs.topLayers)}</span>
          </Label.Root>
          <RoofMeasurementInfo highlightedPart="roofTopLayers" showFinishedLevels />
        </div>
        <LayerSetSelect
          value={config.topLayerSetId}
          onValueChange={value => {
            updateRoofAssemblyConfig(assemblyId, { topLayerSetId: value })
          }}
          use="roof"
          placeholder={t($ => $.roofs.noTopLayers)}
        />
      </div>

      <Separator />

      <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.roofs.layers.overhangLayers)}</span>
          </Label.Root>
          <RoofMeasurementInfo highlightedPart="overhangBottomLayers" showFinishedLevels />
        </div>
        <LayerSetSelect
          value={config.overhangLayerSetId}
          onValueChange={value => {
            updateRoofAssemblyConfig(assemblyId, { overhangLayerSetId: value })
          }}
          use="roof"
          placeholder={t($ => $.roofs.noOverhangLayers)}
        />
      </div>
    </div>
  )
}
