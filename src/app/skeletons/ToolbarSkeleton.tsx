import * as Toolbar from '@radix-ui/react-toolbar'
import { Flex, Separator, Skeleton } from '@radix-ui/themes'
import React from 'react'

import { Logo } from '@/shared/components/Logo'

export function ToolbarSkeleton(): React.JSX.Element {
  return (
    <Flex
      align="center"
      gap="4"
      style={{ borderBottom: '1px solid var(--gray-6)' }}
      data-testid="toolbar-skeleton"
      p="3"
    >
      {/* Logo - Real logo loads immediately */}
      <Logo />

      {/* Tools skeleton */}
      <Toolbar.Root>
        <Flex align="center" gap="2">
          {/* Basic tools group */}
          <Flex align="center" gap="1">
            <Skeleton width="32px" height="32px" />
            <Skeleton width="32px" height="32px" />
            <Skeleton width="32px" height="32px" />
          </Flex>
          <Separator orientation="vertical" size="2" />
          {/* Perimeter tools group */}
          <Flex align="center" gap="1">
            <Skeleton width="32px" height="32px" />
            <Skeleton width="32px" height="32px" />
            <Skeleton width="32px" height="32px" />
          </Flex>
          <Separator orientation="vertical" size="2" />
          {/* Test data tools group */}
          <Flex align="center" gap="1">
            <Skeleton width="32px" height="32px" />
            <Skeleton width="32px" height="32px" />
          </Flex>
        </Flex>
      </Toolbar.Root>
    </Flex>
  )
}
