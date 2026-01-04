import type { LengthUnit } from '@/shared/components/LengthField/types'
import {
  formatNumberForInputCompact,
  isCompleteLocaleNumber,
  isValidLocaleNumericInput,
  parseLocaleNumber
} from '@/shared/i18n/numberParsing'

/**
 * Format a display value by removing trailing zeros and ensuring proper precision.
 * Uses locale-aware decimal separator.
 */
export function formatDisplayValue(value: string, unit: LengthUnit, precision: number, locale: string): string {
  const trimmed = value.trim()
  if (trimmed === '') return ''

  const number = parseLocaleNumber(trimmed)
  if (number === null) return value // Return as-is if invalid

  // For mm (precision 0), always return integer
  if (unit === 'mm' || precision === 0) {
    return Math.round(number).toString()
  }

  // For cm and m, format with appropriate precision and remove trailing zeros
  return formatNumberForInputCompact(number, precision, locale)
}

/**
 * Validate that a string represents a valid numeric input.
 * Accepts both . and , as decimal separators for lenient input.
 */
export function isValidNumericInput(value: string): boolean {
  return isValidLocaleNumericInput(value)
}

/**
 * Clean input by removing invalid characters while preserving cursor position intent.
 * Allows both . and , as decimal separators.
 */
export function cleanNumericInput(value: string): string {
  // Remove any non-numeric characters except decimal separators (. and ,) and minus
  return value.replace(/[^0-9.,-]/g, '')
}

/**
 * Check if a value represents a complete, valid number (not just valid input).
 * Accepts both . and , as decimal separators.
 */
export function isCompleteNumber(value: string): boolean {
  return isCompleteLocaleNumber(value)
}
