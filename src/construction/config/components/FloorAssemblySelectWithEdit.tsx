import { Pencil1Icon } from '@radix-ui/react-icons'
import { Flex, IconButton } from '@radix-ui/themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'

import { FloorAssemblySelect, type FloorAssemblySelectProps } from './FloorAssemblySelect'

export function FloorAssemblySelectWithEdit(props: FloorAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { openConfiguration } = useConfigurationModal()

  return (
    <Flex gap="1" align="center">
      <Flex direction="column" gap="1" flexGrow="1" mr="1">
        <FloorAssemblySelect {...props} />
      </Flex>
      <IconButton
        title={t($ => $.floors.configure)}
        variant="ghost"
        size={props.size}
        onClick={() => {
          openConfiguration('floors', props.value ?? undefined)
        }}
      >
        <Pencil1Icon />
      </IconButton>
    </Flex>
  )
}
