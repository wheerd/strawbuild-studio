import { useTranslation } from 'react-i18next'

import type { HighlightedAreaType } from './model'

/**
 * Hook to get the display label for a highlighted area type.
 * Uses translation from Resources based on the predefined area type.
 */
export function useAreaLabel(areaType: HighlightedAreaType): string {
  const { t } = useTranslation('construction')
  return t($ => $.areaTypes[areaType])
}
