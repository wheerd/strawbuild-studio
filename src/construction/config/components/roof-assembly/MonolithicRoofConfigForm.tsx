import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MonolithicRoofConfig } from '@/construction/roofs/types'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface MonolithicRoofConfigFormProps {
  config: MonolithicRoofConfig
  onUpdate: (updates: Partial<MonolithicRoofConfig>) => void
}

export function MonolithicRoofConfigForm({ config, onUpdate }: MonolithicRoofConfigFormProps) {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.roofs.sections.monolithicConfiguration)}</h2>

      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.materialLabel)}</span>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.material}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, material })
            }}
            size="sm"
            preferredTypes={['sheet']}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.thickness)}</span>
          </Label.Root>
          <LengthField
            value={config.thickness}
            onChange={value => {
              onUpdate({ ...config, thickness: value })
            }}
            unit="cm"
            min={0}
            step={10}
            size="sm"
          />
        </div>
      </div>
    </div>
  )
}
