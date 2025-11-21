import type { RoofAssemblyConfig } from '@/construction/config'
import { PurlinRoofAssembly } from '@/construction/roofs/purlin'

import { MonolithicRoofAssembly } from './monolithic'
import type { RoofAssembly, RoofAssemblyType } from './types'

export const ROOF_ASSEMBLIES: {
  [TType in RoofAssemblyType]: RoofAssembly<Extract<RoofAssemblyConfig, { type: TType }>>
} = {
  monolithic: new MonolithicRoofAssembly(),
  purlin: new PurlinRoofAssembly()
}

export * from './types'
export * from './monolithic'
