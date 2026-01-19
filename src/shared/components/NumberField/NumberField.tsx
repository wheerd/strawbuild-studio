import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons'
import * as React from 'react'
import { forwardRef, useContext } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useNumberFieldState } from './hooks/useNumberFieldState'
import type { NumberFieldProps, NumberFieldState } from './types'

/**
 * Context for sharing state between NumberField compound components.
 */
const NumberFieldContext = React.createContext<{
  size: 'sm' | 'base' | 'lg'
  disabled: boolean
  state: NumberFieldState
  inputRef: React.RefObject<HTMLInputElement | null>
} | null>(null)

function useNumberFieldContext() {
  const context = useContext(NumberFieldContext)
  if (!context) {
    throw new Error('NumberField components must be used within NumberField.Root')
  }
  return context
}

const sizeClasses = {
  sm: 'h-7 text-xs',
  base: 'h-9 text-sm',
  lg: 'h-10 text-base'
}

/**
 * Root container for the NumberField compound component.
 *
 * @example
 * ```tsx
 * <NumberField.Root value={count} onChange={setCount} min={0} max={100}>
 *   <NumberField.Input />
 *   <NumberField.Slot side="right">units</NumberField.Slot>
 *   <NumberField.Spinner />
 * </NumberField.Root>
 * ```
 */
const NumberFieldRoot = forwardRef<HTMLDivElement, NumberFieldProps>(function NumberFieldRoot(
  {
    value,
    onChange,
    onCommit,
    step,
    precision,
    min,
    max,
    size = 'base',
    placeholder: _placeholder,
    disabled = false,
    className,
    style,
    onFocus: _onFocus,
    onBlur: _onBlur,
    children,
    ...props
  },
  ref
) {
  const { i18n } = useTranslation()
  const locale = i18n.language
  const inputRef = React.useRef<HTMLInputElement>(null)

  const state = useNumberFieldState(value, {
    step,
    precision,
    min,
    max,
    onChange,
    onCommit,
    locale
  })

  return (
    <NumberFieldContext.Provider value={{ size, disabled, state, inputRef }}>
      <div
        ref={ref}
        className={cn(
          'border-input bg-background ring-offset-background focus-within:ring-ring flex items-center rounded-md border focus-within:ring-2 focus-within:ring-offset-2',
          sizeClasses[size],
          !state.isValid && 'border-destructive',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        style={style}
        {...props}
      >
        {children ?? (
          <>
            <NumberFieldInput />
            <NumberFieldSpinner />
          </>
        )}
      </div>
    </NumberFieldContext.Provider>
  )
})

interface NumberFieldInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  /** Text alignment within the input */
  align?: 'left' | 'right'
}

/**
 * The input element for NumberField.
 */
const NumberFieldInput = forwardRef<HTMLInputElement, NumberFieldInputProps>(function NumberFieldInput(
  { className, align = 'right', onFocus, onBlur, ...props },
  forwardedRef
) {
  const { size, disabled, state, inputRef } = useNumberFieldContext()
  const { displayValue, handleChange, handleBlur, handleKeyDown } = state

  // Merge refs
  const mergedRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      // Update internal ref
      inputRef.current = node
      // Update forwarded ref
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }
    },
    [forwardedRef, inputRef]
  )

  const handleBlurEvent = (e: React.FocusEvent<HTMLInputElement>) => {
    handleBlur()
    onBlur?.(e)
  }

  return (
    <input
      ref={mergedRef}
      value={displayValue}
      onChange={e => {
        handleChange(e.target.value)
      }}
      onBlur={handleBlurEvent}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(
        'min-w-0 flex-1 bg-transparent px-2 outline-none',
        align === 'right' && 'text-right',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
})

interface NumberFieldSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'left' | 'right'
}

/**
 * A slot for placing content (icons, labels) beside the input.
 * Compatible with TextField.Slot API.
 */
const NumberFieldSlot = forwardRef<HTMLDivElement, NumberFieldSlotProps>(function NumberFieldSlot(
  { className, side, ...props },
  ref
) {
  return (
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
  )
})

interface NumberFieldSpinnerProps {
  className?: string
}

/**
 * Spinner buttons for incrementing/decrementing the value.
 */
const NumberFieldSpinner = forwardRef<HTMLDivElement, NumberFieldSpinnerProps>(function NumberFieldSpinner(
  { className },
  ref
) {
  const { disabled, state } = useNumberFieldContext()
  const { stepUp, stepDown, canStepUp, canStepDown } = state

  return (
    <div ref={ref} className={cn('ml-1 flex h-full flex-col', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || !canStepUp}
        onClick={stepUp}
        className="border-input h-1/2 w-8 rounded-l-none rounded-br-none border-b-[0.5px] border-l focus-visible:relative"
        tabIndex={-1}
      >
        <ChevronUpIcon className="h-2.5 w-2.5" />
      </Button>

      <Button
        type="button"
        className="border-input h-1/2 w-8 rounded-l-none rounded-tr-none border-t-[0.5px] border-l focus-visible:relative"
        variant="outline"
        size="icon"
        disabled={disabled || !canStepDown}
        onClick={stepDown}
        tabIndex={-1}
      >
        <ChevronDownIcon className="h-2.5 w-2.5" />
      </Button>
    </div>
  )
})

/**
 * A number input field with spinner controls, keyboard navigation, and locale-aware formatting.
 *
 * Features:
 * - Locale-aware decimal separator (uses i18next language)
 * - Spinner buttons for incrementing/decrementing values
 * - Keyboard arrow key support with modifier keys (Shift = 10x, Ctrl = 0.1x)
 * - Input validation and formatting on blur
 * - Min/max bounds enforcement
 * - Compound component pattern for flexible composition
 *
 * @example
 * ```tsx
 * // Simple usage (with default Input and Spinner)
 * <NumberField.Root value={count} onChange={setCount} min={0} max={100} />
 *
 * // With suffix slot
 * <NumberField.Root value={angle} onChange={setAngle} min={0} max={90}>
 *   <NumberField.Input />
 *   <NumberField.Slot side="right">°</NumberField.Slot>
 *   <NumberField.Spinner />
 * </NumberField.Root>
 *
 * // With prefix slot and no spinner
 * <NumberField.Root value={price} onChange={setPrice} min={0}>
 *   <NumberField.Slot side="left">$</NumberField.Slot>
 *   <NumberField.Input align="left" />
 * </NumberField.Root>
 *
 * // With custom unit display
 * <NumberField.Root value={density} onChange={setDensity} min={0}>
 *   <NumberField.Input />
 *   <NumberField.Slot side="right">kg/m³</NumberField.Slot>
 *   <NumberField.Spinner />
 * </NumberField.Root>
 * ```
 */
export const NumberField = {
  Root: NumberFieldRoot,
  Input: NumberFieldInput,
  Slot: NumberFieldSlot,
  Spinner: NumberFieldSpinner
}
