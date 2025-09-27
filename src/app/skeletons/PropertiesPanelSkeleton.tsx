import { Box, Flex, Skeleton, Tabs, Text } from '@radix-ui/themes'
import React from 'react'

export function PropertiesPanelSkeleton(): React.JSX.Element {
  return (
    <Box height="100%" style={{ borderLeft: '1px solid var(--gray-6)' }} data-testid="properties-skeleton">
      <Tabs.Root value="selection">
        <Tabs.List>
          <Tabs.Trigger value="selection" disabled>
            <Flex align="center" gap="2">
              <Text color="gray">↖</Text>
              <Text color="gray">Selection</Text>
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="tool" disabled>
            <Flex align="center" gap="2">
              <Text color="gray">🔧</Text>
              <Text color="gray">Tool</Text>
            </Flex>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="selection">
          <Flex direction="column" p="2" gap="2">
            <Skeleton height="40px" />
            <Skeleton height="24px" width="60%" />
            <Skeleton height="80px" />
            <Skeleton height="24px" width="40%" />
            <Skeleton height="60px" />
          </Flex>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}
