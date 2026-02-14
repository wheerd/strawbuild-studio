import { type TFunction, i18next, t } from 'i18next'

/**
 * A string that can be either static or a translation function.
 * Consumers must use useTranslatableString() to get the translated value.
 */
export type TranslatableString = string | ((t: TFunction, locale: string) => string)

export function transString(s: TranslatableString) {
  return typeof s === 'function' ? s(t, i18next.language) : s
}
