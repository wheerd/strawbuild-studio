import * as Label from '@radix-ui/react-label'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TextField } from '@/components/ui/text-field'
import type { OpeningAssemblyConfig } from '@/construction/config'
import { useConfigActions } from '@/construction/config/store'
import type { OpeningConfig } from '@/construction/openings/types'
import { useDebouncedInput } from '@/shared/hooks/useDebouncedInput'

import { PlankedOpeningConfigForm } from './PlankedOpeningConfigForm'
import { PostOpeningConfigForm } from './PostOpeningConfigForm'
import { SimpleOpeningConfigForm } from './SimpleOpeningConfigForm'
import { ThresholdOpeningConfigForm } from './ThresholdOpeningConfigForm'

interface ConfigFormProps {
  assembly: OpeningAssemblyConfig
}

export function ConfigForm({ assembly }: ConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { updateOpeningAssemblyName, updateOpeningAssemblyConfig } = useConfigActions()

  const nameKey = assembly.nameKey

  const nameInput = useDebouncedInput(
    nameKey ? t(nameKey) : assembly.name,
    (name: string) => {
      updateOpeningAssemblyName(assembly.id, name)
    },
    {
      debounceMs: 1000
    }
  )

  const handleUpdateConfig = useCallback(
    (updates: Partial<OpeningConfig>) => {
      updateOpeningAssemblyConfig(assembly.id, updates)
    },
    [assembly.id, updateOpeningAssemblyConfig]
  )

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
            placeholder={t($ => $.openings.placeholders.name)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Label.Root>
            <span className="text-base font-medium">{t($ => $.common.type)}</span>
          </Label.Root>
          <span className="text-base">{t($ => $.openings.types[assembly.type])}</span>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        {assembly.type === 'simple' && <SimpleOpeningConfigForm config={assembly} update={handleUpdateConfig} />}
        {assembly.type === 'post' && <PostOpeningConfigForm config={assembly} update={handleUpdateConfig} />}
        {assembly.type === 'planked' && <PlankedOpeningConfigForm config={assembly} update={handleUpdateConfig} />}
        {assembly.type === 'threshold' && <ThresholdOpeningConfigForm config={assembly} update={handleUpdateConfig} />}
        {assembly.type === 'empty' && (
          <>
            <h2 className="text-lg font-semibold">{t($ => $.openings.types.empty)}</h2>
            <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
              <Label.Root>
                <span className="text-base font-medium">{t($ => $.openings.labels.padding)}</span>
              </Label.Root>
              <div className="col-span-3">
                <TextField.Root
                  value={String(assembly.padding)}
                  onChange={e => {
                    handleUpdateConfig({ padding: Number(e.target.value) })
                  }}
                  placeholder="15"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
