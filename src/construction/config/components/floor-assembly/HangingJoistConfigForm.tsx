import { Info } from 'lucide-react'
import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip } from '@/components/ui/tooltip'
import type { HangingJoistFloorConfig } from '@/construction/floors/types'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface HangingJoistConfigFormProps {
  config: HangingJoistFloorConfig
  onUpdate: (updates: Partial<HangingJoistFloorConfig>) => void
}

export function HangingJoistConfigForm({ config, onUpdate }: HangingJoistConfigFormProps) {
  const { t } = useTranslation('config')
  return (
    <>
      <h3>{t($ => $.floors.types.hangingJoist)}</h3>

      <h2>{t($ => $.floors.sections.joists)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.joistMaterial}
          onValueChange={joistMaterial => {
            if (!joistMaterial) return
            onUpdate({ joistMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />

        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-base font-medium">{t($ => $.common.height)}</span>
          </Label.Root>
          <Tooltip content={t($ => $.floors.tips.joistHeight)}>
            <Button size="icon" className="cursor-help rounded-full" variant="ghost">
              <Info width={12} height={12} />
            </Button>
          </Tooltip>
        </div>
        <LengthField
          value={config.joistHeight}
          onChange={joistHeight => {
            onUpdate({ joistHeight })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.joistThickness}
          onChange={joistThickness => {
            onUpdate({ joistThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.spacing)}</span>
        </Label.Root>
        <LengthField
          value={config.joistSpacing}
          onChange={joistSpacing => {
            onUpdate({ joistSpacing })
          }}
          unit="mm"
        />
      </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-base font-medium">{t($ => $.floors.labels.verticalOffset)}</span>
          </Label.Root>
          <Tooltip content={t($ => $.floors.tips.verticalOffset)}>
            <Button size="icon" className="cursor-help rounded-full" variant="ghost">
              <Info width={12} height={12} />
            </Button>
          </Tooltip>
        </div>
        <LengthField
          value={config.verticalOffset}
          onChange={verticalOffset => {
            onUpdate({ verticalOffset })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      <h2>{t($ => $.floors.sections.subfloor)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.subfloorMaterial}
          onValueChange={subfloorMaterial => {
            if (!subfloorMaterial) return
            onUpdate({ subfloorMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['sheet']}
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.subfloorThickness}
          onChange={subfloorThickness => {
            onUpdate({ subfloorThickness })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      <h2>{t($ => $.floors.sections.openingSides)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.openingSideMaterial}
          onValueChange={openingSideMaterial => {
            if (!openingSideMaterial) return
            onUpdate({ openingSideMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.openingSideThickness}
          onChange={openingSideThickness => {
            onUpdate({ openingSideThickness })
          }}
          unit="mm"
        />
      </div>
    </>
  )
}
