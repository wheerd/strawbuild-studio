import type { Length } from '@/shared/geometry'

/**
 * Formats a length value (in mm) to the most appropriate unit with optimal readability.
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
 *
 * @example
 * ```typescript
 * formatLength(5)    // "5mm"
 * formatLength(23)   // "23mm"
 * formatLength(50)   // "5cm"
 * formatLength(95)   // "95mm" (not divisible by 10)
 * formatLength(100)  // "10cm"
 * formatLength(105)  // "0.105m" (would be 10.5cm with decimal)
 * formatLength(190)  // "19cm"
 * formatLength(200)  // "0.2m" (≥ 200mm uses meters)
 * formatLength(1000) // "1m"
 * formatLength(1300) // "1.3m"
 * formatLength(1250) // "1.25m"
 * formatLength(1234) // "1.234m"
 * ```
 */
export function formatLength(lengthInMm: Length): string {
  const value = Math.round(lengthInMm)

  if (value === 0) {
    return '0m'
  }

  if (Math.abs(value) < 100 && value % 10 !== 0) {
    return `${value}mm`
  }

  if (Math.abs(value) < 200 && value % 10 === 0) {
    const cm = value / 10
    return `${cm}cm`
  }

  const meters = value / 1000
  if (value % 1000 === 0) {
    return `${meters}m` // e.g., "2m"
  } else if (value % 100 === 0) {
    return `${meters.toFixed(1)}m` // e.g., "1.3m"
  } else if (value % 10 === 0) {
    return `${meters.toFixed(2)}m` // e.g., "1.25m"
  } else {
    return `${meters.toFixed(3)}m` // e.g., "1.234m"
  }
}
