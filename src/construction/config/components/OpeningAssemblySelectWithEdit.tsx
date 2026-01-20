import { Pencil1Icon } from '@radix-ui/react-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'

import { OpeningAssemblySelect, type OpeningAssemblySelectProps } from './OpeningAssemblySelect'

export function OpeningAssemblySelectWithEdit(props: OpeningAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { openConfiguration } = useConfigurationModal()

  return (
    <div className="flex items-center gap-1">
      <div className="grow">
        <OpeningAssemblySelect {...props} />
      </div>
      <Button
        size="icon-xs"
        title={t($ => $.openings.configure)}
        variant="ghost"
        onClick={() => {
          openConfiguration('openings', props.value ?? undefined)
        }}
      >
        <Pencil1Icon />
      </Button>
    </div>
  )
}
