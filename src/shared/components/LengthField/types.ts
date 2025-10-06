import type { Length } from '@/shared/geometry'

export type LengthUnit = 'mm' | 'cm' | 'm'

export interface LengthFieldProps {
  value: Length
  onChange: (value: Length) => void

  // Fixed unit display
  unit: LengthUnit

  // Spinner configuration
  step?: Length
  precision?: number

  // Validation
  min?: Length
  max?: Length

  // Standard TextField props
  size?: '1' | '2' | '3'
  placeholder?: string
  disabled?: boolean
  className?: string
  style?: React.CSSProperties

  // Event handlers
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
}

export interface LengthFieldState {
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

export interface LengthFieldOptions {
  step?: Length
  precision?: number
  min?: Length
  max?: Length
  debounceMs?: number
}
