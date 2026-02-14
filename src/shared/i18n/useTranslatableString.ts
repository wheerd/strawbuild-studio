import { useTranslation } from 'react-i18next'

import type { TranslatableString } from './TranslatableString'

/**
 * Hook to translate a TranslatableString.
 * - If it's a function: calls it with i18n t() function
 * - If it's a string: returns as-is
 *
 * @param value - The translatable string to resolve
 * @returns The resolved/translated string
 */
export function useTranslatableString(value: TranslatableString | null | undefined): string {
  const { t, i18n } = useTranslation()
  if (value === null || value === undefined) return ''
  return typeof value === 'function' ? value(t, i18n.language) : value
}
