import * as Label from '@radix-ui/react-label'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { NonStrawbaleWallConfig } from '@/construction/walls'

interface NonStrawbaleConfigFormProps {
  config: NonStrawbaleWallConfig
  onUpdate: (updates: Partial<NonStrawbaleWallConfig>) => void
}

export function NonStrawbaleConfigForm({ config, onUpdate }: NonStrawbaleConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.walls.nonStrawbaleConfiguration)}</h2>
      <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-3">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.material}
          onValueChange={material => {
            if (!material) return
            onUpdate({ ...config, material })
          }}
          size="sm"
          preferredTypes={['volume']}
        />
      </div>
    </div>
  )
}
