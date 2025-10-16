import { DoubleRingBeamAssembly } from './double'
import { FullRingBeamAssembly } from './full'
import type { RingBeamAssembly, RingBeamAssemblyType } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RING_BEAM_ASSEMBLIES: Record<RingBeamAssemblyType, RingBeamAssembly<any>> = {
  full: new FullRingBeamAssembly(),
  double: new DoubleRingBeamAssembly()
}

export * from './types'
export * from './full'
export * from './double'
