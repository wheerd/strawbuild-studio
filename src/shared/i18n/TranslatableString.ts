import { type TFunction, t } from 'i18next'

import i18n from '@/shared/i18n/config'

/**
 * A string that can be either static or a translation function.
 * Consumers must use useTranslatableString() to get the translated value.
 */
export type TranslatableString = string | ((t: TFunction, locale: string) => string)

export function transString(s: TranslatableString) {
  return typeof s === 'function' ? s(t, i18n.language) : s
}
