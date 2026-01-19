import type React from 'react'

export interface NumberFieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: number

  // Event handlers - dual event system
  onChange?: (value: number | undefined) => void // Fires during typing for valid values
  onCommit?: (value: number | undefined) => void // Fires on blur/enter with final value

  // Number formatting
  precision?: number // Decimal places (default: 0)
  step?: number // Step size for spinner/arrows (default: 1)

  // Validation
  min?: number
  max?: number

  // Standard TextField props
  size?: 'sm' | 'base' | 'lg'
  placeholder?: string
  disabled?: boolean

  // Event handlers (for input element)
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void

  children?: React.ReactNode
}

export interface NumberFieldState {
  displayValue: string
  handleChange: (value: string) => void
  handleBlur: () => void
  handleKeyDown: (e: React.KeyboardEvent) => void
  stepUp: () => void
  stepDown: () => void
  isValid: boolean
  canStepUp: boolean
  canStepDown: boolean
}

export interface NumberFieldOptions {
  step?: number
  precision?: number
  min?: number
  max?: number
  onChange?: (value: number | undefined) => void
  onCommit?: (value: number | undefined) => void
  locale?: string
}
