import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import * as React from 'react'

interface FullScreenModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: React.ReactNode
  titleIcon?: React.ReactNode
  children: React.ReactNode
  trigger?: React.ReactNode
  onEscapeKeyDown?: (e: Event) => void
  'aria-describedby'?: string
}

export function FullScreenModal({
  open,
  onOpenChange,
  title,
  titleIcon,
  children,
  trigger,
  onEscapeKeyDown,
  'aria-describedby': ariaDescribedBy
}: FullScreenModalProps): React.JSX.Element {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}

      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />

        {/* Content */}
        <DialogPrimitive.Content
          aria-describedby={ariaDescribedBy}
          onEscapeKeyDown={e => {
            if (onEscapeKeyDown) {
              onEscapeKeyDown(e)
            }
            e.stopPropagation()
          }}
          className="bg-background fixed top-1/2 left-1/2 z-50 flex flex-col rounded-lg border p-6 shadow-lg focus:outline-none"
          style={{
            transform: 'translate(-50%, -50%)',
            width: 'calc(100vw - 2rem)',
            height: 'calc(100vh - 2rem)',
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: 'calc(100vh - 2rem)'
          }}
        >
          {/* Header - fixed at top */}
          <div
            className="flex shrink-0 items-center justify-between px-4 py-2"
            style={{
              borderBottom: '1px solid var(--color-gray-600)'
            }}
          >
            <div className="flex items-center gap-2">
              {titleIcon}
              <DialogPrimitive.Title className="text-lg font-semibold" style={{ color: 'var(--color-gray-900)' }}>
                {title}
              </DialogPrimitive.Title>
            </div>

            <DialogPrimitive.Close
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm opacity-70 transition-opacity hover:opacity-100"
              style={{
                color: 'var(--color-gray-900)'
              }}
            >
              <Cross2Icon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Content - fills remaining space */}
          <div className="flex min-h-0 flex-1 overflow-hidden px-4 py-2">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
