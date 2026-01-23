import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { CornerHandling, RingBeamConfig } from '@/construction/ringBeams'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface DoubleRingBeamConfigFormProps {
  config: RingBeamConfig & { type: 'double' }
  onUpdate: (updates: Partial<RingBeamConfig>) => void
}

export function DoubleRingBeamConfigForm({ config, onUpdate }: DoubleRingBeamConfigFormProps) {
  const { t } = useTranslation('config')
  return (
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
        preferredTypes={['dimensional']}
      />

      <Label.Root>
        <span className="text-base font-medium">{t($ => $.common.materialLabel)}</span>
      </Label.Root>
      <MaterialSelectWithEdit
        value={config.infillMaterial}
        onValueChange={infillMaterial => {
          if (!infillMaterial) return
          onUpdate({ infillMaterial })
        }}
        placeholder={t($ => $.common.placeholders.selectMaterial)}
      />

      <div className="flex items-center gap-1">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.height)}</span>
        </Label.Root>
        <MeasurementInfo highlightedPart="plates" />
      </div>
      <LengthField
        value={config.height}
        onChange={height => {
          onUpdate({ height })
        }}
        unit="mm"
      />

      <div className="flex items-center gap-1">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <MeasurementInfo highlightedPart="plates" />
      </div>
      <LengthField
        value={config.thickness}
        onChange={thickness => {
          onUpdate({ thickness })
        }}
        unit="mm"
      />

      <div className="flex items-center gap-1">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.spacing)}</span>
        </Label.Root>
        <MeasurementInfo highlightedPart="plates" />
      </div>
      <LengthField
        value={config.spacing}
        onChange={spacing => {
          onUpdate({ spacing })
        }}
        unit="mm"
      />

      <div className="flex items-center gap-1">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.ringBeams.labels.offsetFromInsideEdge)}</span>
        </Label.Root>
        <MeasurementInfo highlightedPart="plates" />
      </div>
      <LengthField
        value={config.offsetFromEdge}
        onChange={offsetFromEdge => {
          onUpdate({ offsetFromEdge })
        }}
        unit="mm"
      />

      <span className="text-base font-medium">{t($ => $.ringBeams.labels.cornerHandling)}</span>

      <div className="col-span-3">
        <ToggleGroup
          type="single"
          variant="outline"
          value={config.cornerHandling}
          onValueChange={value => {
            if (value) {
              onUpdate({ cornerHandling: value as CornerHandling })
            }
          }}
        >
          <ToggleGroupItem value="cut">{t($ => $.ringBeams.labels.cornerHandlingCut)}</ToggleGroupItem>
          <ToggleGroupItem value="interweave">{t($ => $.ringBeams.labels.cornerHandlingInterweave)}</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}
