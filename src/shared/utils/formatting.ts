/**
 * @deprecated This module now re-exports from @/shared/i18n/formatters with default 'en' locale.
 * For locale-aware formatting in React components, use the useFormatters() hook instead:
 *
 * ```typescript
 * import { useFormatters } from '@/shared/i18n/useFormatters'
 *
 * function MyComponent() {
 *   const { formatLength, formatArea } = useFormatters()
 *   return <Text>{formatLength(1234)}</Text>
 * }
 * ```
 *
 * This module maintains backward compatibility for existing code,
 * but all formatting defaults to English locale ('en').
 */
import type { Area, Length, Volume } from '@/shared/geometry'
import * as i18nFormatters from '@/shared/i18n/formatters'

/**
 * Formats a length value (in mm) to the most appropriate unit with optimal readability.
 *
 * **Note**: This function defaults to English locale. For locale-aware formatting,
 * use the `useFormatters()` hook in React components.
 *
 * **Formatting Rules:**
 *
 * 1. **Millimeters (mm)**: Used for values < 100mm that are not multiples of 10
 *    - Examples: `5mm`, `23mm`, `67mm`, `91mm`
 *
 * 2. **Centimeters (cm)**: Used for values < 200mm that are multiples of 10
 *    - Examples: `10mm` → `1cm`, `50mm` → `5cm`, `120mm` → `12cm`, `190mm` → `19cm`
 *
 * 3. **Meters (m)**: Used for all other values, with precision based on divisibility:
 *    - **Exact thousands**: `1000mm` → `1m`, `3000mm` → `3m`
 *    - **Hundreds**: `1300mm` → `1.3m`, `2400mm` → `2.4m` (1 decimal place)
 *    - **Tens**: `1250mm` → `1.25m`, `2750mm` → `2.75m` (2 decimal places)
 *    - **Units**: `1234mm` → `1.234m`, `2567mm` → `2.567m` (3 decimal places)
 *
 * **Design Philosophy:**
 * - Prioritizes readability and brevity
 * - Avoids decimal places in cm (uses mm or m instead)
 * - Uses minimal decimal places in meters (trailing zeros removed)
 * - Consistent with architectural/construction measurement conventions
 *
 * @param lengthInMm - Length value in millimeters (will be rounded to nearest integer)
 * @returns Formatted string with appropriate unit (mm, cm, or m)
 */
export function formatLength(lengthInMm: Length): string {
  return i18nFormatters.formatLength(lengthInMm, 'en')
}

export function formatLengthInMeters(length: number): string {
  return i18nFormatters.formatLengthInMeters(length, 'en')
}

export function formatArea(area: Area): string {
  return i18nFormatters.formatArea(area, 'en')
}

export function formatVolume(volume: Volume): string {
  return i18nFormatters.formatVolume(volume, 'en')
}

export function formatVolumeInLiters(volume: Volume): string {
  return i18nFormatters.formatVolumeInLiters(volume, 'en')
}
