import { useTranslation } from 'react-i18next'

import type { Material } from './material'

/**
 * Hook to get the display name for a material.
 * If the material has a nameKey, it will be translated.
 * Otherwise, the material's name field is used directly.
 */
export function useMaterialName(material: Material | null | undefined): string {
  const { t } = useTranslation('config')

  if (!material) return ''

  // If material has a translation key, use it
  const nameKey = material.nameKey
  if (nameKey != null) {
    return t($ => $.materials.defaults[nameKey])
  }

  // Otherwise use the direct name (user-edited or no translation available)
  return material.name
}
