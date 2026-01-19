import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

// Radix Themes compatible Code component

const codeVariants = cva('font-mono', {
  variants: {
    variant: {
      soft: 'bg-accent/50 px-1.5 py-0.5 rounded',
      solid: 'bg-accent text-accent-foreground px-1.5 py-0.5 rounded',
      outline: 'border border-input px-1.5 py-0.5 rounded',
      ghost: ''
    },
    size: {
      sm: 'text-xs',
      base: 'text-sm',
      lg: 'text-base'
    },
    color: {
      gray: 'text-muted-foreground',
      grass: 'text-green-600 dark:text-green-400',
      indigo: 'text-indigo-600 dark:text-indigo-400',
      brown: 'text-orange-700 dark:text-orange-400',
      blue: 'text-blue-600 dark:text-blue-400',
      red: 'text-red-600 dark:text-red-400'
    },
    weight: {
      regular: 'font-normal',
      medium: 'font-medium',
      bold: 'font-bold'
    }
  },
  defaultVariants: {
    variant: 'ghost',
    size: 'base',
    weight: 'regular'
  }
})

export interface CodeProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>, VariantProps<typeof codeVariants> {}

type CodeColor = 'gray' | 'grass' | 'indigo' | 'brown' | 'blue' | 'red'

const Code = React.forwardRef<HTMLElement, CodeProps>(({ className, variant, size, color, weight, ...props }, ref) => (
  <code
    ref={ref}
    className={cn(codeVariants({ variant, size, color: color as CodeColor | null | undefined, weight }), className)}
    {...props}
  />
))
Code.displayName = 'Code'

export { Code, codeVariants }
