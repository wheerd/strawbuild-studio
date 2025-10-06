import type { LengthUnit } from '@/shared/components/LengthField/types'

/**
 * Format a display value by removing trailing zeros and ensuring proper precision
 */
export function formatDisplayValue(value: string, unit: LengthUnit, precision: number): string {
  const trimmed = value.trim()
  if (trimmed === '') return ''

  const number = parseFloat(trimmed)
  if (isNaN(number) || !isFinite(number)) return value // Return as-is if invalid

  // For mm (precision 0), always return integer
  if (unit === 'mm' || precision === 0) {
    return Math.round(number).toString()
  }

  // For cm and m, format with appropriate precision and remove trailing zeros
  const formatted = number.toFixed(precision)

  // Remove trailing zeros after decimal point, but keep at least one decimal if there was one
  if (formatted.includes('.')) {
    return formatted.replace(/\.?0+$/, '')
  }

  return formatted
}

/**
 * Validate that a string represents a valid numeric input
 */
export function isValidNumericInput(value: string): boolean {
  if (value.trim() === '') return true // Empty is valid (will be handled as 0 or reverted)

  // Allow numbers with optional decimal point and optional minus sign
  const numericRegex = /^-?\d*\.?\d*$/
  return numericRegex.test(value.trim())
}

/**
 * Clean input by removing invalid characters while preserving cursor position intent
 */
export function cleanNumericInput(value: string): string {
  // Remove any non-numeric characters except decimal point and minus
  return value.replace(/[^0-9.-]/g, '')
}

/**
 * Check if a value represents a complete, valid number (not just valid input)
 */
export function isCompleteNumber(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === '-' || trimmed === '.') return false

  const number = parseFloat(trimmed)
  return !isNaN(number) && isFinite(number)
}
