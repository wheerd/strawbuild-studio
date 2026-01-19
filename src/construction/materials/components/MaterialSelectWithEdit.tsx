import { Pencil1Icon } from '@radix-ui/react-icons'
import { IconButton } from '@radix-ui/themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'

import { MaterialSelect, type MaterialSelectProps } from './MaterialSelect'

export function MaterialSelectWithEdit(props: MaterialSelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { openConfiguration } = useConfigurationModal()

  return (
    <div className="flex gap-1 items-center">
      <div className="flex flex-col gap-1 grow-1 mr-1">
        <MaterialSelect {...props} />
      </div>
      <IconButton
        title={t($ => $.materials.configure)}
        variant="ghost"
        size={props.size}
        onClick={() => {
          openConfiguration('materials', props.value ?? undefined)
        }}
      >
        <Pencil1Icon />
      </IconButton>
    </div>
  )
}
