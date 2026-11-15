import type { InteriorWallAssemblyConfig } from '@/config/types'

import { MonolithicInteriorWallAssembly } from './monolithic'
import { StudInteriorWallAssembly } from './stud'
import type { InteriorWallAssembly } from './types'

export function resolveInteriorWallAssembly(config: InteriorWallAssemblyConfig): InteriorWallAssembly {
  switch (config.type) {
    case 'monolithic':
      return new MonolithicInteriorWallAssembly(config)
    case 'stud':
      return new StudInteriorWallAssembly(config)
  }
}
