import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const segmentedControlVariants = cva(
  'inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
  {
    variants: {
      size: {
        '1': 'h-8 text-xs',
        '2': 'h-9 text-sm',
        '3': 'h-10 text-sm'
      }
    },
    defaultVariants: {
      size: '2'
    }
  }
)

const segmentedControlItemVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm',
  {
    variants: {
      size: {
        '1': 'text-xs px-2 py-1',
        '2': 'text-sm px-3 py-1.5',
        '3': 'text-sm px-4 py-2'
      }
    },
    defaultVariants: {
      size: '2'
    }
  }
)

type SegmentedControlSizeVariant = '1' | '2' | '3'

interface SegmentedControlRootProps
  extends
    Omit<React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>, 'type' | 'value' | 'defaultValue'>,
    VariantProps<typeof segmentedControlVariants> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

const SegmentedControlContext = React.createContext<{ size?: SegmentedControlSizeVariant }>({})

const SegmentedControlRoot = React.forwardRef<
  React.ComponentRef<typeof ToggleGroupPrimitive.Root>,
  SegmentedControlRootProps
>(({ className, size, children, value, defaultValue, onValueChange, ...props }, ref) => (
  <SegmentedControlContext.Provider value={{ size: size ?? undefined }}>
    <ToggleGroupPrimitive.Root
      ref={ref}
      type="single"
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      className={cn(segmentedControlVariants({ size }), className)}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Root>
  </SegmentedControlContext.Provider>
))
SegmentedControlRoot.displayName = 'SegmentedControl.Root'

interface SegmentedControlItemProps
  extends
    React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>,
    VariantProps<typeof segmentedControlItemVariants> {}

const SegmentedControlItem = React.forwardRef<
  React.ComponentRef<typeof ToggleGroupPrimitive.Item>,
  SegmentedControlItemProps
>(({ className, size: sizeProp, ...props }, ref) => {
  const { size: contextSize } = React.useContext(SegmentedControlContext)
  const size = sizeProp ?? contextSize
  return (
    <ToggleGroupPrimitive.Item ref={ref} className={cn(segmentedControlItemVariants({ size }), className)} {...props} />
  )
})
SegmentedControlItem.displayName = 'SegmentedControl.Item'

export const SegmentedControl = {
  Root: SegmentedControlRoot,
  Item: SegmentedControlItem
}
