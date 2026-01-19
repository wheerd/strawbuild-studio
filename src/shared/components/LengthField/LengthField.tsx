import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons'
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useLengthFieldState } from './hooks/useLengthFieldState'
import type { LengthFieldProps } from './types'

/**
 * A sophisticated length input field with unit display, spinner controls, and keyboard navigation.
 *
 * Features:
 * - Unit-aware display (mm, cm, m) with appropriate precision
 * - Spinner buttons for incrementing/decrementing values
 * - Keyboard arrow key support with modifier keys (Shift = 10x, Ctrl = 0.1x)
 * - Input validation and formatting on blur
 * - Debounced updates to prevent excessive onChange calls
 * - Min/max bounds enforcement
 *
 * @example
 * ```tsx
 * <LengthField
 *   value={1250 }
 *   onChange={setLength}
 *   unit="cm"
 *   min={0 }
 *   max={5000 }
 * />
 * ```
 */
export const LengthField = forwardRef<HTMLInputElement, LengthFieldProps>(function LengthField(
  {
    value,
    onChange,
    onCommit,
    unit,
    step,
    precision,
    min,
    max,
    size = 'base',
    placeholder,
    disabled = false,
    className,
    style,
    onFocus,
    onBlur,
    children,
    ...props
  },
  ref
) {
  const { i18n } = useTranslation()
  const locale = i18n.language

  const fieldState = useLengthFieldState(value, unit, {
    step,
    precision,
    min,
    max,
    onChange,
    onCommit,
    locale
  })

  const { displayValue, handleChange, handleBlur, handleKeyDown, stepUp, stepDown, isValid, canStepUp, canStepDown } =
    fieldState

  // Combine internal and user-provided event handlers
  const handleBlurEvent = (e: React.FocusEvent<HTMLInputElement>) => {
    handleBlur()
    onBlur?.(e)
  }

  const handleFocusEvent = (e: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(e)
  }

  const sizeClasses = {
    sm: 'h-7 text-xs',
    base: 'h-9 <Text text-sm',
    lg: 'h-10 <Text text-base'
  }

  return (
    <div
      className={cn(
        'flex items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        sizeClasses[size],
        !isValid && 'border-destructive',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      style={style}
    >
      {children}
      <input
        ref={ref}
        value={displayValue}
        onChange={e => {
          handleChange(e.target.value)
        }}
        onBlur={handleBlurEvent}
        onFocus={handleFocusEvent}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn('flex-1 bg-transparent px-2 text-right outline-none min-w-0', sizeClasses[size])}
        {...props}
      />
      <div className="flex items-center gap-px px-1">
        <span className="text-xs text-muted-foreground">{unit}</span>

        <div className="flex flex-col ml-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || !canStepUp}
            onClick={stepUp}
            className="h-[10px] w-3 p-0 leading-none"
            tabIndex={-1}
          >
            <ChevronUpIcon className="h-2.5 w-2.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || !canStepDown}
            onClick={stepDown}
            className="h-[10px] w-3 p-0 leading-none"
            tabIndex={-1}
          >
            <ChevronDownIcon className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
    </div>
  )
})
