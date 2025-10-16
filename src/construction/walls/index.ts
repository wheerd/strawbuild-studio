import { constructModuleWall } from '@/construction/walls/strawhenge/all-modules'

import type { ConstructionType, WallAssemblyBuilder } from './construction'
import { constructInfillWall } from './infill/infill'
import { constructNonStrawbaleWall } from './nonStrawbale'
import { constructStrawhengeWall } from './strawhenge/strawhenge'

export * from './construction'
export * from './segmentation'
export * from './corners/corners'
export * from './infill/infill'
export * from './strawhenge/strawhenge'
export * from './nonStrawbale'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WALL_ASSEMBLY_BUILDERS: Record<ConstructionType, WallAssemblyBuilder<any>> = {
  infill: constructInfillWall,
  strawhenge: constructStrawhengeWall,
  modules: constructModuleWall,
  'non-strawbale': constructNonStrawbaleWall
}
