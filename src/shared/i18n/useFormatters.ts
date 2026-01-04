import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import * as formatters from './formatters'

/**
 * React hook that provides locale-aware formatting functions.
 *
 * Returns memoized formatters that automatically update when the user's
 * language preference changes via i18next.
 *
 * @returns Object containing all formatting functions bound to current locale
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { formatLength, formatArea, formatWeight } = useFormatters()
 *
 *   return (
 *     <div>
 *       <Text>Length: {formatLength(1234)}</Text>
 *       <Text>Area: {formatArea(1500000)}</Text>
 *       <Text>Weight: {formatWeight(500)}</Text>
 *     </div>
 *   )
 * }
 * ```
 */
export function useFormatters() {
  const { i18n } = useTranslation()
  const locale = i18n.language

  return useMemo(
    () => ({
      formatLength: (mm: number) => formatters.formatLength(mm, locale),
      formatLengthInMeters: (mm: number) => formatters.formatLengthInMeters(mm, locale),
      formatArea: (mm2: number) => formatters.formatArea(mm2, locale),
      formatVolume: (mm3: number) => formatters.formatVolume(mm3, locale),
      formatVolumeInLiters: (mm3: number) => formatters.formatVolumeInLiters(mm3, locale),
      formatWeight: (kg: number) => formatters.formatWeight(kg, locale),
      formatPercentage: (value: number) => formatters.formatPercentage(value, locale),
      formatAngle: (degrees: number) => formatters.formatAngle(degrees, locale),
      formatNumber: (value: number, decimals?: number) => formatters.formatNumber(value, decimals, locale),
      formatDimensions2D: (dimensions: [number, number], full = true) =>
        formatters.formatDimensions2D(dimensions, full, locale),
      formatDimensions3D: (dimensions: readonly [number, number, number], full = true) =>
        formatters.formatDimensions3D(dimensions, full, locale)
    }),
    [locale]
  )
}
