import * as React from 'react'

import { cn } from '@/lib/utils'

// Radix Themes compatible TextField wrapper

interface TextFieldRootProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: '1' | '2' | '3'
  disabled?: boolean
  value?: string
  defaultValue?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
}

const TextFieldContext = React.createContext<{
  size?: '1' | '2' | '3'
  disabled?: boolean
  inputProps: Omit<TextFieldRootProps, 'className' | 'style' | 'children' | 'size'>
}>({
  inputProps: {}
})

const sizeClasses = {
  '1': 'h-7 text-xs',
  '2': 'h-9 text-sm',
  '3': 'h-10 text-base'
}

const TextFieldRoot = React.forwardRef<HTMLDivElement, TextFieldRootProps>(
  (
    {
      className,
      children,
      size = '2',
      disabled,
      value,
      defaultValue,
      onChange,
      onBlur,
      onKeyDown,
      placeholder,
      type,
      ...props
    },
    ref
  ) => {
    const inputProps = { value, defaultValue, onChange, onBlur, onKeyDown, placeholder, type, disabled }

    return (
      <TextFieldContext.Provider value={{ size, disabled, inputProps }}>
        <div
          ref={ref}
          className={cn(
            'flex items-center rounded-md border border-input bg-background ring-offset-background',
            'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
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

const TextFieldSlot = React.forwardRef<HTMLDivElement, TextFieldSlotProps>(
  ({ className, side, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center text-muted-foreground',
        side === 'left' && 'pl-2',
        side === 'right' && 'pr-2',
        className
      )}
      {...props}
    />
  )
)
TextFieldSlot.displayName = 'TextField.Slot'

const TextFieldInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const { size, disabled, inputProps } = React.useContext(TextFieldContext)

    return (
      <input
        ref={ref}
        className={cn(
          'flex-1 bg-transparent px-2 outline-none min-w-0',
          sizeClasses[size ?? '2'],
          className
        )}
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
