import type { ComponentType } from 'react'

import type { PerimeterWallAssemblyType } from '@/construction/assemblies/walls/types'
import { InfillIcon, ModulesIcon, NonStrawbaleIcon, PrefabIcon, StrawhengeIcon } from '@/shared/ui/icons'
import type { IconProps } from '@/shared/ui/icons/types'

export function getWallAssemblyTypeIcon(type: PerimeterWallAssemblyType): ComponentType<IconProps> {
  switch (type) {
    case 'infill':
      return InfillIcon
    case 'strawhenge':
      return StrawhengeIcon
    case 'modules':
      return ModulesIcon
    case 'non-strawbale':
      return NonStrawbaleIcon
    case 'prefab-modules':
      return PrefabIcon
    default:
      return InfillIcon
  }
}
