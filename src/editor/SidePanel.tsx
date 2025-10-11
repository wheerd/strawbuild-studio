import { Box, Flex } from '@radix-ui/themes'

import { useActiveTool } from '@/editor/tools/system/store'

export function SidePanel(): React.JSX.Element {
  const activeTool = useActiveTool()

  return (
    <Box
      p="0"
      style={{
        backgroundColor: 'var(--gray-2)',
        borderLeft: '1px solid var(--gray-6)',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
      className="side-panel"
    >
      <Flex direction="column" p="2" gap="2">
        <activeTool.inspectorComponent tool={activeTool} />
      </Flex>
    </Box>
  )
}
