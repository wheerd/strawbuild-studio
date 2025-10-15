import type { FloorAssemblyType } from '@/construction/config/types'

import { JoistFloorAssembly } from './joists'
import { MonolithicFloorAssembly } from './monolithic'
import type { FloorAssembly } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FLOOR_ASSEMBLIES: Record<FloorAssemblyType, FloorAssembly<any>> = {
  monolithic: new MonolithicFloorAssembly(),
  joist: new JoistFloorAssembly()
}

export * from './types'
export * from './monolithic'
export * from './joists'
