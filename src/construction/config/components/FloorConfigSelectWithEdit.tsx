import { Pencil1Icon } from '@radix-ui/react-icons'
import { Flex, IconButton } from '@radix-ui/themes'
import React from 'react'

import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'

import { FloorConfigSelect, type FloorConfigSelectProps } from './FloorConfigSelect'

export function FloorConfigSelectWithEdit(props: FloorConfigSelectProps): React.JSX.Element {
  const { openConfiguration } = useConfigurationModal()

  return (
    <Flex gap="1" align="center">
      <Flex direction="column" gap="1" flexGrow="1" mr="1">
        <FloorConfigSelect {...props} />
      </Flex>
      <IconButton
        title="Configure Floor"
        variant="ghost"
        size={props.size}
        onClick={() => openConfiguration('floors', props.value ?? undefined)}
      >
        <Pencil1Icon />
      </IconButton>
    </Flex>
  )
}
