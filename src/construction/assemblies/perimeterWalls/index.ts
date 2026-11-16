import { InfillWallAssembly } from './infill'
import { ModulesWallAssembly } from './modules/all-modules'
import { PrefabModulesWallAssembly } from './modules/prefab-modules'
import { StrawhengeWallAssembly } from './modules/strawhenge'
import { NonStrawbaleWallAssembly } from './nonStrawbale'
import type { PerimeterWallAssembly, PerimeterWallConfig } from './types'

export function resolveWallAssembly(config: PerimeterWallConfig): PerimeterWallAssembly {
  switch (config.type) {
    case 'infill':
      return new InfillWallAssembly(config)
    case 'strawhenge':
      return new StrawhengeWallAssembly(config)
    case 'modules':
      return new ModulesWallAssembly(config)
    case 'non-strawbale':
      return new NonStrawbaleWallAssembly(config)
    case 'prefab-modules':
      return new PrefabModulesWallAssembly(config)
    default:
      throw new Error(`Unknown wall assembly type: ${(config as PerimeterWallConfig).type}`)
  }
}
