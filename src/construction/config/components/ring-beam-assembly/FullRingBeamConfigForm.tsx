import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { RingBeamConfig } from '@/construction/ringBeams'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface FullRingBeamConfigFormProps {
  config: RingBeamConfig & { type: 'full' }
  onUpdate: (updates: Partial<RingBeamConfig>) => void
}

export function FullRingBeamConfigForm({ config, onUpdate }: FullRingBeamConfigFormProps) {
  const { t } = useTranslation('config')
  return (
    <>
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

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.width)}</span>
        </Label.Root>
        <LengthField
          value={config.width}
          onChange={width => {
            onUpdate({ width })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.ringBeams.labels.offsetFromInsideEdge)}</span>
        </Label.Root>
        <LengthField
          value={config.offsetFromEdge}
          onChange={offsetFromEdge => {
            onUpdate({ offsetFromEdge })
          }}
          unit="mm"
        />
      </div>
    </>
  )
}
