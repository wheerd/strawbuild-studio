import { Pencil } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigNavigation } from '@/config/ui/useConfigNavigation'
import { Button } from '@/shared/ui/components/button'

import { WallAssemblySelect, type WallAssemblySelectProps } from './WallAssemblySelect'

export function WallAssemblySelectWithEdit(props: WallAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')

  const { navigateToConfig } = useConfigNavigation()

  return (
    <div className="flex items-center gap-1">
      <div className="grow">
        <WallAssemblySelect {...props} />
      </div>
      <Button
        size="icon-xs"
        title={t($ => $.walls.configure)}
        variant="ghost"
        onClick={() => {
          void navigateToConfig('perimeter-walls', props.value ?? undefined)
        }}
      >
        <Pencil />
      </Button>
    </div>
  )
}
