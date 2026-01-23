import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import { Separator } from '@/components/ui/separator'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { RingBeamConfig } from '@/construction/ringBeams'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface BrickRingBeamConfigFormProps {
  config: RingBeamConfig & { type: 'brick' }
  onUpdate: (updates: Partial<RingBeamConfig>) => void
}

export function BrickRingBeamConfigForm({ config, onUpdate }: BrickRingBeamConfigFormProps) {
  const { t } = useTranslation('config')
  return (
    <>
      <h2>{t($ => $.ringBeams.sections.stemWall)}</h2>

      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.height)}</span>
        </Label.Root>
        <LengthField
          value={config.wallHeight}
          onChange={wallHeight => {
            onUpdate({ wallHeight })
          }}
          unit="cm"
          min={0}
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.width)}</span>
        </Label.Root>
        <LengthField
          value={config.wallWidth}
          onChange={wallWidth => {
            onUpdate({ wallWidth })
          }}
          unit="cm"
          min={0}
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.wallMaterial}
          onValueChange={wallMaterial => {
            if (!wallMaterial) return
            onUpdate({ wallMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />
      </div>

      <Separator />

      <h2>{t($ => $.ringBeams.sections.insulation)}</h2>

      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.insulationThickness}
          onChange={insulationThickness => {
            onUpdate({ insulationThickness })
          }}
          unit="cm"
          min={0}
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.insulationMaterial}
          onValueChange={insulationMaterial => {
            if (!insulationMaterial) return
            onUpdate({ insulationMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
        />
      </div>

      <Separator />

      <h2>{t($ => $.ringBeams.sections.beam)}</h2>

      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.beamThickness}
          onChange={beamThickness => {
            onUpdate({ beamThickness })
          }}
          unit="cm"
          min={0}
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.width)}</span>
        </Label.Root>
        <LengthField
          value={config.beamWidth}
          onChange={beamWidth => {
            onUpdate({ beamWidth })
          }}
          unit="cm"
          min={0}
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.beamMaterial}
          onValueChange={beamMaterial => {
            if (!beamMaterial) return
            onUpdate({ beamMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />
      </div>

      <Separator />

      <h2>{t($ => $.ringBeams.sections.waterproofing)}</h2>

      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.waterproofingThickness}
          onChange={waterproofingThickness => {
            onUpdate({ waterproofingThickness })
          }}
          unit="mm"
          min={0}
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.waterproofingMaterial}
          onValueChange={waterproofingMaterial => {
            if (!waterproofingMaterial) return
            onUpdate({ waterproofingMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['sheet']}
        />
      </div>
    </>
  )
}
