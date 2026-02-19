import { ChevronDown, ChevronUp } from 'lucide-react'
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
    base: 'h-9 text-sm',
    lg: 'h-10 text-base'
  }

  return (
    <div
      className={cn(
        'border-input bg-background ring-offset-background focus-within:ring-ring flex min-w-25 items-center rounded-md border focus-within:ring-2 focus-within:ring-offset-2',
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
        className={cn('w-[5em] min-w-0 flex-1 bg-transparent px-2 text-right outline-none', sizeClasses[size])}
        {...props}
      />
      <div className="ml--4 flex h-full items-center gap-px">
        <span className="text-muted-foreground text-xs">{unit}</span>

        <div className="ml-1 flex h-full flex-col">
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            disabled={disabled || !canStepUp}
            onClick={stepUp}
            className="border-input h-1/2 w-6 rounded-l-none rounded-br-none border-b-[0.5px] border-l focus-visible:relative"
            tabIndex={-1}
          >
            <ChevronUp />
          </Button>

          <Button
            type="button"
            className="border-input h-1/2 w-6 rounded-l-none rounded-tr-none border-t-[0.5px] border-l focus-visible:relative"
            variant="outline"
            size="icon-xs"
            disabled={disabled || !canStepDown}
            onClick={stepDown}
            tabIndex={-1}
          >
            <ChevronDown />
          </Button>
        </div>
      </div>
    </div>
  )
})
