import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import type { WallAssemblyId } from '@/building/model/ids'
import { Separator } from '@/components/ui/separator'
import { OpeningAssemblySelectWithEdit } from '@/construction/config/components/OpeningAssemblySelectWithEdit'
import { LayerSetSelect } from '@/construction/config/components/layers/LayerSetSelect'
import { useConfigActions } from '@/construction/config/store'
import type { WallAssemblyConfig } from '@/construction/config/types'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'

interface CommonConfigFormProps {
  assemblyId: WallAssemblyId
  config: WallAssemblyConfig
}

export function CommonConfigForm({ assemblyId, config }: CommonConfigFormProps): React.JSX.Element {
  const { updateWallAssemblyConfig } = useConfigActions()
  const { t } = useTranslation('config')

  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.walls.openingsSection)}</h2>
      <div className="flex flex-col gap-1">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.walls.openingAssembly)}</span>
        </Label.Root>
        <OpeningAssemblySelectWithEdit
          value={config.openingAssemblyId}
          onValueChange={value => {
            updateWallAssemblyConfig(assemblyId, {
              openingAssemblyId: value
            })
          }}
          allowDefault
          showDefaultIndicator
          placeholder={t($ => $.common.placeholder)}
          size="sm"
        />
      </div>
      <Separator />
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-sm font-medium">{t($ => $.walls.insideLayers)}</span>
            </Label.Root>
            <MeasurementInfo highlightedPart="insideLayer" showFinishedSides />
          </div>
          <LayerSetSelect
            value={config.insideLayerSetId}
            onValueChange={value => {
              updateWallAssemblyConfig(assemblyId, { insideLayerSetId: value })
            }}
            use="wall"
            placeholder={t($ => $.walls.noInsideLayers)}
          />
        </div>

        <Separator />

        <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-sm font-medium">{t($ => $.walls.outsideLayers)}</span>
            </Label.Root>
            <MeasurementInfo highlightedPart="outsideLayer" showFinishedSides />
          </div>
          <LayerSetSelect
            value={config.outsideLayerSetId}
            onValueChange={value => {
              updateWallAssemblyConfig(assemblyId, { outsideLayerSetId: value })
            }}
            use="wall"
            placeholder={t($ => $.walls.noOutsideLayers)}
          />
        </div>
      </div>
    </div>
  )
}
