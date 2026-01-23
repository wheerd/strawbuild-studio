import React from 'react'

import { Separator } from '@/components/ui/separator'
import type { ModulesWallConfig } from '@/construction/walls'

import { InfillConfigForm } from './InfillConfigForm'
import { ModuleConfigForm } from './ModuleConfigForm'

interface ModulesConfigFormProps {
  config: ModulesWallConfig
  onUpdate: (updates: Partial<ModulesWallConfig>) => void
}

export function ModulesConfigForm({ config, onUpdate }: ModulesConfigFormProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <ModuleConfigForm
        module={config.module}
        onUpdate={module => {
          onUpdate({ ...config, module })
        }}
      />
      <Separator />
      <InfillConfigForm
        config={config.infill}
        onUpdate={infill => {
          onUpdate({ ...config, infill: infill as typeof config.infill })
        }}
      />
    </div>
  )
}
