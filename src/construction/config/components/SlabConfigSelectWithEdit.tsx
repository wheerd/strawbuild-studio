import { Pencil1Icon } from '@radix-ui/react-icons'
import { Flex, IconButton } from '@radix-ui/themes'
import React from 'react'

import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'

import { SlabConfigSelect, type SlabConfigSelectProps } from './SlabConfigSelect'

export function SlabConfigSelectWithEdit(props: SlabConfigSelectProps): React.JSX.Element {
  const { openConfiguration } = useConfigurationModal()

  return (
    <Flex gap="1" align="center">
      <Flex direction="column" gap="1" flexGrow="1" mr="1">
        <SlabConfigSelect {...props} />
      </Flex>
      <IconButton
        title="Configure Slab Construction"
        variant="ghost"
        size={props.size}
        onClick={() => openConfiguration('slabs', props.value ?? undefined)}
      >
        <Pencil1Icon />
      </IconButton>
    </Flex>
  )
}
