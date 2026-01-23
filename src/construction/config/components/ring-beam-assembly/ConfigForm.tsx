import * as Label from '@radix-ui/react-label'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TextField } from '@/components/ui/text-field'
import type { RingBeamAssemblyConfig } from '@/construction/config'
import { getRingBeamTypeIcon } from '@/construction/config/components/Icons'
import { useConfigActions } from '@/construction/config/store'
import { resolveRingBeamAssembly } from '@/construction/ringBeams'
import type { RingBeamConfig } from '@/construction/ringBeams'
import { useDebouncedInput } from '@/shared/hooks/useDebouncedInput'
import { useFormatters } from '@/shared/i18n/useFormatters'

import { BrickRingBeamConfigForm } from './BrickRingBeamConfigForm'
import { DoubleRingBeamConfigForm } from './DoubleRingBeamConfigForm'
import { FullRingBeamConfigForm } from './FullRingBeamConfigForm'

interface ConfigFormProps {
  assembly: RingBeamAssemblyConfig
}

export function ConfigForm({ assembly }: ConfigFormProps): React.ReactNode {
  const { t } = useTranslation('config')
  const { formatLength } = useFormatters()
  const { updateRingBeamAssemblyName, updateRingBeamAssemblyConfig } = useConfigActions()

  const nameKey = assembly.nameKey

  const nameInput = useDebouncedInput(
    nameKey ? t(nameKey) : assembly.name,
    (name: string) => {
      updateRingBeamAssemblyName(assembly.id, name)
    },
    {
      debounceMs: 1000
    }
  )

  const handleUpdateConfig = useCallback(
    (updates: Partial<RingBeamConfig>) => {
      updateRingBeamAssemblyConfig(assembly.id, updates)
    },
    [assembly, updateRingBeamAssemblyConfig]
  )

  const totalHeight = useMemo(() => formatLength(resolveRingBeamAssembly(assembly).height), [assembly, formatLength])

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
            placeholder={t($ => $.ringBeams.placeholders.name)}
          />
        </div>

        <div className="grid grid-cols-2 items-center gap-2 gap-x-3">
          <div className="flex items-center gap-2">
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.common.type)}</span>
            </Label.Root>
            <div className="flex items-center gap-2">
              {React.createElement(getRingBeamTypeIcon(assembly.type))}
              <span className="text-base">{t($ => $.ringBeams.types[assembly.type])}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.common.totalHeight)}</span>
            </Label.Root>
            <span className="text-base">{totalHeight}</span>
          </div>
        </div>
      </div>

      <Separator />

      {assembly.type === 'full' && <FullRingBeamConfigForm config={assembly} onUpdate={handleUpdateConfig} />}
      {assembly.type === 'double' && <DoubleRingBeamConfigForm config={assembly} onUpdate={handleUpdateConfig} />}
      {assembly.type === 'brick' && <BrickRingBeamConfigForm config={assembly} onUpdate={handleUpdateConfig} />}
    </Card>
  )
}
