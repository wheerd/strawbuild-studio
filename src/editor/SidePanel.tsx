import { Box, Flex, Text } from '@radix-ui/themes'

import { useActiveTool } from '@/editor/tools/system/store'

export function SidePanel(): React.JSX.Element {
  const activeTool = useActiveTool()

  return (
    <Box height="100%" style={{ borderLeft: '1px solid var(--gray-6)' }} className="side-panel">
      <Flex direction="column" p="2" gap="2">
        {activeTool?.inspectorComponent && <activeTool.inspectorComponent tool={activeTool} />}
        {!activeTool?.inspectorComponent && (
          <>
            <Text align="center" color="gray" mb="2">
              No tool inspector
            </Text>
            <Text align="center" size="2" color="gray">
              Select a tool with configuration options
            </Text>
          </>
        )}
      </Flex>
    </Box>
  )
}
