import { Pencil1Icon } from '@radix-ui/react-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'

import { RoofAssemblySelect, type RoofAssemblySelectProps } from './RoofAssemblySelect'

export function RoofAssemblySelectWithEdit(props: RoofAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { openConfiguration } = useConfigurationModal()

  return (
    <div className="flex items-center gap-1">
      <div className="grow">
        <RoofAssemblySelect {...props} />
      </div>
      <Button
        size="icon-xs"
        title={t($ => $.roofs.configure)}
        variant="ghost"
        onClick={() => {
          openConfiguration('roofs', props.value ?? undefined)
        }}
      >
        <Pencil1Icon />
      </Button>
    </div>
  )
}
