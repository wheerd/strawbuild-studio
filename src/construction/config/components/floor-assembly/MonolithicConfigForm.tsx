import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import type { MonolithicFloorConfig } from '@/construction/floors/types'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface MonolithicConfigFormProps {
  config: MonolithicFloorConfig
  onUpdate: (updates: Partial<MonolithicFloorConfig>) => void
}

export function MonolithicConfigForm({ config, onUpdate }: MonolithicConfigFormProps) {
  const { t } = useTranslation('config')
  return (
    <>
      <h3>{t($ => $.floors.types.monolithic)}</h3>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.material}
          onValueChange={material => {
            if (!material) return
            onUpdate({ material })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['sheet', 'volume']}
        />

        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-base font-medium">{t($ => $.common.thickness)}</span>
          </Label.Root>
          <MeasurementInfo highlightedPart="floorConstruction" />
        </div>
        <LengthField
          value={config.thickness}
          onChange={thickness => {
            onUpdate({ thickness })
          }}
          unit="mm"
        />
      </div>
    </>
  )
}
