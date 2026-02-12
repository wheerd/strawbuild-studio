import * as Label from '@radix-ui/react-label'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TextField } from '@/components/ui/text-field'
import { getPerimeterConfigTypeIcon } from '@/construction/config/components/Icons'
import { useConfigActions } from '@/construction/config/store'
import type { WallAssemblyConfig } from '@/construction/config/types'
import { formatThicknessRange } from '@/construction/materials/thickness'
import { type WallConfig, resolveWallAssembly } from '@/construction/walls'
import { useDebouncedInput } from '@/shared/hooks/useDebouncedInput'

import { CommonConfigForm } from './CommonConfigForm'
import { InfillConfigForm } from './InfillConfigForm'
import { ModulesConfigForm } from './ModulesConfigForm'
import { NonStrawbaleConfigForm } from './NonStrawbaleConfigForm'
import { PrefabModulesConfigForm } from './PrefabModulesConfigForm'
import { StrawhengeConfigForm } from './StrawhengeConfigForm'

interface ConfigFormProps {
  assembly: WallAssemblyConfig
}

export function ConfigForm({ assembly }: ConfigFormProps): React.JSX.Element {
  const { updateWallAssemblyName, updateWallAssemblyConfig } = useConfigActions()

  const { t } = useTranslation('config')
  const nameKey = assembly.nameKey

  const nameInput = useDebouncedInput(
    nameKey ? t(nameKey) : assembly.name,
    (name: string) => {
      updateWallAssemblyName(assembly.id, name)
    },
    {
      debounceMs: 1000
    }
  )

  const updateConfig = useCallback(
    (updates: Partial<WallConfig>) => {
      updateWallAssemblyConfig(assembly.id, updates)
    },
    [assembly.id, assembly, updateWallAssemblyConfig]
  )

  const wallAssembly = useMemo(() => resolveWallAssembly(assembly), [assembly])
  const totalThickness = formatThicknessRange(wallAssembly.thicknessRange, t)

  return (
    <Card className="flex flex-col gap-3 p-3">
      <div className="grid grid-cols-2 items-center gap-2 gap-x-3">
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-2">
          <Label.Root>
            <span className="text-base font-medium">{t($ => $.common.name)}</span>
          </Label.Root>
          <TextField.Root
            value={nameInput.value}
            onChange={e => {
              nameInput.handleChange(e.target.value)
            }}
            onBlur={nameInput.handleBlur}
            onKeyDown={nameInput.handleKeyDown}
            placeholder={t($ => $.common.placeholders.name)}
          />
        </div>

        <div className="grid grid-cols-2 items-center gap-2 gap-x-3">
          <div className="flex items-center gap-2">
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.common.type)}</span>
            </Label.Root>
            <div className="flex items-center gap-2">
              {React.createElement(getPerimeterConfigTypeIcon(assembly.type))}
              <span className="text-base">{t($ => $.walls.types[assembly.type])}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.common.totalThickness)}</span>
            </Label.Root>
            <span className="text-base">{totalThickness}</span>
          </div>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          {assembly.type === 'infill' && <InfillConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'strawhenge' && <StrawhengeConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'modules' && <ModulesConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'non-strawbale' && <NonStrawbaleConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'prefab-modules' && <PrefabModulesConfigForm config={assembly} onUpdate={updateConfig} />}
        </div>

        <div className="flex flex-col gap-3">
          <CommonConfigForm assemblyId={assembly.id} config={assembly} />
        </div>
      </div>
    </Card>
  )
}
