import { useTranslation } from 'react-i18next'

import type { TagCategoryId } from './tags'

/**
 * Hook to get the display label for a tag category.
 */
export function useCategoryLabel(categoryId: TagCategoryId | null | undefined): string {
  const { t } = useTranslation('construction')

  if (!categoryId) return ''

  return t($ => $.tagCategories[categoryId])
}
