import React from 'react'

import { Skeleton } from '@/components/ui/skeleton'

export function EditorSkeleton(): React.JSX.Element {
  return (
    <div className="border-border bg-background relative flex-1 overflow-hidden border-r" data-testid="editor-skeleton">
      <div className="bg-background absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-50 w-50 rounded-lg" />

          <span className="text-muted-foreground text-base">Loading editor...</span>
        </div>
      </div>
    </div>
  )
}
