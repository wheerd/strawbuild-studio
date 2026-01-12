import { useTranslation } from 'react-i18next'

import type { Tag } from './tags'
import { isCustomTag } from './tags'

/**
 * Hook to get the display label for a tag.
 * - Predefined tags: uses translation from Resources
 * - Custom tags with nameKey: uses translation from nameKey (config namespace)
 * - Custom tags without nameKey: uses the custom label property
 */
export function useTagLabel(tag: Tag | null | undefined): string {
  const { t } = useTranslation()

  if (!tag) return ''
  if (isCustomTag(tag)) {
    return tag.translation ? tag.translation(t) : tag.label
  }

  return t($ => $.tags[tag.id], { ns: 'construction' })
}
