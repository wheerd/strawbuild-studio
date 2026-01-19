import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { Theme } from '@radix-ui/themes'
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
        <Theme>
          {/* Overlay */}
          <DialogPrimitive.Overlay className="fixed inset-0" style={{ backgroundColor: 'var(--color-overlay)' }} />

          {/* Content */}
          <DialogPrimitive.Content
            aria-describedby={ariaDescribedBy}
            onEscapeKeyDown={e => {
              if (onEscapeKeyDown) {
                onEscapeKeyDown(e)
              }
              e.stopPropagation()
            }}
            className="fixed left-1/2 top-1/2 flex flex-col rounded-lg shadow-lg focus:outline-none"
            style={{
              transform: 'translate(-50%, -50%)',
              width: 'calc(100vw - 2rem)',
              height: 'calc(100vh - 2rem)',
              maxWidth: 'calc(100vw - 2rem)',
              maxHeight: 'calc(100vh - 2rem)',
              backgroundColor: 'var(--color-panel-solid)',
              borderColor: 'var(--gray-6)',
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
          >
            {/* Header - fixed at top */}
            <div
              className="flex items-center justify-between px-4 py-2 shrink-0"
              style={{
                borderBottom: '1px solid var(--gray-6)'
              }}
            >
              <div className="flex items-center gap-2">
                {titleIcon}
                <DialogPrimitive.Title className="text-lg font-semibold" style={{ color: 'var(--gray-12)' }}>
                  {title}
                </DialogPrimitive.Title>
              </div>

              <DialogPrimitive.Close
                className="rounded-sm opacity-70 hover:opacity-100 transition-opacity h-8 w-8 inline-flex items-center justify-center"
                style={{
                  color: 'var(--gray-12)'
                }}
              >
                <Cross2Icon className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            {/* Content - fills remaining space */}
            <div className="flex flex-1 min-h-0 overflow-hidden px-4 py-2">{children}</div>
          </DialogPrimitive.Content>
        </Theme>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
