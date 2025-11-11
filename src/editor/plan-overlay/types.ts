import type { StoreyId } from '@/building/model/ids'

export interface ImagePoint {
  readonly x: number
  readonly y: number
}

export interface WorldPoint {
  readonly x: number
  readonly y: number
}

export interface FloorPlanImageMetadata {
  readonly url: string
  readonly name: string
  readonly width: number
  readonly height: number
}

export interface FloorPlanCalibration {
  readonly referencePoints: readonly [ImagePoint, ImagePoint]
  readonly pixelDistance: number
  readonly realDistanceMm: number
  readonly mmPerPixel: number
}

export interface FloorPlanOrigin {
  readonly image: ImagePoint
  readonly world: WorldPoint
}

export type FloorPlanPlacement = 'under' | 'over'

export interface FloorPlanOverlay {
  readonly floorId: StoreyId
  readonly image: FloorPlanImageMetadata
  readonly calibration: FloorPlanCalibration
  readonly origin: FloorPlanOrigin
  readonly placement: FloorPlanPlacement
  readonly opacity: number
}

export interface PlanImageSize {
  readonly width: number
  readonly height: number
}

export interface PlanImportPayload {
  readonly floorId: StoreyId
  readonly file: File
  readonly imageSize: PlanImageSize
  readonly referencePoints: readonly [ImagePoint, ImagePoint]
  readonly realDistanceMm: number
  readonly origin?: FloorPlanOrigin
}

export interface PlanRecalibrationPayload {
  readonly floorId: StoreyId
  readonly referencePoints: readonly [ImagePoint, ImagePoint]
  readonly realDistanceMm: number
  readonly originImagePoint: ImagePoint
}
