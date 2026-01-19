import * as React from 'react'

import { cn } from '@/lib/utils'

const DataList = React.forwardRef<HTMLDListElement, React.HTMLAttributes<HTMLDListElement>>(
  ({ className, ...props }, ref) => <dl ref={ref} className={cn('grid gap-2', className)} {...props} />
)
DataList.displayName = 'DataList'

const DataListItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-baseline justify-between gap-4', className)} {...props} />
  )
)
DataListItem.displayName = 'DataListItem'

const DataListLabel = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <dt ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
)
DataListLabel.displayName = 'DataListLabel'

const DataListValue = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => <dd ref={ref} className={cn('text-sm font-medium', className)} {...props} />
)
DataListValue.displayName = 'DataListValue'

// Compound component for Radix Themes compatibility
const DataListCompound = Object.assign(DataList, {
  Root: DataList,
  Item: DataListItem,
  Label: DataListLabel,
  Value: DataListValue
})

export { DataListCompound as DataList, DataListItem, DataListLabel, DataListValue }
