import { MonolithicRoofAssembly } from './monolithic'
import type { RoofAssembly, RoofAssemblyType } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ROOF_ASSEMBLIES: Record<RoofAssemblyType, RoofAssembly<any>> = {
  monolithic: new MonolithicRoofAssembly()
}

export * from './types'
export * from './monolithic'
