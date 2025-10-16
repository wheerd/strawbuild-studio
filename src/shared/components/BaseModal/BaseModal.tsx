import { Cross2Icon } from '@radix-ui/react-icons'
import { Dialog, Flex, IconButton } from '@radix-ui/themes'
import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { ModalErrorFallback } from '@/shared/components/ErrorBoundary'

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
}

export function BaseModal({
  open,
  onOpenChange,
  title,
  titleIcon,
  children,
  trigger,
  size,
  width,
  maxWidth,
  height,
  maxHeight,
  showCloseButton = true,
  onEscapeKeyDown,
  'aria-describedby': ariaDescribedBy,
  resetKeys = [],
  className
}: BaseModalProps): React.JSX.Element {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger>{trigger}</Dialog.Trigger>}
      <Dialog.Content
        aria-describedby={ariaDescribedBy}
        size={size}
        width={width}
        maxWidth={maxWidth}
        height={height}
        maxHeight={maxHeight}
        className={className}
        onEscapeKeyDown={e => {
          if (onEscapeKeyDown) {
            onEscapeKeyDown(e)
          }
          e.stopPropagation()
        }}
      >
        <Dialog.Title>
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              {titleIcon}
              {title}
            </Flex>
            {showCloseButton && (
              <Dialog.Close>
                <IconButton variant="ghost" highContrast>
                  <Cross2Icon />
                </IconButton>
              </Dialog.Close>
            )}
          </Flex>
        </Dialog.Title>

        <ErrorBoundary FallbackComponent={ModalErrorFallback} resetKeys={[open, ...resetKeys]}>
          {children}
        </ErrorBoundary>
      </Dialog.Content>
    </Dialog.Root>
  )
}
