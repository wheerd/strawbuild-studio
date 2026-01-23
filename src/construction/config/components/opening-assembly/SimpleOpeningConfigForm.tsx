import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { SimpleOpeningConfig } from '@/construction/openings/types'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface SimpleOpeningConfigFormProps {
  config: SimpleOpeningConfig
  update: (updates: Partial<SimpleOpeningConfig>) => void
}

export function SimpleOpeningConfigForm({ config, update }: SimpleOpeningConfigFormProps) {
  const { t } = useTranslation('config')
  return (
    <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
      <Label.Root>
        <span className="text-base font-medium">{t($ => $.openings.labels.padding)}</span>
      </Label.Root>
      <LengthField
        value={config.padding}
        onChange={padding => {
          update({ padding })
        }}
        unit="mm"
      />

      <Label.Root>
        <span className="text-base font-medium">{t($ => $.openings.labels.headerThickness)}</span>
      </Label.Root>
      <LengthField
        value={config.headerThickness}
        onChange={headerThickness => {
          update({ headerThickness })
        }}
        unit="mm"
      />

      <Label.Root>
        <span className="text-base font-medium">{t($ => $.openings.labels.headerMaterial)}</span>
      </Label.Root>
      <MaterialSelectWithEdit
        value={config.headerMaterial}
        onValueChange={headerMaterial => {
          if (!headerMaterial) return
          update({ headerMaterial })
        }}
        preferredTypes={['dimensional']}
      />

      <Label.Root>
        <span className="text-base font-medium">{t($ => $.openings.labels.sillThickness)}</span>
      </Label.Root>
      <LengthField
        value={config.sillThickness}
        onChange={sillThickness => {
          update({ sillThickness })
        }}
        unit="mm"
      />

      <Label.Root>
        <span className="text-base font-medium">{t($ => $.openings.labels.sillMaterial)}</span>
      </Label.Root>
      <MaterialSelectWithEdit
        value={config.sillMaterial}
        onValueChange={sillMaterial => {
          if (!sillMaterial) return
          update({ sillMaterial })
        }}
        preferredTypes={['dimensional']}
      />
    </div>
  )
}
