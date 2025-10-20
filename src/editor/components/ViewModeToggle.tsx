import { Box, Card, Flex, SegmentedControl } from '@radix-ui/themes'

import { useViewMode, useViewModeActions } from '@/editor/hooks/useViewMode'

export function ViewModeToggle(): React.JSX.Element {
  const mode = useViewMode()
  const { setMode } = useViewModeActions()

  return (
    <Box position="absolute" top="2" left="2" className="z-10">
      <Card size="1" variant="surface" className="shadow-md">
        <Flex m="-2">
          <SegmentedControl.Root
            size="1"
            value={mode}
            onValueChange={value => {
              setMode(value as 'walls' | 'floors')
            }}
          >
            <SegmentedControl.Item value="walls">Walls</SegmentedControl.Item>
            <SegmentedControl.Item value="floors">Floors</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>
      </Card>
    </Box>
  )
}
