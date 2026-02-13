import type { PerimeterId, PerimeterWallId } from '@/building/model'

import type {
  BasePlateId,
  ColinearWallId,
  FloorId,
  FullPerimeterId,
  PerimeterMeasurementsId,
  TopPlateId
} from './types'

export const isColinearWallId = (id: string): id is ColinearWallId => id.startsWith('colinear_')
export const isFloorId = (id: string): id is FloorId => id.startsWith('floor_perimeter_')
export const isTopPlateId = (id: string): id is TopPlateId => id.startsWith('rb_top_perimeter_')
export const isBasePlateId = (id: string): id is BasePlateId => id.startsWith('rb_base_perimeter_')
export const isFullPerimeterId = (id: string): id is FullPerimeterId => id.startsWith('pfull_perimeter_')
export const isPerimeterMeasurementsId = (id: string): id is PerimeterMeasurementsId => id.startsWith('meas_perimeter_')

export const createFloorId = (perimeterId: PerimeterId): FloorId => `floor_${perimeterId}`
export const createTopPlateId = (perimeterId: PerimeterId): TopPlateId => `rb_top_${perimeterId}`
export const createBasePlateId = (perimeterId: PerimeterId): BasePlateId => `rb_base_${perimeterId}`
export const createFullPerimeterId = (perimeterId: PerimeterId): FullPerimeterId => `pfull_${perimeterId}`
export const createColinearWallId = (wallId: PerimeterWallId): ColinearWallId => `colinear_${wallId}`
export const createPerimeterMeasurementsId = (perimeterId: PerimeterId): PerimeterMeasurementsId =>
  `meas_${perimeterId}`

const perimeterIdPattern = /perimeter_[a-zA-Z0-9]+$/

export function extractPerimeterId(
  id: FloorId | TopPlateId | BasePlateId | FullPerimeterId | PerimeterMeasurementsId
): PerimeterId {
  const match = perimeterIdPattern.exec(id)
  if (!match) {
    throw new Error(`Cannot extract perimeter ID from ${id}`)
  }
  return match[0] as PerimeterId
}
