import { Pencil1Icon } from '@radix-ui/react-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'

import { MaterialSelect, type MaterialSelectProps } from './MaterialSelect'

export type MaterialSelectWithEditProps = MaterialSelectProps

export function MaterialSelectWithEdit(props: MaterialSelectWithEditProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { openConfiguration } = useConfigurationModal()

  return (
    <div className="flex items-center gap-0.5">
      <div className="mr-1 flex grow flex-col gap-1">
        <MaterialSelect {...props} />
      </div>
      <Button
        size="icon-xs"
        title={t($ => $.materials.configure)}
        variant="ghost"
        onClick={() => {
          openConfiguration('materials', props.value ?? undefined)
        }}
      >
        <Pencil1Icon />
      </Button>
    </div>
  )
}
