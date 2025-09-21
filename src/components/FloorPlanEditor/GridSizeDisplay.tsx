import React from 'react'
import { useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { formatLength } from '@/utils/formatLength'
import type { Length } from '@/types/geometry'
import { Box, Button, Card, Flex, Inset, Text } from '@radix-ui/themes'
import { FrameIcon } from '@radix-ui/react-icons'

export function GridSizeDisplay(): React.JSX.Element {
  const showGrid = useEditorStore(state => state.showGrid)
  const gridSize = useEditorStore(state => state.gridSize)
  const setShowGrid = useEditorStore(state => state.setShowGrid)

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
