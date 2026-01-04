import type { LengthUnit } from '@/shared/components/LengthField/types'
import type { Length } from '@/shared/geometry'
import { formatNumberForInputCompact, parseLocaleNumber } from '@/shared/i18n/numberParsing'

/**
 * Convert a length value from millimeters to the specified unit for display.
 * Uses locale-aware formatting for decimal separators.
 */
export function lengthToDisplayValue(lengthMm: Length, unit: LengthUnit, precision: number, locale: string): string {
  if (typeof lengthMm !== 'number' || isNaN(lengthMm) || !isFinite(lengthMm)) {
    return ''
  }

  let value: number

  switch (unit) {
    case 'mm': {
      value = Math.round(lengthMm)
      break
    }
    case 'cm': {
      value = Math.round(lengthMm) / 10
      break
    }
    case 'm': {
      value = Math.round(lengthMm) / 1000
      break
    }
    default: {
      throw new Error(`Unsupported unit: ${unit}`)
    }
  }

  // For mm (precision 0), return integer without locale formatting
  if (unit === 'mm' || precision === 0) {
    return value.toString()
  }

  // For cm and m, use locale-aware formatting with trailing zero removal
  return formatNumberForInputCompact(value, precision, locale)
}

/**
 * Convert a display value string to a length in millimeters.
 * Accepts both . and , as decimal separators.
 */
export function displayValueToLength(displayValue: string, unit: LengthUnit): Length | null {
  const trimmed = displayValue.trim()
  if (trimmed === '') return null

  const number = parseLocaleNumber(trimmed)
  if (number === null) return null

  let valueInMm: number
  switch (unit) {
    case 'mm':
      valueInMm = number
      break
    case 'cm':
      valueInMm = number * 10
      break
    case 'm':
      valueInMm = number * 1000
      break
    default:
      throw new Error(`Unsupported unit: ${unit}`)
  }

  return Math.round(valueInMm)
}

/**
 * Get the default step size for a given unit
 */
export function getDefaultStepSize(unit: LengthUnit): Length {
  switch (unit) {
    case 'mm':
      return 1 // 1mm
    case 'cm':
      return 10 // 1cm = 10mm
    case 'm':
      return 100 // 0.1m = 100mm
    default:
      throw new Error(`Unsupported unit: ${unit}`)
  }
}

/**
 * Get the default precision (decimal places) for a given unit
 */
export function getDefaultPrecision(unit: LengthUnit): number {
  switch (unit) {
    case 'mm':
      return 0 // No decimals for mm
    case 'cm':
      return 1 // 1 decimal for cm
    case 'm':
      return 1 // 1 decimal for m (0.1m precision)
    default:
      throw new Error(`Unsupported unit: ${unit}`)
  }
}

/**
 * Clamp a length value to the specified bounds
 */
export function clampLength(value: Length, min?: Length, max?: Length): Length {
  let result = value
  if (min !== undefined) result = Math.max(min, result)
  if (max !== undefined) result = Math.min(max, result)
  return result
}
