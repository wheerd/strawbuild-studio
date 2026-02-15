import type { PerimeterId, PerimeterWallId, RoofId, StoreyId } from '@/building/model'
import type { ConstructionModel } from '@/construction/model'
import type { InitialPartInfo } from '@/construction/parts/types'
import type { Tag } from '@/construction/tags'
import type { Transform } from '@/shared/geometry'

export const BUILDING_ID = 'building' as const

export type ColinearWallId = `colinear_${string}`
export type FloorId = `floor_${PerimeterId}`
export type TopPlateId = `rb_top_${PerimeterId}`
export type BasePlateId = `rb_base_${PerimeterId}`
export type FullPerimeterId = `pfull_${PerimeterId}`
export type PerimeterMeasurementsId = `meas_${PerimeterId}`

export type CoreModelId = RoofId | PerimeterWallId | FloorId | TopPlateId | BasePlateId | PerimeterMeasurementsId

export type CompositeModelId = typeof BUILDING_ID | StoreyId | PerimeterId | FullPerimeterId | ColinearWallId

export type ModelId = CoreModelId | CompositeModelId

export type ViewModelId = typeof BUILDING_ID | FullPerimeterId | ColinearWallId | RoofId

export interface ModelWithTransform {
  id: ModelId
  transform: Transform
}

export interface CompositeModel {
  models: ModelWithTransform[]
  tags?: Tag[]
  partInfo?: InitialPartInfo
  sourceId?: string
}

export interface CoreModel {
  model: ConstructionModel
  tags?: Tag[]
  partInfo?: InitialPartInfo
  sourceId?: string
}

export type ModelEntry = CompositeModel | CoreModel

export function isCoreModel(entry: ModelEntry): entry is CoreModel {
  return 'model' in entry
}

export function isCompositeModel(entry: ModelEntry): entry is CompositeModel {
  return 'models' in entry
}

export interface ConstructionStoreState {
  conlinearMapping: Partial<Record<PerimeterWallId, ColinearWallId>>
  models: Partial<Record<ModelId, ModelEntry>>
  cache: Partial<Record<ModelId, ConstructionModel>>
  generatedAt: number
  lastSourceChange: number
  hasModel: boolean
  rebuilding: boolean
}

export interface ConstructionStoreActions {
  getModel: (modelId: ModelId) => ConstructionModel
  isOutdated: () => boolean
  rebuildModel: () => void
  clearCache: () => void
}

export type ConstructionStore = ConstructionStoreState & { actions: ConstructionStoreActions }
