import { InfillWallAssembly } from './infill'
import { ModulesWallAssembly } from './modules/all-modules'
import { StrawhengeWallAssembly } from './modules/strawhenge'
import { NonStrawbaleWallAssembly } from './nonStrawbale'
import type { WallAssembly, WallConfig } from './types'

export function resolveWallAssembly(config: WallConfig): WallAssembly {
  switch (config.type) {
    case 'infill':
      return new InfillWallAssembly(config)
    case 'strawhenge':
      return new StrawhengeWallAssembly(config)
    case 'modules':
      return new ModulesWallAssembly(config)
    case 'non-strawbale':
      return new NonStrawbaleWallAssembly(config)
    default:
      throw new Error(`Unknown wall assembly type: ${(config as WallConfig).type}`)
  }
}

export * from './types'
export * from './construction'
export * from './segmentation'
export * from './corners/corners'
export * from './infill/infill'
export * from './modules/strawhenge'
export * from './modules/all-modules'
export * from './nonStrawbale'
export * from './layers'
export { InfillWallAssembly, ModulesWallAssembly, StrawhengeWallAssembly, NonStrawbaleWallAssembly }
