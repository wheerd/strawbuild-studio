import { type TFunction, t } from 'i18next'

/**
 * A string that can be either static or a translation function.
 * Consumers must use useTranslatableString() to get the translated value.
 */
export type TranslatableString = string | ((t: TFunction) => string)

export function transString(s: TranslatableString) {
  return typeof s === 'function' ? s(t) : s
}
