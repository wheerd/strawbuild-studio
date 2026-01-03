import type React from 'react'

import type { Length } from '@/shared/geometry'

export type LengthUnit = 'mm' | 'cm' | 'm'

export interface LengthFieldProps {
  value: Length

  // Event handlers - dual event system
  onChange?: (value: Length) => void // Fires during typing for valid values
  onCommit?: (value: Length) => void // Fires on blur/enter with final value

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
  title?: string
  id?: string

  // Event handlers
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void

  children?: React.ReactNode
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
  onChange?: (value: Length) => void
  onCommit?: (value: Length) => void
  locale?: string
}
