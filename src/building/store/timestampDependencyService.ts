import type {
  FloorAreaId,
  FloorOpeningId,
  OpeningId,
  PerimeterId,
  PerimeterWallId,
  RoofId,
  StoreyId
} from '@/building/model/ids'
import { isOpeningId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config/store'

export class BuildingTimestampDependencyService {
  getEffectiveStoreyTimestamp(storeyId: StoreyId): number | null {
    const timestamps: (number | null)[] = []

    const modelActions = getModelActions()
    const configActions = getConfigActions()

    timestamps.push(modelActions.getTimestamp(storeyId))

    const storey = modelActions.getStoreyById(storeyId)
    if (storey) {
      const perimeters = modelActions.getPerimetersByStorey(storeyId)
      for (const perimeter of perimeters) {
        timestamps.push(this.getEffectivePerimeterTimestamp(perimeter.id))
      }

      const roofs = modelActions.getRoofsByStorey(storeyId)
      for (const roof of roofs) {
        timestamps.push(this.getEffectiveRoofTimestamp(roof.id))
      }

      const floorAreas = modelActions.getFloorAreasByStorey(storeyId)
      for (const floorArea of floorAreas) {
        timestamps.push(modelActions.getTimestamp(floorArea.id))
      }

      const floorOpenings = modelActions.getFloorOpeningsByStorey(storeyId)
      for (const floorOpening of floorOpenings) {
        timestamps.push(modelActions.getTimestamp(floorOpening.id))
      }

      timestamps.push(configActions.getTimestamp(storey.floorAssemblyId))
    }

    return this.getMaxTimestamp(timestamps)
  }

  getEffectivePerimeterTimestamp(perimeterId: PerimeterId): number | null {
    const timestamps: (number | null)[] = []

    const modelActions = getModelActions()

    timestamps.push(modelActions.getTimestamp(perimeterId))

    try {
      const perimeter = modelActions.getPerimeterById(perimeterId)
      for (const wallId of perimeter.wallIds) {
        timestamps.push(this.getEffectivePerimeterWallTimestamp(wallId))
      }

      for (const cornerId of perimeter.cornerIds) {
        timestamps.push(modelActions.getTimestamp(cornerId))
      }
    } catch {}

    return this.getMaxTimestamp(timestamps)
  }

  getEffectivePerimeterWallTimestamp(wallId: PerimeterWallId): number | null {
    const timestamps: (number | null)[] = []

    const modelActions = getModelActions()
    const configActions = getConfigActions()

    timestamps.push(modelActions.getTimestamp(wallId))

    try {
      const wall = modelActions.getPerimeterWallById(wallId)
      for (const entityId of wall.entityIds) {
        if (isOpeningId(entityId)) {
          timestamps.push(this.getEffectiveOpeningTimestamp(entityId))
        } else {
          timestamps.push(modelActions.getTimestamp(entityId))
        }
      }

      timestamps.push(configActions.getTimestamp(wall.wallAssemblyId))
      if (wall.baseRingBeamAssemblyId) {
        timestamps.push(configActions.getTimestamp(wall.baseRingBeamAssemblyId))
      }
      if (wall.topRingBeamAssemblyId) {
        timestamps.push(configActions.getTimestamp(wall.topRingBeamAssemblyId))
      }
    } catch {}

    return this.getMaxTimestamp(timestamps)
  }

  getEffectiveOpeningTimestamp(openingId: OpeningId): number | null {
    const timestamps: (number | null)[] = []

    const modelActions = getModelActions()
    const configActions = getConfigActions()

    timestamps.push(modelActions.getTimestamp(openingId))

    try {
      const opening = modelActions.getWallOpeningById(openingId)
      if (opening.openingAssemblyId) {
        timestamps.push(configActions.getTimestamp(opening.openingAssemblyId))
      }
    } catch {}

    return this.getMaxTimestamp(timestamps)
  }

  getEffectiveRoofTimestamp(roofId: RoofId): number | null {
    const timestamps: (number | null)[] = []

    const modelActions = getModelActions()
    const configActions = getConfigActions()

    timestamps.push(modelActions.getTimestamp(roofId))

    const roof = modelActions.getRoofById(roofId)
    if (roof) {
      for (const overhangId of roof.overhangIds) {
        timestamps.push(modelActions.getTimestamp(overhangId))
      }

      timestamps.push(configActions.getTimestamp(roof.assemblyId))
    }

    return this.getMaxTimestamp(timestamps)
  }

  getEffectiveFloorAreaTimestamp(floorAreaId: FloorAreaId): number | null {
    const modelActions = getModelActions()
    return modelActions.getTimestamp(floorAreaId)
  }

  getEffectiveFloorOpeningTimestamp(floorOpeningId: FloorOpeningId): number | null {
    const modelActions = getModelActions()
    return modelActions.getTimestamp(floorOpeningId)
  }

  private getMaxTimestamp(timestamps: (number | null)[]): number | null {
    const validTimestamps = timestamps.filter((ts): ts is number => ts !== null)
    return validTimestamps.length > 0 ? Math.max(...validTimestamps) : null
  }
}

let serviceInstance: BuildingTimestampDependencyService | null = null

export const getBuildingTimestampDependencyService = (): BuildingTimestampDependencyService => {
  serviceInstance ??= new BuildingTimestampDependencyService()
  return serviceInstance
}
