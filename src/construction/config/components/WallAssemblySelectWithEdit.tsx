import { Pencil1Icon } from '@radix-ui/react-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'

import { WallAssemblySelect, type WallAssemblySelectProps } from './WallAssemblySelect'

export function WallAssemblySelectWithEdit(props: WallAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')

  const { openConfiguration } = useConfigurationModal()

  return (
    <div className="flex gap-1 items-center">
      <div className="flex flex-col gap-1 grow-1 mr-1">
        <WallAssemblySelect {...props} />
      </div>
      <Button
        size="icon"
        title={t($ => $.walls.configure)}
        variant="ghost"
        size={props.size}
        onClick={() => {
          openConfiguration('walls', props.value ?? undefined)
        }}
      >
        <Pencil1Icon />
      </Button>
    </div>
  )
}
