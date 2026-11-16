import React from 'react'

import type { ModulesWallConfig } from '@/construction/assemblies/perimeterWalls/types'
import { Separator } from '@/shared/ui/components/separator'

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
