import { Button, Callout, Flex, Heading, Kbd, Text } from '@radix-ui/themes'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { SplitWallTool } from './SplitWallTool'

export function SplitWallToolInspector({ tool }: ToolInspectorProps<SplitWallTool>): React.JSX.Element {
  const { state } = useReactiveTool(tool)

  if (!state.selectedWallId) {
    return (
      <Flex direction="column" gap="3">
        <Heading size="2">Split Wall</Heading>
        <Text size="2" color="gray">
          Click on a wall to select it for splitting
        </Text>
      </Flex>
    )
  }

  return (
    <Flex direction="column" gap="4">
      <Heading size="2">Split Wall</Heading>
      {state.isValidSplit && (
        <Callout.Root color="green">
          <Callout.Text>Ready to split wall</Callout.Text>
        </Callout.Root>
      )}
      {!state.isValidSplit && state.splitError && (
        <Callout.Root color="red">
          <Callout.Text>{state.splitError}</Callout.Text>
        </Callout.Root>
      )}

      {/* Action Buttons */}
      <Flex direction="column" gap="2">
        <Button onClick={() => tool.commitSplit()} disabled={!state.isValidSplit} size="2">
          Split Wall <Kbd>Enter</Kbd>
        </Button>
        <Button variant="soft" onClick={() => tool.cancel()} size="2">
          Cancel <Kbd>Esc</Kbd>
        </Button>
      </Flex>

      {/* Instructions */}
      <Flex direction="column" gap="1">
        <Text size="1" color="gray">
          • Hover over wall to preview split position
        </Text>
        <Text size="1" color="gray">
          • Click to set split position
        </Text>
        <Text size="1" color="gray">
          • Click measurements to enter precise values
        </Text>
        <Text size="1" color="gray">
          • Press Enter to confirm split
        </Text>
      </Flex>
    </Flex>
  )
}
