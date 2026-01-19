import * as Toolbar from '@radix-ui/react-toolbar'
import React from 'react'

import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Logo } from '@/shared/components/Logo'

export function ToolbarSkeleton(): React.JSX.Element {
  return (
    <div
      className="flex items-center gap-4 p-3"
      style={{ borderBottom: '1px solid var(--gray-6)' }}
      data-testid="toolbar-skeleton"
    >
      {/* Logo - Real logo loads immediately */}
      <Logo />

      {/* Tools skeleton */}
      <Toolbar.Root>
        <div className="flex items-center gap-2">
          {/* Basic tools group */}
          <div className="flex items-center gap-1">
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-8 h-8" />
          </div>
          <Separator orientation="vertical" className="h-6" />
          {/* Perimeter tools group */}
          <div className="flex items-center gap-1">
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-8 h-8" />
          </div>
          <Separator orientation="vertical" className="h-6" />
          {/* Test data tools group */}
          <div className="flex items-center gap-1">
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-8 h-8" />
          </div>
        </div>
      </Toolbar.Root>
    </div>
  )
}
