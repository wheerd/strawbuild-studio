import { InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip } from '@/components/ui/tooltip'
import type { FilledFloorConfig } from '@/construction/floors/types'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface FilledConfigFormProps {
  config: FilledFloorConfig
  onUpdate: (updates: Partial<FilledFloorConfig>) => void
}

export function FilledConfigForm({ config, onUpdate }: FilledConfigFormProps) {
  const { t } = useTranslation('config')
  return (
    <>
      <h2 className="font-medium">{t($ => $.floors.types.straw)}</h2>

      <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span>{t($ => $.floors.labels.constructionHeight)}</span>
          </Label.Root>
          <Tooltip content={t($ => $.floors.tips.constructionHeight)}>
            <Button size="icon-xs" className="cursor-help rounded-full" variant="ghost">
              <InfoCircledIcon />
            </Button>
          </Tooltip>
        </div>
        <LengthField
          value={config.constructionHeight}
          onChange={constructionHeight => {
            onUpdate({ constructionHeight })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      <h2 className="font-medium">{t($ => $.floors.sections.joists)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span>{t($ => $.common.materialLabel)}</span>
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

        <Label.Root>
          <span>{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.joistThickness}
          onChange={joistThickness => {
            onUpdate({ joistThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span>{t($ => $.common.spacing)}</span>
        </Label.Root>
        <LengthField
          value={config.joistSpacing}
          onChange={joistSpacing => {
            onUpdate({ joistSpacing })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      <h2 className="font-medium">{t($ => $.floors.sections.perimeterFrame)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span>{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.frameMaterial}
          onValueChange={frameMaterial => {
            if (!frameMaterial) return
            onUpdate({ frameMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span>{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.frameThickness}
          onChange={frameThickness => {
            onUpdate({ frameThickness })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      <h2 className="font-medium">{t($ => $.floors.sections.subfloor)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span>{t($ => $.common.materialLabel)}</span>
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
          <span>{t($ => $.common.thickness)}</span>
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

      <h2 className="font-medium">{t($ => $.floors.sections.ceilingSheathing)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span>{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.ceilingSheathingMaterial}
          onValueChange={ceilingSheathingMaterial => {
            if (!ceilingSheathingMaterial) return
            onUpdate({ ceilingSheathingMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['sheet']}
        />

        <Label.Root>
          <span>{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.ceilingSheathingThickness}
          onChange={ceilingSheathingThickness => {
            onUpdate({ ceilingSheathingThickness })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      <h2 className="font-medium">{t($ => $.floors.sections.openingFrame)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span>{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.openingFrameMaterial}
          onValueChange={openingFrameMaterial => {
            if (!openingFrameMaterial) return
            onUpdate({ openingFrameMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span>{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.openingFrameThickness}
          onChange={openingFrameThickness => {
            onUpdate({ openingFrameThickness })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      <h2 className="font-medium">{t($ => $.floors.sections.strawInfill)}</h2>
      <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span>{t($ => $.common.strawMaterialOverride)}</span>
          </Label.Root>
          <Tooltip content={t($ => $.floors.tips.strawMaterialOverride)}>
            <Button size="icon-xs" className="cursor-help rounded-full" variant="ghost">
              <InfoCircledIcon width={12} height={12} />
            </Button>
          </Tooltip>
        </div>
        <MaterialSelectWithEdit
          value={config.strawMaterial ?? null}
          allowEmpty
          emptyLabel={t($ => $.common.useGlobalStrawSettings)}
          onValueChange={strawMaterial => {
            onUpdate({ strawMaterial: strawMaterial ?? undefined })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['strawbale']}
        />
      </div>
    </>
  )
}
