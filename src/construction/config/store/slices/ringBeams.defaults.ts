import { type RingBeamAssemblyId } from '@/building/model/ids'
import type { BrickRingBeamAssemblyConfig, FullRingBeamAssemblyConfig } from '@/construction/config/types'
import { bitumen, brick, cork, roughWood } from '@/construction/materials/material'

const fullRingBeamAssembly: FullRingBeamAssemblyConfig = {
  id: 'ringbeam_default' as RingBeamAssemblyId,
  name: 'Full 36x6cm',
  type: 'full',
  material: roughWood.id,
  height: 60,
  width: 360,
  offsetFromEdge: 0
}

const brickRingBeamAssembly: BrickRingBeamAssemblyConfig = {
  id: 'ringbeam_brick_default' as RingBeamAssemblyId,
  name: 'Brick Ring Beam',
  type: 'brick',
  wallHeight: 300,
  wallWidth: 250,
  wallMaterial: brick.id,
  beamThickness: 60,
  beamWidth: 360,
  beamMaterial: roughWood.id,
  waterproofingThickness: 2,
  waterproofingMaterial: bitumen.id,
  insulationThickness: 100,
  insulationMaterial: cork.id
}

export const DEFAULT_RING_BEAM_ASSEMBLIES = [fullRingBeamAssembly, brickRingBeamAssembly]

export const DEFAULT_RING_BEAM_BASE_ASSEMBLY_ID = fullRingBeamAssembly.id
export const DEFAULT_RING_BEAM_TOP_ASSEMBLY_ID = fullRingBeamAssembly.id
