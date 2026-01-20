import type { Material, MaterialId } from '@/construction/materials/material'

import * as DimensionalMaterials from './dimensional'
import * as SheetMaterials from './sheet'
import * as StrawbaleMaterials from './strawbale'
import * as VolumeMaterials from './volume'

export * from './dimensional'
export * from './sheet'
export * from './strawbale'
export * from './volume'

export const DEFAULT_MATERIALS: Record<MaterialId, Material> = {
  ...Object.fromEntries(Object.values(DimensionalMaterials).map(m => [m.id, m])),
  ...Object.fromEntries(Object.values(SheetMaterials).map(m => [m.id, m])),
  ...Object.fromEntries(Object.values(StrawbaleMaterials).map(m => [m.id, m])),
  ...Object.fromEntries(Object.values(VolumeMaterials).map(m => [m.id, m]))
}
