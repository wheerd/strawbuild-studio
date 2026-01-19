import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as React from 'react'

import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider

const TooltipRoot = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Wrapper component that provides Radix Themes-compatible API
interface TooltipProps {
  children: React.ReactNode
  content?: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delayDuration?: number
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ children, content, side, align, delayDuration, ...props }, _ref) => {
    // If content prop is provided, use Radix Themes-compatible pattern
    if (content !== undefined) {
      return (
        <TooltipRoot delayDuration={delayDuration}>
          <TooltipTrigger asChild>{children}</TooltipTrigger>
          <TooltipContent side={side} align={align} {...props}>
            {content}
          </TooltipContent>
        </TooltipRoot>
      )
    }
    // Otherwise, pass through to Root for manual composition
    return (
      <TooltipRoot delayDuration={delayDuration} {...props}>
        {children}
      </TooltipRoot>
    )
  }
)
Tooltip.displayName = 'Tooltip'

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipRoot }
