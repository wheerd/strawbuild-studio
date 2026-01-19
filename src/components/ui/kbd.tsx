import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const kbdVariants = cva(
  'inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 font-mono font-medium text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'text-xs h-5 min-w-5',
        base: 'text-xs h-6 min-w-6',
        lg: 'text-sm h-7 min-w-7'
      }
    },
    defaultVariants: {
      size: 'base'
    }
  }
)

export interface KbdProps extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof kbdVariants> {}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(({ className, size, ...props }, ref) => (
  <kbd ref={ref} className={cn(kbdVariants({ size }), className)} {...props} />
))
Kbd.displayName = 'Kbd'

export { Kbd }
