import { useTranslation } from 'react-i18next'

import { useTranslatableString } from '@/shared/i18n/useTranslatableString'

import type { Tag } from './tags'
import { isCustomTag } from './tags'

export function useTagLabel(tag: Tag | null | undefined): string {
  const { t } = useTranslation()

  if (!tag) return ''
  if (isCustomTag(tag)) {
    return useTranslatableString(tag.label)
  }

  return t($ => $.tags[tag.id], { ns: 'construction' })
}
