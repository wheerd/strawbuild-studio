import { FrameIcon } from '@radix-ui/react-icons'
import { Button, Flex, Text } from '@radix-ui/themes'
import React from 'react'

import { useGridActions, useGridSize, useShowGrid } from '@/editor/hooks/useGrid'
import type { Length } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

export function GridSizeDisplay(): React.JSX.Element {
  const showGrid = useShowGrid()
  const gridSize = useGridSize()
  const { setShowGrid } = useGridActions()

  return (
    <Button
      title={showGrid ? 'Hide Grid' : 'Show Grid'}
      variant={showGrid ? 'soft' : 'outline'}
      size="1"
      onClick={() => setShowGrid(!showGrid)}
      style={{ minWidth: '6em' }}
    >
      <Flex align="center" justify="end" gap="2">
        <Text>{showGrid ? formatLength(gridSize as Length) : 'Off'}</Text>
        <FrameIcon />
      </Flex>
    </Button>
  )
}
