import { InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip } from '@/components/ui/tooltip'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { TriangularBattenConfig } from '@/construction/materials/triangularBattens'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface TriangularBattensConfigFormProps {
  triangularBattens: TriangularBattenConfig
  onUpdate: (config: TriangularBattenConfig) => void
}

export function TriangularBattensConfigForm({
  triangularBattens,
  onUpdate
}: TriangularBattensConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2>{t($ => $.walls.triangularBattensConfiguration)}</h2>
        <Tooltip content={t($ => $.walls.triangularBattensTooltip)}>
          <InfoCircledIcon className="cursor-help" />
        </Tooltip>
      </div>

      <div className="grid grid-cols-[5em_1fr_5em_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.walls.battenSize)}</span>
        </Label.Root>
        <LengthField
          value={triangularBattens.size}
          onChange={value => {
            onUpdate({ ...triangularBattens, size: value })
          }}
          unit="mm"
          size="sm"
        />

        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.walls.battenMinLength)}</span>
        </Label.Root>
        <LengthField
          value={triangularBattens.minLength}
          onChange={value => {
            onUpdate({ ...triangularBattens, minLength: value })
          }}
          unit="mm"
          size="sm"
        />
      </div>

      <div className="grid grid-cols-[5em_1fr] gap-2 gap-x-3">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={triangularBattens.material}
          onValueChange={material => {
            if (!material) return
            onUpdate({ ...triangularBattens, material })
          }}
          size="sm"
          preferredTypes={['dimensional']}
        />
      </div>

      <div className="flex gap-3">
        <Label.Root>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={triangularBattens.inside}
              onCheckedChange={checked => {
                onUpdate({ ...triangularBattens, inside: checked === true })
              }}
            />
            <span className="text-sm font-medium">{t($ => $.walls.battenInside)}</span>
          </div>
        </Label.Root>

        <Label.Root>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={triangularBattens.outside}
              onCheckedChange={checked => {
                onUpdate({ ...triangularBattens, outside: checked === true })
              }}
            />
            <span className="text-sm font-medium">{t($ => $.walls.battenOutside)}</span>
          </div>
        </Label.Root>
      </div>
    </div>
  )
}
