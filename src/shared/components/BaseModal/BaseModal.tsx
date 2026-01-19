import { DialogTrigger } from '@radix-ui/react-dialog'
import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { FeatureErrorFallback } from '@/shared/components/ErrorBoundary'

export interface BaseModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: React.ReactNode
  titleIcon?: React.ReactNode
  children: React.ReactNode
  trigger?: React.ReactNode
  size?: 'sm' | 'base' | 'lg' | '4'
  width?: string
  maxWidth?: string
  height?: string
  maxHeight?: string
  showCloseButton?: boolean
  onEscapeKeyDown?: (e: Event) => void
  'aria-describedby'?: string
  resetKeys?: unknown[]
  className?: string
  style?: React.CSSProperties
}

const sizeClasses = {
  sm: 'max-w-sm',
  base: 'max-w-lg',
  lg: 'max-w-2xl',
  '4': 'max-w-4xl'
}

export function BaseModal({
  open,
  onOpenChange,
  title,
  titleIcon,
  children,
  trigger,
  size = 'base',
  width,
  maxWidth,
  height,
  maxHeight,
  onEscapeKeyDown,
  'aria-describedby': ariaDescribedBy,
  resetKeys = [],
  className,
  style
}: BaseModalProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        aria-describedby={ariaDescribedBy}
        className={cn(sizeClasses[size], className)}
        onEscapeKeyDown={e => {
          if (onEscapeKeyDown) {
            onEscapeKeyDown(e)
          }
          e.stopPropagation()
        }}
        style={{
          width,
          maxWidth: maxWidth ?? undefined,
          height,
          maxHeight: maxHeight ?? undefined,
          ...style
        }}
      >
        <DialogTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {titleIcon}
            {title}
          </div>
        </DialogTitle>

        <ErrorBoundary FallbackComponent={FeatureErrorFallback} resetKeys={[open, ...resetKeys]}>
          {children}
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}
