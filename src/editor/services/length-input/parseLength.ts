import type { Length } from '@/shared/geometry'

/**
 * Result of parsing a length input string
 */
export interface ParseLengthResult {
  /** Whether the input was successfully parsed */
  success: boolean
  /** The parsed length in millimeters, or null if parsing failed */
  value: Length | null
  /** Error message if parsing failed */
  error?: string
}

/**
 * Parse user input string into a Length value (in millimeters).
 *
 * Supports both period (.) and comma (,) as decimal separators for international compatibility.
 *
 * Supported formats:
 * - Bare numbers: "500" → 500mm (assumes millimeters)
 * - Millimeters: "500mm", "500 mm" → 500mm
 * - Centimeters: "50cm", "50 cm", "5.5cm", "5,5cm" → 500mm, 550mm
 * - Meters: "0.5m", "0,5m", "0.5 m", "1.25m", "1,25m" → 500mm, 1250mm
 * - Decimal numbers: "12.5", "12,5", "0.75m", "0,75m", "2.5cm", "2,5cm"
 * - Negative values: "-100mm", "-5cm" (for relative movements)
 *
 * @param input - User input string
 * @returns ParseLengthResult with success status and parsed value
 *
 * @example
 * ```typescript
 * parseLength("500")     // { success: true, value: 500 }
 * parseLength("50cm")    // { success: true, value: 500 }
 * parseLength("0.5m")    // { success: true, value: 500 }
 * parseLength("0,5m")    // { success: true, value: 500 }
 * parseLength("invalid") // { success: false, value: null, error: "..." }
 * ```
 */
export function parseLength(input: string): ParseLengthResult {
  if (!input || typeof input !== 'string') {
    return {
      success: false,
      value: null,
      error: 'Input is required'
    }
  }

  // Trim whitespace and convert to lowercase for unit matching
  const trimmed = input.trim()
  if (trimmed === '') {
    return {
      success: false,
      value: null,
      error: 'Input cannot be empty'
    }
  }

  // Regular expression to match number with optional unit
  // Captures: optional sign, number (with optional decimal using . or ,), optional whitespace, optional unit
  const lengthRegex = /^([+-]?)(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?$/i
  const match = trimmed.match(lengthRegex)

  if (!match) {
    return {
      success: false,
      value: null,
      error: 'Invalid format. Use formats like: 500, 50cm, 0.5m'
    }
  }

  const [, sign, numberStr, unit] = match
  // Normalize decimal separator to period for parseFloat
  const normalizedNumberStr = numberStr.replace(',', '.')
  const number = parseFloat(normalizedNumberStr)

  // Check for valid number
  if (isNaN(number) || !isFinite(number)) {
    return {
      success: false,
      value: null,
      error: 'Invalid number'
    }
  }

  // Apply sign
  const signedNumber = sign === '-' ? -number : number

  // Convert to millimeters based on unit (default to mm if no unit)
  let valueInMm: number
  const unitLower = (unit || 'mm').toLowerCase()

  switch (unitLower) {
    case 'mm':
      valueInMm = signedNumber
      break
    case 'cm':
      valueInMm = signedNumber * 10
      break
    case 'm':
      valueInMm = signedNumber * 1000
      break
    default:
      return {
        success: false,
        value: null,
        error: `Unsupported unit: ${unit}`
      }
  }

  // Round to nearest integer (millimeter precision)
  const roundedValue = Math.round(valueInMm)

  return {
    success: true,
    value: roundedValue
  }
}

/**
 * Convenience function that returns just the parsed value or null
 *
 * @param input - User input string
 * @returns Length value in millimeters, or null if parsing failed
 */
export function parseLengthValue(input: string): Length | null {
  const result = parseLength(input)
  return result.success ? result.value : null
}

/**
 * Check if a string represents a valid length input without fully parsing it
 *
 * @param input - User input string
 * @returns true if the input can be parsed as a length
 */
export function isValidLengthInput(input: string): boolean {
  return parseLength(input).success
}
