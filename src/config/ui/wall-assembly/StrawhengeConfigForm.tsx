import React from 'react'

import type { StrawhengeWallConfig } from '@/construction/assemblies/perimeterWalls/types'
import { Separator } from '@/shared/ui/components/separator'

import { InfillConfigForm } from './InfillConfigForm'
import { ModuleConfigForm } from './ModuleConfigForm'

interface StrawhengeConfigFormProps {
  config: StrawhengeWallConfig
  onUpdate: (updates: Partial<StrawhengeWallConfig>) => void
}

export function StrawhengeConfigForm({ config, onUpdate }: StrawhengeConfigFormProps): React.JSX.Element {
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
        onUpdate={updates => {
          onUpdate({ ...config, infill: { ...config.infill, ...updates } })
        }}
      />
    </div>
  )
}
