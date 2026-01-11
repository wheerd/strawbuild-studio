import type { Area, Length, Volume } from '@/shared/geometry'

/**
 * Formats a length value (in mm) with locale-aware number formatting.
 *
 * Uses the same smart unit selection logic as the original formatLength,
 * but respects locale conventions for decimal separators.
 *
 * @param lengthInMm - Length value in millimeters (will be rounded to nearest integer)
 * @param locale - BCP 47 language tag (e.g., 'en', 'de', 'fr')
 * @returns Formatted string with appropriate unit (mm, cm, or m)
 *
 * @example
 * ```typescript
 * formatLength(1234, 'en')  // "1.234m" (period decimal)
 * formatLength(1234, 'de')  // "1,234m" (comma decimal)
 * formatLength(50, 'en')    // "5cm"
 * formatLength(23, 'en')    // "23mm"
 * ```
 */
export function formatLength(lengthInMm: Length, locale: string): string {
  const value = Math.round(lengthInMm)

  if (value === 0) {
    return '0m'
  }

  // For small values, use mm
  if (Math.abs(value) < 100 && value % 10 !== 0) {
    const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
    return `${formatter.format(value)}mm`
  }

  // For medium values divisible by 10, use cm
  if (Math.abs(value) < 200 && value % 10 === 0) {
    const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
    const cm = value / 10
    return `${formatter.format(cm)}cm`
  }

  // For larger values, use meters with locale-aware formatting
  const meters = value / 1000
  let formatter: Intl.NumberFormat

  if (value % 1000 === 0) {
    formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  } else if (value % 100 === 0) {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  } else if (value % 10 === 0) {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } else {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  }

  return `${formatter.format(meters)}m`
}

/**
 * Formats a length value in meters with 3 decimal places.
 *
 * @param length - Length value in millimeters
 * @param locale - BCP 47 language tag
 * @returns Formatted string in meters
 *
 * @example
 * ```typescript
 * formatLengthInMeters(1234, 'en')  // "1.234m"
 * formatLengthInMeters(1234, 'de')  // "1,234m"
 * ```
 */
export function formatLengthInMeters(length: number, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  return `${formatter.format(length / 1000)}m`
}

const MM2_PER_M2 = 1_000_000
const MM3_PER_M3 = 1_000_000_000
const MM3_PER_LITER = 1_000_000

/**
 * Formats an area value with locale-aware number formatting.
 *
 * @param area - Area value in mm²
 * @param locale - BCP 47 language tag
 * @returns Formatted string in m²
 *
 * @example
 * ```typescript
 * formatArea(1500000, 'en')  // "1.50m²"
 * formatArea(1500000, 'de')  // "1,50m²"
 * ```
 */
export function formatArea(area: Area, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${formatter.format(area / MM2_PER_M2)}m²`
}

/**
 * Formats a volume value with locale-aware number formatting.
 *
 * @param volume - Volume value in mm³
 * @param locale - BCP 47 language tag
 * @returns Formatted string in m³
 *
 * @example
 * ```typescript
 * formatVolume(1500000000, 'en')  // "1.50m³"
 * formatVolume(1500000000, 'de')  // "1,50m³"
 * ```
 */
export function formatVolume(volume: Volume, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${formatter.format(volume / MM3_PER_M3)}m³`
}

/**
 * Formats a volume value in liters with locale-aware number formatting.
 *
 * @param volume - Volume value in mm³
 * @param locale - BCP 47 language tag
 * @returns Formatted string in liters
 *
 * @example
 * ```typescript
 * formatVolumeInLiters(1000000, 'en')   // "1L"
 * formatVolumeInLiters(1500000, 'en')   // "1.5L"
 * formatVolumeInLiters(1500000, 'de')   // "1,5L"
 * ```
 */
export function formatVolumeInLiters(volume: Volume, locale: string): string {
  const liters = volume / MM3_PER_LITER
  const decimals = liters === Math.round(liters) ? 0 : 1
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
  return `${formatter.format(liters)}L`
}

/**
 * Formats a weight value with locale-aware number formatting.
 *
 * Displays in kg or tonnes (t) based on magnitude.
 *
 * @param weight - Weight in kilograms
 * @param locale - BCP 47 language tag
 * @returns Formatted string with unit
 *
 * @example
 * ```typescript
 * formatWeight(1234, 'en')    // "1,234 kg"
 * formatWeight(1234, 'de')    // "1.234 kg"
 * formatWeight(1500, 'en')    // "1.5 t"
 * formatWeight(1500, 'de')    // "1,5 t"
 * ```
 */
export function formatWeight(weight: number, locale: string): string {
  // Weight in kg
  if (weight >= 1000) {
    const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 })
    return `${formatter.format(weight / 1000)} t`
  }
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
  return `${formatter.format(weight)} kg`
}

/**
 * Formats a percentage value with locale-aware number formatting.
 *
 * @param value - Percentage value (e.g., 12.5 for 12.5%)
 * @param locale - BCP 47 language tag
 * @returns Formatted string with % symbol
 *
 * @example
 * ```typescript
 * formatPercentage(12.5, 'en')  // "12.5%"
 * formatPercentage(12.5, 'de')  // "12,5%"
 * ```
 */
export function formatPercentage(value: number, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
  return `${formatter.format(value)}%`
}

/**
 * Formats an angle value with locale-aware number formatting.
 *
 * @param degrees - Angle in degrees
 * @param locale - BCP 47 language tag
 * @returns Formatted string with ° symbol
 *
 * @example
 * ```typescript
 * formatAngle(45.5, 'en')  // "45.5°"
 * formatAngle(45.5, 'de')  // "45,5°"
 * ```
 */
export function formatAngle(degrees: number, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
  return `${formatter.format(degrees)}°`
}

/**
 * Formats a number value with locale-aware decimal formatting.
 * Used for ratios and other dimensionless numbers.
 *
 * @param value - Number value to format
 * @param decimals - Number of decimal places (default: 2)
 * @param locale - BCP 47 language tag
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * formatNumber(12.345, 2, 'en')  // "12.35"
 * formatNumber(12.345, 2, 'de')  // "12,35"
 * ```
 */
export function formatNumber(value: number, decimals = 2, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
  return formatter.format(value)
}

/**
 * Formats 2D dimensions (cross-section) with locale-aware number formatting.
 * Typically used for displaying cross-sections of dimensional materials (beams, posts).
 *
 * @param dimensions - Array of two dimension values in mm
 * @param locale - BCP 47 language tag
 * @returns Formatted string like "50mm × 100mm" or "0.050m × 0.100m"
 *
 * @example
 * ```typescript
 * formatDimensions2D([50, 100], 'en')     // "0.050m × 0.100m"
 * formatDimensions2D([50, 100], 'de')     // "0,050m × 0,100m"
 * ```
 */
export function formatDimensions2D(dimensions: [number, number], full = true, locale: string): string {
  if (full) return `${formatLengthInMeters(dimensions[0], locale)} × ${formatLengthInMeters(dimensions[1], locale)}`
  return `${formatLength(dimensions[0], locale)} × ${formatLength(dimensions[1], locale)}`
}

/**
 * Formats 3D dimensions with locale-aware number formatting.
 * Typically used for displaying part dimensions (length × width × height).
 *
 * @param dimensions - Array of three dimension values in mm
 * @param locale - BCP 47 language tag
 * @returns Formatted string like "1.000m × 0.500m × 0.300m"
 *
 * @example
 * ```typescript
 * formatDimensions3D([1000, 500, 300], 'en')  // "1.000m × 0.500m × 0.300m"
 * formatDimensions3D([1000, 500, 300], 'de')  // "1,000m × 0,500m × 0,300m"
 * ```
 */
export function formatDimensions3D(dimensions: readonly [number, number, number], full = true, locale: string): string {
  if (full)
    return `${formatLengthInMeters(dimensions[0], locale)} × ${formatLengthInMeters(dimensions[1], locale)} × ${formatLengthInMeters(dimensions[2], locale)}`
  return `${formatLength(dimensions[0], locale)} × ${formatLength(dimensions[1], locale)} × ${formatLength(dimensions[2], locale)}`
}
