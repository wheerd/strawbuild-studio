import * as Label from '@radix-ui/react-label'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Separator } from '@/components/ui/separator'
import { TextField } from '@/components/ui/text-field'
import type { FloorAssemblyConfig } from '@/construction/config'
import { getFloorAssemblyTypeIcon } from '@/construction/config/components/Icons'
import { useConfigActions } from '@/construction/config/store'
import { resolveFloorAssembly } from '@/construction/floors'
import type { FloorConfig } from '@/construction/floors/types'
import { useDebouncedInput } from '@/shared/hooks/useDebouncedInput'
import { useFormatters } from '@/shared/i18n/useFormatters'

import { FilledConfigForm } from './FilledConfigForm'
import { HangingJoistConfigForm } from './HangingJoistConfigForm'
import { JoistConfigForm } from './JoistConfigForm'
import { LayersConfigForm } from './LayersConfigForm'
import { MonolithicConfigForm } from './MonolithicConfigForm'

interface ConfigFormProps {
  assembly: FloorAssemblyConfig
}

export function ConfigForm({ assembly }: ConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { formatLength } = useFormatters()
  const { updateFloorAssemblyName, updateFloorAssemblyConfig } = useConfigActions()

  const nameKey = assembly.nameKey

  const nameInput = useDebouncedInput(
    nameKey ? t(nameKey) : assembly.name,
    (name: string) => {
      updateFloorAssemblyName(assembly.id, name)
    },
    {
      debounceMs: 1000
    }
  )

  const handleUpdateConfig = useCallback(
    (updates: Partial<FloorConfig>) => {
      updateFloorAssemblyConfig(assembly.id, updates)
    },
    [assembly.id, updateFloorAssemblyConfig]
  )

  const totalThickness = useMemo(
    () => formatLength(resolveFloorAssembly(assembly).totalThickness),
    [assembly, formatLength]
  )

  return (
    <div
      className="flex flex-col gap-3 p-3"
      style={{ border: '1px solid var(--color-gray-600)', borderRadius: 'var(--radius-2)' }}
    >
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
              {React.createElement(getFloorAssemblyTypeIcon(assembly.type))}
              <span className="text-base">
                {assembly.type === 'monolithic'
                  ? t($ => $.floors.types.monolithic)
                  : assembly.type === 'joist'
                    ? t($ => $.floors.types.joist)
                    : assembly.type === 'hanging-joist'
                      ? t($ => $.floors.types.hangingJoist)
                      : t($ => $.floors.types.straw)}
              </span>
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

      {assembly.type === 'monolithic' && <MonolithicConfigForm config={assembly} onUpdate={handleUpdateConfig} />}
      {assembly.type === 'joist' && <JoistConfigForm config={assembly} onUpdate={handleUpdateConfig} />}
      {assembly.type === 'filled' && <FilledConfigForm config={assembly} onUpdate={handleUpdateConfig} />}
      {assembly.type === 'hanging-joist' && <HangingJoistConfigForm config={assembly} onUpdate={handleUpdateConfig} />}

      <Separator />

      <LayersConfigForm assemblyId={assembly.id} config={assembly} />
    </div>
  )
}
