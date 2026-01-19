import { cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const calloutVariants = cva('flex gap-3 rounded-lg border p-4', {
  variants: {
    color: {
      blue: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100',
      red: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100',
      yellow:
        'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-100',
      green: 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100',
      orange:
        'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-100',
      gray: 'border-border bg-muted text-foreground'
    },
    size: {
      '1': 'text-xs p-2 gap-2',
      '2': 'text-sm p-3 gap-3',
      '3': 'text-base p-4 gap-3'
    }
  },
  defaultVariants: {
    color: 'gray',
    size: '2'
  }
})

type CalloutColor = 'blue' | 'red' | 'yellow' | 'green' | 'orange' | 'gray'
type CalloutSize = '1' | '2' | '3'

export interface CalloutProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  color?: CalloutColor | null
  size?: CalloutSize | null
  variant?: 'soft' | 'surface' | 'outline' // Ignored - for Radix Themes compatibility
}

const Callout = React.forwardRef<HTMLDivElement, CalloutProps>(
  ({ className, color, size, variant: _variant, ...props }, ref) => (
    <div ref={ref} className={cn(calloutVariants({ color, size }), className)} {...props} />
  )
)
Callout.displayName = 'Callout'

const CalloutIcon = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('shrink-0', className)} {...props} />
)
CalloutIcon.displayName = 'CalloutIcon'

const CalloutText = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('flex-1', className)} {...props} />
)
CalloutText.displayName = 'CalloutText'

export { Callout, CalloutIcon, CalloutText }
