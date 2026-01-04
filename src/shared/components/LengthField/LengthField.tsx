import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons'
import { IconButton, Text, TextField } from '@radix-ui/themes'
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'

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
    size = '2',
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

  return (
    <TextField.Root
      ref={ref}
      value={displayValue}
      onChange={e => handleChange(e.target.value)}
      onBlur={handleBlurEvent}
      onFocus={handleFocusEvent}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      size={size}
      disabled={disabled}
      className={`${className || ''} length-field`}
      style={{
        textAlign: 'right',
        ...style
      }}
      color={isValid ? undefined : 'red'}
      {...props}
    >
      {children}

      <TextField.Slot side="right" style={{ display: 'flex', alignItems: 'center', gap: '1px', padding: '0 4px' }}>
        <Text size="1" color="gray">
          {unit}
        </Text>

        <div className="flex flex-col" style={{ marginLeft: '4px' }}>
          <IconButton
            type="button"
            size="1"
            variant="ghost"
            disabled={disabled || !canStepUp}
            onClick={stepUp}
            className="h-[10px] p-0 leading-none m-0"
            style={{ fontSize: '10px', minHeight: '10px', minWidth: '12px' }}
            tabIndex={-1}
          >
            <ChevronUpIcon />
          </IconButton>

          <IconButton
            type="button"
            size="1"
            variant="ghost"
            disabled={disabled || !canStepDown}
            onClick={stepDown}
            className="h-[10px] p-0 leading-none m-0"
            style={{ fontSize: '10px', minHeight: '10px', minWidth: '12px' }}
            tabIndex={-1}
          >
            <ChevronDownIcon />
          </IconButton>
        </div>
      </TextField.Slot>
    </TextField.Root>
  )
})
