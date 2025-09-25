import { FrameIcon } from '@radix-ui/react-icons'
import { Box, Button, Card, Flex, Inset, Text } from '@radix-ui/themes'
import React from 'react'

import { useGridActions, useGridSize, useShowGrid } from '@/editor/hooks/useGrid'
import type { Length } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

export function GridSizeDisplay(): React.JSX.Element {
  const showGrid = useShowGrid()
  const gridSize = useGridSize()
  const { setShowGrid } = useGridActions()

  return (
    <Box bottom="2" right="2" className="absolute z-10">
      <Button
        title="Toggle Grid"
        variant="surface"
        onClick={() => setShowGrid(!showGrid)}
        color={showGrid ? undefined : 'gray'}
        asChild
      >
        <Card size="1" variant="surface">
          <Inset>
            <Flex align="center" gap="1" p="1" pl="2" pr="2">
              {showGrid ? <Text>{formatLength(gridSize as Length)}</Text> : <Text>Off</Text>}
              <FrameIcon />
            </Flex>
          </Inset>
        </Card>
      </Button>
    </Box>
  )
}
