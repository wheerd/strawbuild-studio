import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { PlankedOpeningConfig } from '@/construction/openings/types'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface PlankedOpeningConfigFormProps {
  config: PlankedOpeningConfig
  update: (updates: Partial<PlankedOpeningConfig>) => void
}

export function PlankedOpeningConfigForm({ config, update }: PlankedOpeningConfigFormProps) {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t($ => $.openings.sections.opening)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.padding)}</span>
        </Label.Root>
        <div className="col-span-3">
          <LengthField
            value={config.padding}
            onChange={padding => {
              update({ padding })
            }}
            unit="mm"
          />
        </div>

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

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.plankThickness)}</span>
        </Label.Root>
        <LengthField
          value={config.plankThickness}
          onChange={plankThickness => {
            update({ plankThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.plankMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.plankMaterial}
          onValueChange={plankMaterial => {
            if (!plankMaterial) return
            update({ plankMaterial })
          }}
          preferredTypes={['dimensional']}
        />
      </div>
    </div>
  )
}
