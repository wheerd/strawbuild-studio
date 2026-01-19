import React from 'react'

import { Skeleton } from '@/components/ui/skeleton'

export function EditorSkeleton(): React.JSX.Element {
  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'white',
        borderRight: '1px solid var(--gray-6)'
      }}
      data-testid="editor-skeleton"
    >
      <div
        className="flex items-center justify-center"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--gray-1)'
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-[200px] h-[200px] rounded-lg" />

          <span className="text-base text-muted-foreground">Loading editor...</span>
        </div>
      </div>
    </div>
  )
}
