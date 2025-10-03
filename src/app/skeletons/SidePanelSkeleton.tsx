import { Box, Flex, Skeleton } from '@radix-ui/themes'
import React from 'react'

export function SidePanelSkeleton(): React.JSX.Element {
  return (
    <Box height="100%" style={{ borderLeft: '1px solid var(--gray-6)' }} data-testid="side-panel-skeleton">
      <Flex direction="column" p="2" gap="2">
        <Skeleton height="40px" />
        <Skeleton height="24px" width="60%" />
        <Skeleton height="80px" />
        <Skeleton height="24px" width="40%" />
        <Skeleton height="60px" />
      </Flex>
    </Box>
  )
}
