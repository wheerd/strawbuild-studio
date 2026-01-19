import { Cross2Icon } from '@radix-ui/react-icons'
import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { Button } from '@/components/ui/button'
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
  size?: '1' | '2' | '3' | '4'
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
  '1': 'max-w-sm',
  '2': 'max-w-lg',
  '3': 'max-w-2xl',
  '4': 'max-w-4xl'
}

export function BaseModal({
  open,
  onOpenChange,
  title,
  titleIcon,
  children,
  trigger,
  size = '2',
  width,
  maxWidth,
  height,
  maxHeight,
  showCloseButton = true,
  onEscapeKeyDown,
  'aria-describedby': ariaDescribedBy,
  resetKeys = [],
  className,
  style
}: BaseModalProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
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
        <DialogTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {titleIcon}
            {title}
          </div>
          {showCloseButton && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onOpenChange?.(false)}>
              <Cross2Icon className="h-4 w-4" />
            </Button>
          )}
        </DialogTitle>

        <ErrorBoundary FallbackComponent={FeatureErrorFallback} resetKeys={[open, ...resetKeys]}>
          {children}
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}
