import { Pencil1Icon } from '@radix-ui/react-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'

import { FloorAssemblySelect, type FloorAssemblySelectProps } from './FloorAssemblySelect'

export function FloorAssemblySelectWithEdit(props: FloorAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { openConfiguration } = useConfigurationModal()

  return (
    <div className="flex items-center gap-1">
      <div className="grow">
        <FloorAssemblySelect {...props} />
      </div>
      <Button
        size="icon-xs"
        title={t($ => $.floors.configure)}
        variant="ghost"
        onClick={() => {
          openConfiguration('floors', props.value ?? undefined)
        }}
      >
        <Pencil1Icon />
      </Button>
    </div>
  )
}
