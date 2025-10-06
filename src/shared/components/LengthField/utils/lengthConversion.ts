import type { LengthUnit } from '@/shared/components/LengthField/types'
import type { Length } from '@/shared/geometry'

/**
 * Convert a length value from millimeters to the specified unit for display
 */
export function lengthToDisplayValue(lengthMm: Length, unit: LengthUnit, precision: number): string {
  const value = Math.round(lengthMm)

  switch (unit) {
    case 'mm': {
      return value.toString()
    }
    case 'cm': {
      const cm = value / 10
      return cm.toFixed(precision)
    }
    case 'm': {
      const m = value / 1000
      return m.toFixed(precision)
    }
    default: {
      throw new Error(`Unsupported unit: ${unit}`)
    }
  }
}

/**
 * Convert a display value string to a length in millimeters
 */
export function displayValueToLength(displayValue: string, unit: LengthUnit): Length | null {
  const trimmed = displayValue.trim()
  if (trimmed === '') return null

  const number = parseFloat(trimmed)
  if (isNaN(number) || !isFinite(number)) return null

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

  return Math.round(valueInMm) as Length
}

/**
 * Get the default step size for a given unit
 */
export function getDefaultStepSize(unit: LengthUnit): Length {
  switch (unit) {
    case 'mm':
      return 1 as Length // 1mm
    case 'cm':
      return 10 as Length // 1cm = 10mm
    case 'm':
      return 100 as Length // 0.1m = 100mm
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
  if (min !== undefined) result = Math.max(min, result) as Length
  if (max !== undefined) result = Math.min(max, result) as Length
  return result
}
