import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        soft: 'border-transparent bg-accent text-accent-foreground hover:bg-accent/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        surface: 'border bg-card text-card-foreground'
      },
      color: {
        gray: '',
        red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800',
        orange: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-800',
        yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-800',
        green: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800',
        blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-800',
        purple: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-100 dark:border-purple-800',
        pink: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900 dark:text-pink-100 dark:border-pink-800',
        amber: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-800',
        grass: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800'
      },
      size: {
        '1': 'text-xs px-2 py-0.5',
        '2': 'text-sm px-2.5 py-0.5',
        '3': 'text-base px-3 py-1'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: '2'
    }
  }
)

type BadgeColor = 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'amber' | 'grass'

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>, VariantProps<typeof badgeVariants> {
  color?: BadgeColor | null
}

function Badge({ className, variant, color, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, color: color as BadgeColor | null | undefined, size }), className)} {...props} />
}

export { Badge, badgeVariants }
