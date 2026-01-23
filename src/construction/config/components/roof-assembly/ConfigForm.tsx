import * as Label from '@radix-ui/react-label'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TextField } from '@/components/ui/text-field'
import { getRoofAssemblyTypeIcon } from '@/construction/config/components/Icons'
import { useConfigActions } from '@/construction/config/store'
import type { RoofAssemblyConfig } from '@/construction/config/types'
import { resolveRoofAssembly } from '@/construction/roofs'
import type { RoofConfig } from '@/construction/roofs/types'
import { useDebouncedInput } from '@/shared/hooks/useDebouncedInput'
import { useFormatters } from '@/shared/i18n/useFormatters'

import { LayersConfigForm } from './LayersConfigForm'
import { MonolithicRoofConfigForm } from './MonolithicRoofConfigForm'
import { PurlinRoofConfigForm } from './PurlinRoofConfigForm'

interface ConfigFormProps {
  assembly: RoofAssemblyConfig
}

export function ConfigForm({ assembly }: ConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { formatLength } = useFormatters()
  const { updateRoofAssemblyName, updateRoofAssemblyConfig } = useConfigActions()

  const nameKey = assembly.nameKey

  const nameInput = useDebouncedInput(
    nameKey ? t(nameKey) : assembly.name,
    (name: string) => {
      updateRoofAssemblyName(assembly.id, name)
    },
    {
      debounceMs: 1000
    }
  )

  const updateConfig = useCallback(
    (updates: Partial<RoofConfig>) => {
      updateRoofAssemblyConfig(assembly.id, updates)
    },
    [assembly.id, updateRoofAssemblyConfig]
  )

  const totalThickness = useMemo(() => {
    const assemblyImpl = resolveRoofAssembly(assembly)
    return formatLength(assemblyImpl.totalThickness)
  }, [assembly, formatLength])

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
              {React.createElement(getRoofAssemblyTypeIcon(assembly.type))}
              <span className="text-base">{t($ => $.roofs.types[assembly.type])}</span>
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
          {assembly.type === 'monolithic' && <MonolithicRoofConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'purlin' && <PurlinRoofConfigForm config={assembly} onUpdate={updateConfig} />}
        </div>

        <div className="flex flex-col gap-3">
          <LayersConfigForm assemblyId={assembly.id} config={assembly} />
        </div>
      </div>
    </Card>
  )
}
