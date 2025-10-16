import { InfillWallAssembly } from './infill/InfillWallAssembly'
import { NonStrawbaleWallAssembly } from './nonStrawbale'
import { ModulesWallAssembly } from './strawhenge/ModulesWallAssembly'
import { StrawhengeWallAssembly } from './strawhenge/StrawhengeWallAssembly'
import type { WallAssembly, WallAssemblyType } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WALL_ASSEMBLIES: Record<WallAssemblyType, WallAssembly<any>> = {
  infill: new InfillWallAssembly(),
  strawhenge: new StrawhengeWallAssembly(),
  modules: new ModulesWallAssembly(),
  'non-strawbale': new NonStrawbaleWallAssembly()
}

export * from './types'
export * from './construction'
export * from './segmentation'
export * from './corners/corners'
export * from './infill/infill'
export * from './strawhenge/strawhenge'
export * from './nonStrawbale'
export * from './infill/InfillWallAssembly'
export * from './strawhenge/StrawhengeWallAssembly'
export * from './strawhenge/ModulesWallAssembly'
