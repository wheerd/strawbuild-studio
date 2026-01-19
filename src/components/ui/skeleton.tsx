import * as React from 'react'

import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: string | number
  width?: string | number
}

function Skeleton({ className, height, width, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('bg-muted animate-pulse rounded-md', className)}
      style={{ ...style, height, width }}
      {...props}
    />
  )
}

export { Skeleton }
