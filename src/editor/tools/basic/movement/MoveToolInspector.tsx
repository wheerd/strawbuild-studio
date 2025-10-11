import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Box, Callout, Flex, Kbd, Text } from '@radix-ui/themes'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { MoveTool } from './MoveTool'

export function MoveToolInspector({ tool }: ToolInspectorProps<MoveTool>): React.JSX.Element {
  const toolState = useReactiveTool(tool).getToolState()

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        {/* Informational Note */}
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text size="1">
              Drag entities to move them. After releasing, you can type a number to adjust the movement distance
              precisely.
            </Text>
          </Callout.Text>
        </Callout.Root>

        {/* Help Text */}
        <Flex direction="column" gap="2">
          <Text size="1" weight="medium">
            Controls:
          </Text>
          <Text size="1" color="gray">
            • Click and drag to move entities
          </Text>
          <Text size="1" color="gray">
            • Movement snaps to grid and geometry
          </Text>
          <Text size="1" color="gray">
            • After moving, type numbers for precise distance
          </Text>
          <Text size="1" color="gray">
            • Press <Kbd>Esc</Kbd> to cancel ongoing movement
          </Text>
        </Flex>

        {/* Movement State Display */}
        {toolState.isMoving && (
          <Callout.Root color={toolState.isValid ? 'green' : 'red'}>
            <Callout.Text>
              <Text size="1" weight="medium">
                {toolState.isValid ? 'Moving...' : 'Invalid position'}
              </Text>
            </Callout.Text>
          </Callout.Root>
        )}
      </Flex>
    </Box>
  )
}
