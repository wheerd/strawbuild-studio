import * as Label from '@radix-ui/react-label'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { PrefabModulesWallConfig } from '@/construction/walls'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface PrefabModulesConfigFormProps {
  config: PrefabModulesWallConfig
  onUpdate: (updates: Partial<PrefabModulesWallConfig>) => void
}

export function PrefabModulesConfigForm({ config, onUpdate }: PrefabModulesConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.walls.prefabModulesConfiguration)}</h2>
      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.defaultMaterial)}</span>
          <MaterialSelectWithEdit
            value={config.defaultMaterial}
            onValueChange={defaultMaterial => {
              onUpdate({ defaultMaterial: defaultMaterial ?? undefined })
            }}
            size="sm"
            onlyTypes={['prefab']}
          />
        </Label.Root>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.fallbackMaterial)}</span>
          <MaterialSelectWithEdit
            value={config.fallbackMaterial}
            onValueChange={fallbackMaterial => {
              onUpdate({ fallbackMaterial: fallbackMaterial ?? undefined })
            }}
            size="sm"
            allowEmpty
            emptyLabel={t($ => $.walls.prefab.useDefaultMaterial)}
            onlyTypes={['prefab']}
          />
        </Label.Root>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.inclinedMaterial)}</span>
          <MaterialSelectWithEdit
            value={config.inclinedMaterial}
            onValueChange={inclinedMaterial => {
              onUpdate({ inclinedMaterial: inclinedMaterial ?? undefined })
            }}
            size="sm"
            allowEmpty
            emptyLabel={t($ => $.walls.prefab.useDefaultMaterial)}
            onlyTypes={['prefab']}
          />
        </Label.Root>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.lintelMaterial)}</span>
          <MaterialSelectWithEdit
            value={config.lintelMaterial ?? undefined}
            onValueChange={lintelMaterial => {
              onUpdate({ lintelMaterial: lintelMaterial ?? undefined })
            }}
            size="sm"
            allowEmpty
            emptyLabel={t($ => $.walls.prefab.useDefaultMaterial)}
            onlyTypes={['prefab']}
          />
        </Label.Root>

        <Label.Root className="row-start-3 row-end-5 grid grid-rows-subgrid gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.sillMaterial)}</span>
          <MaterialSelectWithEdit
            value={config.sillMaterial ?? undefined}
            onValueChange={sillMaterial => {
              onUpdate({ sillMaterial: sillMaterial ?? undefined })
            }}
            size="sm"
            allowEmpty
            emptyLabel={t($ => $.walls.prefab.useDefaultMaterial)}
            onlyTypes={['prefab']}
          />
        </Label.Root>

        <div className="row-start-3 row-end-5 grid grid-rows-subgrid gap-1">
          <div /> {/* For the grid alignment */}
          <Label.Root className="flex items-center gap-1">
            <Checkbox
              checked={config.preferEqualWidths}
              onCheckedChange={value => {
                onUpdate({ preferEqualWidths: value === true })
              }}
            />
            <span className="text-base font-medium">{t($ => $.walls.prefab.preferEqualWidth)}</span>
          </Label.Root>
        </div>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.maxWidth)}</span>
          <LengthField
            value={config.maxWidth}
            onChange={maxWidth => {
              onUpdate({ maxWidth })
            }}
            unit="mm"
            size="sm"
          />
        </Label.Root>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.walls.targetWidth)}</span>
          </Label.Root>
          <LengthField
            value={config.targetWidth}
            onChange={targetWidth => {
              onUpdate({ targetWidth })
            }}
            unit="mm"
            size="sm"
          />
        </div>
      </div>

      <h2>{t($ => $.walls.prefab.tallWallReinforcement)}</h2>
      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.tallReinforceThreshold)}</span>
          <LengthField
            value={config.tallReinforceThreshold}
            onChange={tallReinforceThreshold => {
              onUpdate({ tallReinforceThreshold })
            }}
            unit="mm"
            size="sm"
          />
        </Label.Root>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.tallReinforceThickness)}</span>
          <LengthField
            value={config.tallReinforceThickness}
            onChange={tallReinforceThickness => {
              onUpdate({ tallReinforceThickness })
            }}
            unit="mm"
            size="sm"
          />
        </Label.Root>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.tallReinforceStagger)}</span>
          <LengthField
            value={config.tallReinforceStagger}
            onChange={tallReinforceStagger => {
              onUpdate({ tallReinforceStagger })
            }}
            unit="mm"
            size="sm"
          />
        </Label.Root>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.tallReinforceMaterial)}</span>
          <MaterialSelectWithEdit
            value={config.tallReinforceMaterial}
            onValueChange={tallReinforceMaterial => {
              onUpdate({ tallReinforceMaterial: tallReinforceMaterial ?? undefined })
            }}
            size="sm"
            preferredTypes={['sheet', 'dimensional']}
          />
        </Label.Root>
      </div>
    </div>
  )
}
