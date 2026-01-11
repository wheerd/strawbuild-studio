import { Pencil1Icon } from '@radix-ui/react-icons'
import { Flex, IconButton } from '@radix-ui/themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'

import { RoofAssemblySelect, type RoofAssemblySelectProps } from './RoofAssemblySelect'

export function RoofAssemblySelectWithEdit(props: RoofAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { openConfiguration } = useConfigurationModal()

  return (
    <Flex gap="1" align="center">
      <Flex direction="column" gap="1" flexGrow="1" mr="1">
        <RoofAssemblySelect {...props} />
      </Flex>
      <IconButton
        title={t($ => $.roofs.configure)}
        variant="ghost"
        size={props.size}
        onClick={() => {
          openConfiguration('roofs', props.value ?? undefined)
        }}
      >
        <Pencil1Icon />
      </IconButton>
    </Flex>
  )
}
