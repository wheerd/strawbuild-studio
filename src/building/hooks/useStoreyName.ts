import type { Namespace } from 'i18next'
import { type UseTranslationResponse, useTranslation } from 'react-i18next'

import type { Storey } from '@/building/model'

export function useStoreyName(storey: Storey | null): string {
  const { t } = useTranslation('common')
  return getStoreyName(storey, t)
}

export function getStoreyName<T extends Namespace>(
  storey: Storey | null,
  t: UseTranslationResponse<T, undefined>['t']
): string {
  if (!storey) return ''

  if (storey.useDefaultName) {
    if (storey.level === 0) {
      return t($ => $.storeys.groundFloor, { ns: 'common' })
    } else if (storey.level < 0) {
      return t($ => $.storeys.defaultBasementName, { count: -storey.level, ordinal: true, ns: 'common' })
    } else {
      return t($ => $.storeys.defaultName, { count: storey.level, ordinal: true, ns: 'common' })
    }
  }

  return storey.name
}
