import type { InteriorWallAssemblyConfig } from '@/config/types'

import { MonolithicInteriorWallAssembly } from './monolithic'
import { MonolithicStudInteriorWallAssembly, PlankedStudInteriorWallAssembly } from './stud'
import type { InteriorWallAssembly } from './types'

export function resolveInteriorWallAssembly(config: InteriorWallAssemblyConfig): InteriorWallAssembly {
  switch (config.type) {
    case 'monolithic':
      return new MonolithicInteriorWallAssembly(config)
    case 'planked-stud':
      return new PlankedStudInteriorWallAssembly(config)
    case 'monolithic-stud':
      return new MonolithicStudInteriorWallAssembly(config)
  }
}
