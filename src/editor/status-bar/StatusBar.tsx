import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Box, Flex, Grid, IconButton } from '@radix-ui/themes'
import React from 'react'

import { MeasurementHover } from '@/editor/components/MeasurementModal'

import { AutoSaveIndicator } from './AutoSaveIndicator'
import { GridSizeDisplay } from './GridSizeDisplay'
import { OfflineStatusIndicator } from './OfflineStatusIndicator'
import { PointerPositionDisplay } from './PointerPositionDisplay'
import { StoreySelector } from './StoreySelector'
import { ThemeToggle } from './ThemeToggle'

export function StatusBar(): React.JSX.Element {
  return (
    <Box
      className="absolute z-[10] pointer-events-none"
      left="0"
      right="0"
      bottom="0"
      height="32px"
      p="0"
      m="0"
      style={{
        backgroundColor: 'var(--color-panel-solid)',
        borderTop: '1px solid var(--gray-6)'
      }}
    >
      <Grid columns="1fr 1fr 1fr" align="center" gap="4" p="1" className="pointer-events-auto">
        <Flex align="center" gap="3" p="0">
          <OfflineStatusIndicator />
          <AutoSaveIndicator />
          <ThemeToggle />
        </Flex>

        <Flex align="center" justify="center" gap="3">
          <StoreySelector />

          <MeasurementHover
            trigger={
              <IconButton title="Measurements" variant="ghost" size="2">
                <InfoCircledIcon />
              </IconButton>
            }
          />
        </Flex>

        <Flex align="center" justify="end" gap="3">
          <PointerPositionDisplay />
          <GridSizeDisplay />
        </Flex>
      </Grid>
    </Box>
  )
}
