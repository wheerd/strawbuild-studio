import { FrameIcon } from '@radix-ui/react-icons'
import { Button, Flex, Text } from '@radix-ui/themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useGridActions, useGridSize, useShowGrid } from '@/editor/hooks/useGrid'
import { useFormatters } from '@/shared/i18n/useFormatters'

export function GridSizeDisplay(): React.JSX.Element {
  const { t } = useTranslation('toolbar')
  const { formatLength } = useFormatters()
  const showGrid = useShowGrid()
  const gridSize = useGridSize()
  const { setShowGrid } = useGridActions()

  return (
    <Button
      title={showGrid ? t($ => $.gridSizeDisplay.hideGrid) : t($ => $.gridSizeDisplay.showGrid)}
      variant={showGrid ? 'soft' : 'outline'}
      size="1"
      onClick={() => {
        setShowGrid(!showGrid)
      }}
      style={{ minWidth: '6em' }}
    >
      <Flex align="center" justify="end" gap="2">
        <Text>{showGrid ? formatLength(gridSize) : t($ => $.gridSizeDisplay.off)}</Text>
        <FrameIcon />
      </Flex>
    </Button>
  )
}
