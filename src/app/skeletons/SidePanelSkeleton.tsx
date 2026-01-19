import React from 'react'

import { Skeleton } from '@/components/ui/skeleton'

export function SidePanelSkeleton(): React.JSX.Element {
  return (
    <div className="h-full" style={{ borderLeft: '1px solid var(--color-gray-600)' }} data-testid="side-panel-skeleton">
      <div className="flex flex-col gap-2 p-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-6 w-3/5" />
        <Skeleton className="h-20" />
        <Skeleton className="h-6 w-2/5" />
        <Skeleton className="h-[60px]" />
      </div>
    </div>
  )
}
