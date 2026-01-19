import { Pencil1Icon } from '@radix-ui/react-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'

import { FloorAssemblySelect, type FloorAssemblySelectProps } from './FloorAssemblySelect'

export function FloorAssemblySelectWithEdit(props: FloorAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { openConfiguration } = useConfigurationModal()

  return (
    <div className="flex gap-1 items-center">
      <div className="flex flex-col gap-1 grow-1 mr-1">
        <FloorAssemblySelect {...props} />
      </div>
      <Button
        size="icon"
        title={t($ => $.floors.configure)}
        variant="ghost"
        size={props.size}
        onClick={() => {
          openConfiguration('floors', props.value ?? undefined)
        }}
      >
        <Pencil1Icon />
      </Button>
    </div>
  )
}
