import { Pencil1Icon } from '@radix-ui/react-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'

import { WallAssemblySelect, type WallAssemblySelectProps } from './WallAssemblySelect'

export function WallAssemblySelectWithEdit(props: WallAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')

  const { openConfiguration } = useConfigurationModal()

  return (
    <div className="flex items-center gap-1">
      <div className="mr-1 flex grow flex-col gap-1">
        <WallAssemblySelect {...props} />
      </div>
      <Button
        size="icon"
        title={t($ => $.walls.configure)}
        variant="ghost"
        onClick={() => {
          openConfiguration('walls', props.value ?? undefined)
        }}
      >
        <Pencil1Icon />
      </Button>
    </div>
  )
}
