/**
 * Locale-aware number parsing utilities for input fields.
 *
 * These functions handle the parsing of user input that may use different
 * decimal separators (. or ,) based on locale conventions.
 *
 * Key features:
 * - Lenient parsing: Accepts both . and , as decimal separators
 * - Locale-aware formatting: Outputs numbers formatted for the user's locale
 * - Input validation: Ensures only valid numeric input is accepted
 */

/**
 * Normalizes a number string by replacing comma decimal separator with period.
 * This allows lenient parsing regardless of what the user types.
 *
 * @param value - Input string that may contain . or , as decimal separator
 * @returns Normalized string with . as decimal separator
 *
 * @example
 * ```typescript
 * normalizeDecimalSeparator('12,5')  // '12.5'
 * normalizeDecimalSeparator('12.5')  // '12.5'
 * normalizeDecimalSeparator('12')    // '12'
 * ```
 */
export function normalizeDecimalSeparator(value: string): string {
  return value.replace(',', '.')
}

/**
 * Parses a locale-aware number string to a JavaScript number.
 * Accepts both period and comma as decimal separators.
 *
 * @param value - String value to parse
 * @returns Parsed number, or null if invalid
 *
 * @example
 * ```typescript
 * parseLocaleNumber('12.5')   // 12.5
 * parseLocaleNumber('12,5')   // 12.5
 * parseLocaleNumber('12')     // 12
 * parseLocaleNumber('abc')    // null
 * parseLocaleNumber('')       // null
 * ```
 */
export function parseLocaleNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === ',') {
    return null
  }

  const normalized = normalizeDecimalSeparator(trimmed)
  const number = parseFloat(normalized)

  if (isNaN(number) || !isFinite(number)) {
    return null
  }

  return number
}

/**
 * Checks if a string represents valid numeric input.
 * Accepts both . and , as decimal separators for lenient input.
 *
 * @param value - String to validate
 * @returns true if the string is valid numeric input
 *
 * @example
 * ```typescript
 * isValidLocaleNumericInput('12.5')   // true
 * isValidLocaleNumericInput('12,5')   // true
 * isValidLocaleNumericInput('12')     // true
 * isValidLocaleNumericInput('-12.5')  // true
 * isValidLocaleNumericInput('12.5.3') // false
 * isValidLocaleNumericInput('abc')    // false
 * ```
 */
export function isValidLocaleNumericInput(value: string): boolean {
  if (value.trim() === '') return true

  // Allow numbers with optional decimal separator (. or ,) and optional minus sign
  // Only one decimal separator allowed
  const normalized = normalizeDecimalSeparator(value.trim())
  const numericRegex = /^-?\d*\.?\d*$/
  return numericRegex.test(normalized)
}

/**
 * Checks if a value represents a complete, parseable number.
 *
 * @param value - String to check
 * @returns true if the string is a complete number
 *
 * @example
 * ```typescript
 * isCompleteLocaleNumber('12.5')  // true
 * isCompleteLocaleNumber('12,5')  // true
 * isCompleteLocaleNumber('12')    // true
 * isCompleteLocaleNumber('12.')   // false (incomplete)
 * isCompleteLocaleNumber('.')     // false (incomplete)
 * isCompleteLocaleNumber('-')     // false (incomplete)
 * isCompleteLocaleNumber('')      // false (empty)
 * ```
 */
export function isCompleteLocaleNumber(value: string): boolean {
  return parseLocaleNumber(value) !== null
}

/**
 * Gets the decimal separator for a given locale.
 *
 * @param locale - BCP 47 language tag (e.g., 'en', 'de', 'fr')
 * @returns The decimal separator character for the locale
 *
 * @example
 * ```typescript
 * getDecimalSeparator('en')  // '.'
 * getDecimalSeparator('de')  // ','
 * getDecimalSeparator('fr')  // ','
 * ```
 */
export function getDecimalSeparator(locale: string): string {
  const formatter = new Intl.NumberFormat(locale)
  const parts = formatter.formatToParts(1.1)
  const decimalPart = parts.find(part => part.type === 'decimal')
  return decimalPart?.value ?? '.'
}

/**
 * Formats a number for display in an input field using locale conventions.
 * Does NOT use thousands separators (to avoid confusion in editable fields).
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @param locale - BCP 47 language tag
 * @returns Formatted string with locale-appropriate decimal separator
 *
 * @example
 * ```typescript
 * formatNumberForInput(12.5, 1, 'en')   // '12.5'
 * formatNumberForInput(12.5, 1, 'de')   // '12,5'
 * formatNumberForInput(1234.5, 2, 'en') // '1234.50' (no thousands separator)
 * formatNumberForInput(1234.5, 2, 'de') // '1234,50' (no thousands separator)
 * ```
 */
export function formatNumberForInput(value: number, decimals: number, locale: string): string {
  if (!isFinite(value)) return ''

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false // No thousands separators in input fields
  })

  return formatter.format(value)
}

/**
 * Formats a number for display in an input field, removing trailing zeros.
 * Uses locale-appropriate decimal separator.
 *
 * @param value - Number to format
 * @param maxDecimals - Maximum number of decimal places
 * @param locale - BCP 47 language tag
 * @returns Formatted string without trailing zeros
 *
 * @example
 * ```typescript
 * formatNumberForInputCompact(12.5, 2, 'en')    // '12.5'
 * formatNumberForInputCompact(12.5, 2, 'de')    // '12,5'
 * formatNumberForInputCompact(12.0, 2, 'en')    // '12'
 * formatNumberForInputCompact(12.50, 2, 'en')   // '12.5'
 * formatNumberForInputCompact(12.500, 3, 'de')  // '12,5'
 * ```
 */
export function formatNumberForInputCompact(value: number, maxDecimals: number, locale: string): string {
  if (!isFinite(value)) return ''

  const separator = getDecimalSeparator(locale)
  const formatted = formatNumberForInput(value, maxDecimals, locale)

  // Remove trailing zeros after decimal point
  if (formatted.includes(separator)) {
    return formatted.replace(new RegExp(`\\${separator}?0+$`), '')
  }

  return formatted
}
