import { Pencil } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigNavigation } from '@/config/ui/useConfigNavigation'
import { Button } from '@/shared/ui/components/button'

import { InteriorWallAssemblySelect, type InteriorWallAssemblySelectProps } from './InteriorWallAssemblySelect'

export function InteriorWallAssemblySelectWithEdit(props: InteriorWallAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { navigateToConfig } = useConfigNavigation()

  return (
    <div className="flex items-center gap-1">
      <div className="grow">
        <InteriorWallAssemblySelect {...props} />
      </div>
      <Button
        size="icon-xs"
        title={t($ => $.walls.configureInterior)}
        variant="ghost"
        onClick={() => {
          void navigateToConfig('interior-walls', props.value ?? undefined)
        }}
      >
        <Pencil />
      </Button>
    </div>
  )
}
