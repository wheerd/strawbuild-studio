import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import { Separator } from '@/components/ui/separator'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { PurlinRoofConfig } from '@/construction/roofs/types'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface PurlinRoofConfigFormProps {
  config: PurlinRoofConfig
  onUpdate: (updates: Partial<PurlinRoofConfig>) => void
}

export function PurlinRoofConfigForm({ config, onUpdate }: PurlinRoofConfigFormProps) {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.roofs.sections.straw)}</h2>

      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.layerThickness)}</span>
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

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.strawMaterialOverride)}</span>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.strawMaterial ?? null}
            allowEmpty
            emptyLabel={t($ => $.common.useGlobalStrawSettings)}
            onValueChange={strawMaterial => {
              onUpdate({ ...config, strawMaterial: strawMaterial ?? undefined })
            }}
            size="sm"
            preferredTypes={['strawbale']}
          />
        </div>
      </div>

      <Separator />

      <h2>{t($ => $.roofs.sections.purlins)}</h2>
      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.materialLabel)}</span>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.purlinMaterial}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, purlinMaterial: material })
            }}
            size="sm"
            preferredTypes={['dimensional']}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.height)}</span>
          </Label.Root>
          <LengthField
            value={config.purlinHeight}
            onChange={value => {
              onUpdate({ ...config, purlinHeight: value })
            }}
            unit="cm"
            min={0}
            step={10}
            size="sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.inset)}</span>
          </Label.Root>
          <LengthField
            value={config.purlinInset}
            onChange={value => {
              onUpdate({ ...config, purlinInset: value })
            }}
            unit="mm"
            min={0}
            size="sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.width)}</span>
          </Label.Root>
          <LengthField
            value={config.purlinWidth}
            onChange={value => {
              onUpdate({ ...config, purlinWidth: value })
            }}
            unit="cm"
            min={0}
            step={10}
            size="sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.spacing)}</span>
          </Label.Root>
          <LengthField
            value={config.purlinSpacing}
            onChange={value => {
              onUpdate({ ...config, purlinSpacing: value })
            }}
            unit="cm"
            min={0}
            step={100}
            size="sm"
          />
        </div>
      </div>

      <Separator />

      <h2>{t($ => $.roofs.sections.rafters)}</h2>
      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.materialLabel)}</span>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.rafterMaterial}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, rafterMaterial: material })
            }}
            size="sm"
            preferredTypes={['dimensional']}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.width)}</span>
          </Label.Root>
          <LengthField
            value={config.rafterWidth}
            onChange={value => {
              onUpdate({ ...config, rafterWidth: value })
            }}
            unit="cm"
            min={0}
            step={10}
            size="sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.roofs.labels.spacingMin)}</span>
          </Label.Root>
          <LengthField
            value={config.rafterSpacingMin}
            onChange={value => {
              onUpdate({ ...config, rafterSpacingMin: value })
            }}
            unit="cm"
            min={0}
            step={10}
            size="sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.roofs.labels.spacingTarget)}</span>
          </Label.Root>
          <LengthField
            value={config.rafterSpacing}
            onChange={value => {
              onUpdate({ ...config, rafterSpacing: value })
            }}
            unit="cm"
            min={0}
            step={100}
            size="sm"
          />
        </div>
      </div>

      <Separator />

      <h2>{t($ => $.roofs.sections.decking)}</h2>

      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.materialLabel)}</span>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.deckingMaterial}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, deckingMaterial: material })
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
            value={config.deckingThickness}
            onChange={value => {
              onUpdate({ ...config, deckingThickness: value })
            }}
            unit="mm"
            min={0}
            size="sm"
          />
        </div>
      </div>

      <Separator />

      <h2>{t($ => $.roofs.sections.ceilingSheathing)}</h2>

      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.materialLabel)}</span>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.ceilingSheathingMaterial}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, ceilingSheathingMaterial: material })
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
            value={config.ceilingSheathingThickness}
            onChange={value => {
              onUpdate({ ...config, ceilingSheathingThickness: value })
            }}
            unit="mm"
            min={0}
            size="sm"
          />
        </div>
      </div>
    </div>
  )
}
