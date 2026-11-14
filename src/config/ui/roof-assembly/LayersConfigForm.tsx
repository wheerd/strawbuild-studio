import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import type { RoofAssemblyId } from '@/building/model/ids'
import { useConfigActions } from '@/config/store'
import { LayerSetSelectWithEdit } from '@/config/ui/layers/LayerSetSelect'
import { AssemblySdValueRow, RoofPhysicsPanel, useRoofAssemblyPhysics } from '@/config/ui/physics'
import type { RoofConfig } from '@/construction/assemblies/roofs/types'
import { RoofMeasurementInfo } from '@/shared/ui/RoofMeasurementInfo'

interface LayersConfigFormProps {
  assemblyId: RoofAssemblyId
  config: RoofConfig
}

export function LayersConfigForm({ assemblyId, config }: LayersConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { updateRoofAssemblyConfig } = useConfigActions()

  const physicsStructure = useRoofAssemblyPhysics(config)

  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.roofs.layersSection)}</h2>
      <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.roofs.layers.inside)}</span>
          </Label.Root>
          <RoofMeasurementInfo highlightedPart="roofBottomLayers" showFinishedLevels />
        </div>
        <LayerSetSelectWithEdit
          value={config.insideLayerSetId}
          allowNone
          onValueChange={value => {
            updateRoofAssemblyConfig(assemblyId, { insideLayerSetId: value })
          }}
          use="ceiling"
          placeholder={t($ => $.roofs.noInsideLayers)}
          size="sm"
        />

        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.roofs.layers.top)}</span>
          </Label.Root>
          <RoofMeasurementInfo highlightedPart="roofTopLayers" showFinishedLevels />
        </div>
        <LayerSetSelectWithEdit
          value={config.topLayerSetId}
          allowNone
          onValueChange={value => {
            updateRoofAssemblyConfig(assemblyId, { topLayerSetId: value })
          }}
          use="roof"
          placeholder={t($ => $.roofs.noTopLayers)}
          size="sm"
        />

        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.roofs.layers.overhang)}</span>
          </Label.Root>
          <RoofMeasurementInfo highlightedPart="overhangBottomLayers" showFinishedLevels />
        </div>
        <LayerSetSelectWithEdit
          value={config.overhangLayerSetId}
          allowNone
          onValueChange={value => {
            updateRoofAssemblyConfig(assemblyId, { overhangLayerSetId: value })
          }}
          use="roof"
          placeholder={t($ => $.roofs.noOverhangLayers)}
          size="sm"
        />
      </div>

      <AssemblySdValueRow physicsStructure={physicsStructure} />
      <RoofPhysicsPanel physicsStructure={physicsStructure} />
    </div>
  )
}
