import * as React from 'react'

import { cn } from '@/lib/utils'

// Radix Themes compatible TextField wrapper

interface TextFieldRootProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'base' | 'lg'
  disabled?: boolean
  value?: string
  defaultValue?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  // Additional HTML input props
  min?: number | string
  max?: number | string
  step?: number | string
  required?: boolean
  // Radix Themes compatibility props (style-only)
  variant?: 'classic' | 'surface' | 'soft'
  color?: string
}

const TextFieldContext = React.createContext<{
  size?: 'sm' | 'base' | 'lg'
  disabled?: boolean
  inputProps: Omit<TextFieldRootProps, 'className' | 'style' | 'children' | 'size'>
}>({
  inputProps: {}
})

const sizeClasses = {
  sm: 'h-7 text-xs',
  base: 'h-9 text-sm',
  lg: 'h-10 text-base'
}

const TextFieldRoot = React.forwardRef<HTMLDivElement, TextFieldRootProps>(
  (
    {
      className,
      children,
      size = 'base',
      disabled,
      value,
      defaultValue,
      onChange,
      onBlur,
      onKeyDown,
      placeholder,
      type,
      min,
      max,
      step,
      required,
      variant: _variant,
      color: _color,
      ...props
    },
    ref
  ) => {
    const inputProps = {
      value,
      defaultValue,
      onChange,
      onBlur,
      onKeyDown,
      placeholder,
      type,
      disabled,
      min,
      max,
      step,
      required
    }

    return (
      <TextFieldContext.Provider value={{ size, disabled, inputProps }}>
        <div
          ref={ref}
          className={cn(
            'border-input bg-background ring-offset-background flex items-center rounded-md border',
            'focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2',
            sizeClasses[size],
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
          {...props}
        >
          {children ?? <TextFieldInput />}
        </div>
      </TextFieldContext.Provider>
    )
  }
)
TextFieldRoot.displayName = 'TextField.Root'

interface TextFieldSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'left' | 'right'
}

const TextFieldSlot = React.forwardRef<HTMLDivElement, TextFieldSlotProps>(({ className, side, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'text-muted-foreground flex items-center',
      side === 'left' && 'pl-2',
      side === 'right' && 'pr-2',
      className
    )}
    {...props}
  />
))
TextFieldSlot.displayName = 'TextField.Slot'

const TextFieldInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const { size, disabled, inputProps } = React.useContext(TextFieldContext)

    return (
      <input
        ref={ref}
        className={cn('min-w-0 flex-1 bg-transparent px-2 outline-none', sizeClasses[size ?? 'base'], className)}
        disabled={disabled}
        {...inputProps}
        {...props}
      />
    )
  }
)
TextFieldInput.displayName = 'TextField.Input'

export const TextField = {
  Root: TextFieldRoot,
  Slot: TextFieldSlot,
  Input: TextFieldInput
}
